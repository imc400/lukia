import { Platform } from '@prisma/client'
import { ScrapingResult, SearchParams } from '@/types'
import { scrapeAliExpress } from './enhanced-aliexpress'
import { scrapeShein } from './google-shopping-searchapi'
import { demoScrape, isDemoMode } from './demo'
import { CacheService } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export class ScrapingService {
  private cache: CacheService
  
  constructor() {
    this.cache = CacheService.getInstance()
  }

  async search(params: SearchParams): Promise<ScrapingResult[]> {
    const { query, platform } = params
    const results: ScrapingResult[] = []
    
    // Determinar qué plataformas buscar
    const platformsToSearch = platform === 'all' 
      ? [Platform.ALIEXPRESS, Platform.SHEIN] // AliExpress y SHEIN disponibles
      : [platform as Platform]
    
    // Log de búsqueda
    await this.logSearch(query, platformsToSearch)
    
    // Buscar en cada plataforma
    for (const plt of platformsToSearch) {
      try {
        // Verificar caché primero
        const cacheKey = `search:${query}:${plt}`
        const cachedResult = await this.cache.get<ScrapingResult>(cacheKey)
        
        if (cachedResult) {
          console.log(`Cache hit for ${plt}: ${query}`)
          results.push(cachedResult)
          continue
        }
        
        // Scraping real o demo
        let result: ScrapingResult
        
        if (isDemoMode()) {
          console.log(`[Demo Mode] Simulating scraping for ${plt}: ${query}`)
          result = await demoScrape(query, 20)
        } else {
          switch (plt) {
            case Platform.ALIEXPRESS:
              result = await scrapeAliExpress(query, 20)
              break
            case Platform.SHEIN:
              result = await scrapeShein(query, 20)
              break
            default:
              result = {
                success: false,
                products: [],
                errors: [`Platform ${plt} not implemented yet`],
                platform: plt,
                totalFound: 0,
                processingTime: 0
              }
          }
        }
        
        // Cachear resultado exitoso
        if (result.success && result.products.length > 0) {
          await this.cache.set(cacheKey, result, 1800) // 30 minutos
        }
        
        results.push(result)
        
        // Log del resultado
        await this.logScrapingResult(result)
        
      } catch (error) {
        console.error(`Error scraping ${plt}:`, error)
        
        const errorResult: ScrapingResult = {
          success: false,
          products: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          platform: plt,
          totalFound: 0,
          processingTime: 0
        }
        
        results.push(errorResult)
        await this.logScrapingResult(errorResult)
      }
    }
    
    return results
  }

  private async logSearch(query: string, platforms: Platform[]): Promise<void> {
    try {
      if (prisma) {
        await prisma.search.create({
          data: {
            query,
            platform: platforms.length === 1 ? platforms[0] : null,
            results: 0 // Se actualizará después
          }
        })
      }
    } catch (error) {
      console.log('[Search] Logging unavailable:', error)
    }
  }

  private async logScrapingResult(result: ScrapingResult): Promise<void> {
    try {
      if (prisma) {
        await prisma.scrapingLog.create({
          data: {
            platform: result.platform,
            status: result.success ? 'success' : 'failed',
            error: result.errors.join(', ') || null,
            duration: result.processingTime
          }
        })
      }
    } catch (error) {
      console.log('[Scraping] Logging unavailable:', error)
    }
  }

  async getScrapingStats(): Promise<{
    totalSearches: number
    successRate: number
    averageProcessingTime: number
    platformStats: Record<Platform, { searches: number, successRate: number }>
  }> {
    try {
      if (!prisma) {
        return {
          totalSearches: 0,
          successRate: 0,
          averageProcessingTime: 0,
          platformStats: {} as Record<Platform, { searches: number, successRate: number }>
        }
      }

      const logs = await prisma.scrapingLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          }
        }
      })
      
      const totalSearches = logs.length
      const successCount = logs.filter(log => log.status === 'success').length
      const successRate = totalSearches > 0 ? (successCount / totalSearches) * 100 : 0
      
      const avgProcessingTime = logs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalSearches
      
      const platformStats = logs.reduce((stats, log) => {
        if (!stats[log.platform]) {
          stats[log.platform] = { searches: 0, successRate: 0 }
        }
        stats[log.platform].searches++
        return stats
      }, {} as Record<Platform, { searches: number, successRate: number }>)
      
      // Calcular success rate por plataforma
      Object.keys(platformStats).forEach(platform => {
        const plt = platform as Platform
        const platformLogs = logs.filter(log => log.platform === plt)
        const successCount = platformLogs.filter(log => log.status === 'success').length
        platformStats[plt].successRate = (successCount / platformLogs.length) * 100
      })
      
      return {
        totalSearches,
        successRate,
        averageProcessingTime: avgProcessingTime,
        platformStats
      }
    } catch (error) {
      console.error('Error getting scraping stats:', error)
      return {
        totalSearches: 0,
        successRate: 0,
        averageProcessingTime: 0,
        platformStats: {} as Record<Platform, { searches: number, successRate: number }>
      }
    }
  }
}

// Singleton
let scrapingService: ScrapingService | null = null

export function getScrapingService(): ScrapingService {
  if (!scrapingService) {
    scrapingService = new ScrapingService()
  }
  return scrapingService
}