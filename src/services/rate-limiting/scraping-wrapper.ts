import { Platform } from '@prisma/client'
import { ScrapingResult } from '@/types'
import { getRateLimiter } from './intelligent-limiter'
import { getScrapingMonitor } from '../monitoring/scraping-monitor'

export interface ScrapingOptions {
  platform: Platform
  priority?: 'low' | 'normal' | 'high'
  timeout?: number
  retryOnRateLimit?: boolean
  maxRetries?: number
}

export interface QueuedRequest {
  id: string
  platform: Platform
  query: string
  options: ScrapingOptions
  resolve: (result: ScrapingResult) => void
  reject: (error: Error) => void
  timestamp: number
  priority: number
}

export class RateLimitedScraper {
  private rateLimiter = getRateLimiter()
  private monitor = getScrapingMonitor()
  private requestQueue: QueuedRequest[] = []
  private isProcessing = false
  private activeRequests = new Map<Platform, number>()

  constructor() {
    this.startQueueProcessor()
  }

  /**
   * Scraper wrapper con rate limiting
   */
  async scrapeWithRateLimit<T>(
    platform: Platform,
    query: string,
    scraperFunction: () => Promise<T>,
    options: Partial<ScrapingOptions> = {}
  ): Promise<T> {
    const finalOptions: ScrapingOptions = {
      platform,
      priority: 'normal',
      timeout: 30000,
      retryOnRateLimit: true,
      maxRetries: 3,
      ...options
    }

    // Verificar rate limit
    const rateLimitResult = await this.rateLimiter.checkRateLimit(platform)
    
    if (!rateLimitResult.allowed) {
      if (finalOptions.retryOnRateLimit && rateLimitResult.retryAfter) {
        console.log(`[Scraper] Rate limited for ${platform}, waiting ${rateLimitResult.retryAfter}ms`)
        await new Promise(resolve => setTimeout(resolve, rateLimitResult.retryAfter))
        return this.scrapeWithRateLimit(platform, query, scraperFunction, finalOptions)
      } else {
        throw new Error(`Rate limit exceeded for ${platform}: ${rateLimitResult.reason}`)
      }
    }

    // Ejecutar scraping
    const startTime = Date.now()
    let result: T
    
    try {
      // Incrementar contador de requests activos
      const currentActive = this.activeRequests.get(platform) || 0
      this.activeRequests.set(platform, currentActive + 1)

      // Ejecutar con timeout
      result = await this.executeWithTimeout(scraperFunction, finalOptions.timeout!)
      
      // Reportar éxito
      const responseTime = Date.now() - startTime
      await this.rateLimiter.reportSuccess(platform, responseTime)
      
      console.log(`[Scraper] Success for ${platform}: ${responseTime}ms`)
      return result

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      // Determinar tipo de error
      const errorType = this.categorizeError(error)
      await this.rateLimiter.reportFailure(platform, errorType)
      
      console.log(`[Scraper] Failure for ${platform}: ${errorType} - ${error.message}`)
      
      // Reintentar si está configurado
      if (finalOptions.retryOnRateLimit && finalOptions.maxRetries! > 0 && this.isRetryableError(error)) {
        const newOptions = { ...finalOptions, maxRetries: finalOptions.maxRetries! - 1 }
        await new Promise(resolve => setTimeout(resolve, 2000)) // Esperar 2 segundos
        return this.scrapeWithRateLimit(platform, query, scraperFunction, newOptions)
      }
      
      throw error
    } finally {
      // Decrementar contador de requests activos
      const currentActive = this.activeRequests.get(platform) || 1
      this.activeRequests.set(platform, Math.max(0, currentActive - 1))
    }
  }

  /**
   * Agregar request a la cola
   */
  async queueRequest(
    platform: Platform,
    query: string,
    scraperFunction: () => Promise<ScrapingResult>,
    options: Partial<ScrapingOptions> = {}
  ): Promise<ScrapingResult> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform,
        query,
        options: { platform, ...options },
        resolve,
        reject,
        timestamp: Date.now(),
        priority: this.getPriorityScore(options.priority || 'normal')
      }

      this.requestQueue.push(request)
      this.requestQueue.sort((a, b) => b.priority - a.priority) // Ordenar por prioridad

      console.log(`[Queue] Added request ${request.id} for ${platform} (queue size: ${this.requestQueue.length})`)
    })
  }

  /**
   * Procesar cola de requests
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.requestQueue.length === 0) return

      this.isProcessing = true
      
      try {
        const request = this.requestQueue.shift()
        if (!request) return

        console.log(`[Queue] Processing request ${request.id} for ${request.platform}`)

        // Verificar timeout de la request
        const requestAge = Date.now() - request.timestamp
        if (requestAge > (request.options.timeout || 30000)) {
          request.reject(new Error('Request timeout in queue'))
          return
        }

        // Ejecutar scraping con rate limiting
        const result = await this.scrapeWithRateLimit(
          request.platform,
          request.query,
          () => this.executeScrapingRequest(request),
          request.options
        )

        request.resolve(result)
        
      } catch (error) {
        const request = this.requestQueue.find(r => r.id === 'current')
        if (request) {
          request.reject(error instanceof Error ? error : new Error(String(error)))
        }
      } finally {
        this.isProcessing = false
      }
    }, 1000) // Procesar cada segundo
  }

  /**
   * Ejecutar request de scraping
   */
  private async executeScrapingRequest(request: QueuedRequest): Promise<ScrapingResult> {
    // Aquí se ejecutaría la función de scraping real
    // Por ahora es un placeholder
    return {
      success: true,
      products: [],
      errors: [],
      platform: request.platform,
      totalFound: 0,
      processingTime: 0
    }
  }

  /**
   * Ejecutar función con timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, timeoutMs)

      fn()
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  /**
   * Categorizar error para rate limiting
   */
  private categorizeError(error: any): 'blocked' | 'rate_limited' | 'timeout' | 'other' {
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('blocked') || message.includes('access denied') || message.includes('captcha')) {
      return 'blocked'
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limited'
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout'
    }
    return 'other'
  }

  /**
   * Verificar si el error es reintentable
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || ''
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'temporary',
      'blocked',
      'captcha'
    ]
    
    return retryablePatterns.some(pattern => message.includes(pattern))
  }

  /**
   * Obtener puntuación de prioridad
   */
  private getPriorityScore(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 100
      case 'normal': return 50
      case 'low': return 10
      default: return 50
    }
  }

  /**
   * Obtener estadísticas de la cola
   */
  getQueueStats(): {
    queueSize: number
    activeRequests: Map<Platform, number>
    rateLimitStats: Map<Platform, any>
    oldestRequest?: {
      age: number
      platform: Platform
    }
  } {
    const oldestRequest = this.requestQueue.length > 0 ? {
      age: Date.now() - this.requestQueue[0].timestamp,
      platform: this.requestQueue[0].platform
    } : undefined

    return {
      queueSize: this.requestQueue.length,
      activeRequests: new Map(this.activeRequests),
      rateLimitStats: this.rateLimiter.getStats(),
      oldestRequest
    }
  }

  /**
   * Limpiar cola de requests antiguas
   */
  cleanupQueue(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutos
    
    const initialSize = this.requestQueue.length
    this.requestQueue = this.requestQueue.filter(request => {
      const age = now - request.timestamp
      if (age > maxAge) {
        request.reject(new Error('Request expired in queue'))
        return false
      }
      return true
    })
    
    const removed = initialSize - this.requestQueue.length
    if (removed > 0) {
      console.log(`[Queue] Cleaned up ${removed} expired requests`)
    }
  }

  /**
   * Obtener tiempo estimado de espera
   */
  async getEstimatedWaitTime(platform: Platform): Promise<number> {
    const rateLimitWait = await this.rateLimiter.getEstimatedWaitTime(platform)
    const queueWait = this.requestQueue
      .filter(req => req.platform === platform)
      .length * 2000 // Estimación de 2 segundos por request
    
    return rateLimitWait + queueWait
  }

  /**
   * Obtener estado actual del scraper
   */
  getStatus(): {
    isProcessing: boolean
    queueSize: number
    activeRequests: number
    rateLimitHealth: string
  } {
    const totalActiveRequests = Array.from(this.activeRequests.values())
      .reduce((sum, count) => sum + count, 0)
    
    return {
      isProcessing: this.isProcessing,
      queueSize: this.requestQueue.length,
      activeRequests: totalActiveRequests,
      rateLimitHealth: 'healthy' // TODO: implementar health check
    }
  }
}

// Singleton
let rateLimitedScraper: RateLimitedScraper | null = null

export function getRateLimitedScraper(): RateLimitedScraper {
  if (!rateLimitedScraper) {
    rateLimitedScraper = new RateLimitedScraper()
  }
  return rateLimitedScraper
}