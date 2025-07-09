import { Platform } from '@prisma/client'
import { ScrapingResult } from '@/types'
import { getRetryHandler } from './retry-handler'
import { getScrapingMonitor } from '../monitoring/scraping-monitor'

export interface SheinProduct {
  id: string
  title: string
  price: number
  currency: string
  imageUrl: string
  productUrl: string
  vendorName: string
  vendorRating: number
  totalSales: number
  category: string
  description?: string
  colors?: string[]
  sizes?: string[]
  discountPercentage?: number
  originalPrice?: number
  reviews?: {
    count: number
    averageRating: number
    recentReviews: string[]
  }
}

export interface SheinApiResponse {
  success: boolean
  data?: {
    products: SheinProduct[]
    total: number
    page: number
    hasMore: boolean
  }
  error?: string
  rateLimited?: boolean
  quotaExceeded?: boolean
}

export class SheinApiClient {
  private baseUrl: string
  private apiKey: string
  private retryHandler = getRetryHandler()
  private monitor = getScrapingMonitor()
  private requestCount = 0
  private lastRequestTime = Date.now()

  constructor() {
    this.baseUrl = 'https://api.scrapeless.com/v1'
    this.apiKey = process.env.SCRAPELESS_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('[SHEIN API] No API key found. Add SCRAPELESS_API_KEY to your environment variables.')
    }
  }

  /**
   * Buscar productos en SHEIN
   */
  async searchProducts(query: string, maxResults: number = 20): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    if (!this.apiKey) {
      return this.createErrorResult('API key not configured', startTime)
    }

    const result = await this.retryHandler.executeWithRetry(
      async () => {
        return this.performSearch(query, maxResults)
      },
      this.retryHandler.getSheinConfig()
    )

    const processingTime = Date.now() - startTime
    
    // Registrar evento en el monitor
    await this.monitor.recordScrapingEvent(
      Platform.SHEIN,
      result.success,
      processingTime,
      result.data?.products?.length || 0,
      result.error?.message
    )

    if (result.success && result.data) {
      return {
        success: true,
        products: result.data.products.map(this.transformProduct),
        errors: [],
        platform: Platform.SHEIN,
        totalFound: result.data.total,
        processingTime
      }
    } else {
      return this.createErrorResult(result.error?.message || 'Unknown error', startTime)
    }
  }

  /**
   * Realizar búsqueda real via API
   */
  private async performSearch(query: string, maxResults: number): Promise<{
    products: SheinProduct[]
    total: number
  }> {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'Lukia/1.0'
      },
      body: JSON.stringify({
        url: `https://us.shein.com/search/${encodeURIComponent(query)}`,
        options: {
          extractProducts: true,
          maxResults: maxResults,
          includeReviews: true,
          includePricing: true,
          includeImages: true,
          timeout: 30000
        }
      })
    }

    console.log(`[SHEIN API] Searching for: ${query}`)
    
    const response = await fetch(`${this.baseUrl}/scrape`, requestOptions)
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      } else if (response.status === 403) {
        throw new Error('API quota exceeded')
      } else {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'API returned error')
    }

    // Procesar y limpiar datos
    const products = this.processApiResponse(data.result)
    
    console.log(`[SHEIN API] Found ${products.length} products`)
    
    return {
      products,
      total: products.length
    }
  }

  /**
   * Procesar respuesta de la API
   */
  private processApiResponse(apiResult: any): SheinProduct[] {
    if (!apiResult || !apiResult.products) {
      return []
    }

    return apiResult.products.map((product: any) => {
      try {
        // Extraer precio
        const price = this.extractPrice(product.price || product.currentPrice || product.salePrice)
        const originalPrice = this.extractPrice(product.originalPrice || product.retailPrice)
        
        // Calcular descuento
        const discountPercentage = originalPrice && price < originalPrice
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0

        // Extraer rating y reviews
        const reviews = this.extractReviews(product.reviews || product.rating)
        
        return {
          id: product.id || product.productId || `shein_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: this.cleanText(product.title || product.name || product.productName),
          price,
          currency: product.currency || 'USD',
          imageUrl: this.cleanImageUrl(product.image || product.imageUrl || product.thumbnail),
          productUrl: this.cleanUrl(product.url || product.link || product.productUrl),
          vendorName: 'SHEIN',
          vendorRating: 4.2, // SHEIN typical rating
          totalSales: this.extractSales(product.sales || product.soldCount),
          category: this.cleanText(product.category || product.categoryName || 'Fashion'),
          description: this.cleanText(product.description),
          colors: this.extractColors(product.colors || product.colorOptions),
          sizes: this.extractSizes(product.sizes || product.sizeOptions),
          discountPercentage,
          originalPrice,
          reviews
        }
      } catch (error) {
        console.error('[SHEIN API] Error processing product:', error)
        return null
      }
    }).filter(Boolean)
  }

  /**
   * Extraer precio de diferentes formatos
   */
  private extractPrice(priceData: any): number {
    if (typeof priceData === 'number') {
      return priceData
    }
    
    if (typeof priceData === 'string') {
      const match = priceData.match(/[\d.]+/)
      return match ? parseFloat(match[0]) : 0
    }
    
    if (priceData && typeof priceData === 'object') {
      return priceData.amount || priceData.value || 0
    }
    
    return 0
  }

  /**
   * Extraer información de reviews
   */
  private extractReviews(reviewData: any): SheinProduct['reviews'] {
    if (!reviewData) {
      return {
        count: 0,
        averageRating: 0,
        recentReviews: []
      }
    }

    if (typeof reviewData === 'number') {
      return {
        count: 0,
        averageRating: reviewData,
        recentReviews: []
      }
    }

    return {
      count: reviewData.count || reviewData.totalReviews || 0,
      averageRating: reviewData.rating || reviewData.averageRating || 0,
      recentReviews: reviewData.recentReviews || []
    }
  }

  /**
   * Extraer número de ventas
   */
  private extractSales(salesData: any): number {
    if (typeof salesData === 'number') {
      return salesData
    }
    
    if (typeof salesData === 'string') {
      const match = salesData.match(/[\d,]+/)
      return match ? parseInt(match[0].replace(/,/g, '')) : 0
    }
    
    return 0
  }

  /**
   * Extraer colores disponibles
   */
  private extractColors(colorData: any): string[] {
    if (!colorData) return []
    
    if (Array.isArray(colorData)) {
      return colorData.map(c => typeof c === 'string' ? c : c.name || c.color).filter(Boolean)
    }
    
    return []
  }

  /**
   * Extraer tallas disponibles
   */
  private extractSizes(sizeData: any): string[] {
    if (!sizeData) return []
    
    if (Array.isArray(sizeData)) {
      return sizeData.map(s => typeof s === 'string' ? s : s.name || s.size).filter(Boolean)
    }
    
    return []
  }

  /**
   * Limpiar texto
   */
  private cleanText(text: any): string {
    if (!text) return ''
    return String(text).trim().replace(/\s+/g, ' ')
  }

  /**
   * Limpiar URL de imagen
   */
  private cleanImageUrl(url: any): string {
    if (!url) return ''
    const cleanUrl = String(url).trim()
    return cleanUrl.startsWith('//') ? `https:${cleanUrl}` : cleanUrl
  }

  /**
   * Limpiar URL de producto
   */
  private cleanUrl(url: any): string {
    if (!url) return ''
    const cleanUrl = String(url).trim()
    return cleanUrl.startsWith('http') ? cleanUrl : `https://us.shein.com${cleanUrl}`
  }

  /**
   * Transformar producto para formato estándar
   */
  private transformProduct(product: SheinProduct): any {
    return {
      title: product.title,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
      platform: Platform.SHEIN,
      vendorName: product.vendorName,
      vendorRating: product.vendorRating,
      totalSales: product.totalSales,
      category: product.category,
      description: product.description,
      metadata: {
        colors: product.colors,
        sizes: product.sizes,
        discountPercentage: product.discountPercentage,
        originalPrice: product.originalPrice,
        reviews: product.reviews
      }
    }
  }

  /**
   * Crear resultado de error
   */
  private createErrorResult(errorMessage: string, startTime: number): ScrapingResult {
    return {
      success: false,
      products: [],
      errors: [errorMessage],
      platform: Platform.SHEIN,
      totalFound: 0,
      processingTime: Date.now() - startTime
    }
  }

  /**
   * Verificar salud de la API
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    responseTime: number
    quotaRemaining?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      
      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        return {
          status: 'healthy',
          responseTime,
          quotaRemaining: data.quotaRemaining
        }
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: `API returned ${response.status}`
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Obtener información de uso de la API
   */
  async getUsageInfo(): Promise<{
    requestsToday: number
    quotaLimit: number
    quotaRemaining: number
    resetTime: Date
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return {
          requestsToday: data.requestsToday || 0,
          quotaLimit: data.quotaLimit || 1000,
          quotaRemaining: data.quotaRemaining || 1000,
          resetTime: new Date(data.resetTime || Date.now() + 24 * 60 * 60 * 1000)
        }
      } else {
        throw new Error(`Failed to get usage info: ${response.status}`)
      }
    } catch (error) {
      console.error('[SHEIN API] Error getting usage info:', error)
      return {
        requestsToday: 0,
        quotaLimit: 1000,
        quotaRemaining: 1000,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    }
  }
}

// Singleton
let sheinApiClient: SheinApiClient | null = null

export function getSheinApiClient(): SheinApiClient {
  if (!sheinApiClient) {
    sheinApiClient = new SheinApiClient()
  }
  return sheinApiClient
}

export async function scrapeShein(query: string, maxResults: number = 20): Promise<ScrapingResult> {
  const client = getSheinApiClient()
  return client.searchProducts(query, maxResults)
}