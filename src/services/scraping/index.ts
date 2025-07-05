import { Platform } from '@prisma/client'
import { ScrapingResult, SearchParams } from '@/types'
import { scrapeAliExpress } from './aliexpress'
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
      ? [Platform.ALIEXPRESS] // Por ahora solo AliExpress
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
        
        // Scraping real
        let result: ScrapingResult
        
        switch (plt) {
          case Platform.ALIEXPRESS:
            result = await scrapeAliExpress(query, 20)
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
      await prisma.search.create({
        data: {
          query,
          platform: platforms.length === 1 ? platforms[0] : null,
          results: 0 // Se actualizará después
        }
      })
    } catch (error) {
      console.error('Error logging search:', error)
    }
  }

  private async logScrapingResult(result: ScrapingResult): Promise<void> {
    try {
      await prisma.scrapingLog.create({
        data: {
          platform: result.platform,
          status: result.success ? 'success' : 'failed',
          error: result.errors.join(', ') || null,
          duration: result.processingTime
        }
      })
    } catch (error) {
      console.error('Error logging scraping result:', error)
    }
  }

  async getScrapingStats(): Promise<{
    totalSearches: number
    successRate: number
    averageProcessingTime: number
    platformStats: Record<Platform, { searches: number, successRate: number }>
  }> {
    try {
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