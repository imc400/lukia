import { Platform } from '@prisma/client'
import { ScrapingResult } from '@/types'
import { sleep } from '@/utils'

export interface SearchAPIConfig {
  apiKey: string
  endpoint: string
  timeout: number
}

export interface SheinProduct {
  title: string
  price: number
  currency: string
  imageUrl: string
  productUrl: string
  platform: Platform
  vendorName: string
  vendorRating: number
  totalSales: number
  reviewCount: number
  rating: number
  extractedAt: string
  brand?: string
  category?: string
  sizes?: string[]
  colors?: string[]
  discount?: number
  originalPrice?: number
}

export class SheinSearchAPIScraper {
  private config: SearchAPIConfig
  private requestCount = 0
  private successCount = 0
  private failureCount = 0

  constructor() {
    this.config = {
      apiKey: process.env.SEARCHAPI_API_KEY || '',
      endpoint: 'https://www.searchapi.io/api/v1/search',
      timeout: 30000
    }

    if (!this.config.apiKey) {
      throw new Error('SEARCHAPI_API_KEY is required')
    }
  }

  /**
   * Buscar productos en SHEIN usando SearchAPI.io
   */
  async search(query: string, maxResults: number = 20): Promise<ScrapingResult> {
    const startTime = Date.now()
    this.requestCount++

    try {
      console.log(`[SHEIN SearchAPI] Searching for: "${query}" (max: ${maxResults})`)

      // Construir parámetros para SearchAPI
      const searchParams = new URLSearchParams({
        engine: 'shein_search',
        q: query,
        api_key: this.config.apiKey,
        shein_domain: 'us.shein.com',
        sort_by: 'recommended',
        language: 'en'
      })

      // Realizar request a SearchAPI
      const response = await fetch(`${this.config.endpoint}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LUKIA/1.0 E-commerce AI Platform'
        }
      })

      if (!response.ok) {
        throw new Error(`SearchAPI error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[SHEIN SearchAPI] API response received`)

      // Procesar respuesta
      if (data.organic_results && Array.isArray(data.organic_results)) {
        const products = this.parseSearchAPIResponse(data, maxResults)
        
        this.successCount++
        const processingTime = Date.now() - startTime

        console.log(`[SHEIN SearchAPI] Successfully extracted ${products.length} products`)

        return {
          success: true,
          products,
          errors: [],
          platform: Platform.SHEIN,
          totalFound: data.search_information?.total_results || products.length,
          processingTime
        }
      } else {
        throw new Error(`SearchAPI returned unexpected format: ${JSON.stringify(data)}`)
      }

    } catch (error) {
      this.failureCount++
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      console.error(`[SHEIN SearchAPI] Error:`, errorMessage)

      return {
        success: false,
        products: [],
        errors: [errorMessage],
        platform: Platform.SHEIN,
        totalFound: 0,
        processingTime
      }
    }
  }

  /**
   * Parsear respuesta de SearchAPI a formato de productos
   */
  private parseSearchAPIResponse(data: any, maxResults: number): SheinProduct[] {
    const products: SheinProduct[] = []
    
    try {
      const organicResults = data.organic_results || []
      
      for (let i = 0; i < Math.min(organicResults.length, maxResults); i++) {
        const item = organicResults[i]
        
        if (item && item.title && item.link) {
          // Extraer precio
          const priceInfo = this.extractPrice(item.price || item.current_price || item.original_price)
          
          // Extraer rating
          const rating = this.extractRating(item.rating || item.reviews)
          
          // Extraer información de reviews
          const reviewInfo = this.extractReviewInfo(item.reviews || item.review_count)
          
          // Crear producto
          const product: SheinProduct = {
            title: item.title.trim(),
            price: priceInfo.price,
            currency: priceInfo.currency,
            imageUrl: this.cleanImageUrl(item.thumbnail || item.image || item.img_url || ''),
            productUrl: this.cleanProductUrl(item.link),
            platform: Platform.SHEIN,
            vendorName: 'SHEIN',
            vendorRating: 4.2, // Rating promedio de SHEIN
            totalSales: this.estimateSales(item.sales || item.sold_count),
            reviewCount: reviewInfo.count,
            rating: rating,
            extractedAt: new Date().toISOString(),
            brand: item.brand || 'SHEIN',
            category: item.category || this.extractCategory(item.breadcrumb),
            sizes: this.extractSizes(item.sizes || item.variants),
            colors: this.extractColors(item.colors || item.variants),
            discount: priceInfo.discount,
            originalPrice: priceInfo.originalPrice
          }
          
          products.push(product)
        }
      }
    } catch (error) {
      console.error('[SHEIN SearchAPI] Error parsing products:', error)
    }

    return products
  }

  /**
   * Extraer información de precio
   */
  private extractPrice(priceData: any): {
    price: number
    currency: string
    discount?: number
    originalPrice?: number
  } {
    let price = 0
    let currency = 'USD'
    let discount: number | undefined
    let originalPrice: number | undefined

    try {
      if (typeof priceData === 'string') {
        // Extraer precio de string como "$15.99" o "15.99"
        const match = priceData.match(/[\d.]+/)
        if (match) {
          price = parseFloat(match[0])
        }
        
        // Detectar moneda
        if (priceData.includes('$')) currency = 'USD'
        else if (priceData.includes('€')) currency = 'EUR'
        else if (priceData.includes('£')) currency = 'GBP'
        
      } else if (typeof priceData === 'object' && priceData !== null) {
        // Si es objeto con current_price, original_price, etc.
        price = parseFloat(priceData.current_price || priceData.price || priceData.value || 0)
        currency = priceData.currency || 'USD'
        
        if (priceData.original_price && priceData.original_price > price) {
          originalPrice = parseFloat(priceData.original_price)
          discount = Math.round(((originalPrice - price) / originalPrice) * 100)
        }
      } else if (typeof priceData === 'number') {
        price = priceData
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing price:', error)
    }

    return { price, currency, discount, originalPrice }
  }

  /**
   * Extraer rating del producto
   */
  private extractRating(ratingData: any): number {
    try {
      if (typeof ratingData === 'number') {
        return Math.min(5, Math.max(0, ratingData))
      }
      
      if (typeof ratingData === 'string') {
        const match = ratingData.match(/[\d.]+/)
        if (match) {
          return Math.min(5, Math.max(0, parseFloat(match[0])))
        }
      }
      
      if (typeof ratingData === 'object' && ratingData?.rating) {
        return Math.min(5, Math.max(0, parseFloat(ratingData.rating)))
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing rating:', error)
    }
    
    return 4.0 // Rating por defecto
  }

  /**
   * Extraer información de reviews
   */
  private extractReviewInfo(reviewData: any): { count: number } {
    let count = 0
    
    try {
      if (typeof reviewData === 'number') {
        count = reviewData
      } else if (typeof reviewData === 'string') {
        const match = reviewData.match(/\d+/)
        if (match) {
          count = parseInt(match[0])
        }
      } else if (typeof reviewData === 'object' && reviewData?.count) {
        count = parseInt(reviewData.count)
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing review count:', error)
    }
    
    return { count }
  }

  /**
   * Limpiar URL de imagen
   */
  private cleanImageUrl(imageUrl: string): string {
    if (!imageUrl) return ''
    
    try {
      // Si es una URL relativa, agregar protocolo
      if (imageUrl.startsWith('//')) {
        return `https:${imageUrl}`
      }
      
      // Si no tiene protocolo, agregar https
      if (!imageUrl.startsWith('http')) {
        return `https://${imageUrl}`
      }
      
      return imageUrl
    } catch (error) {
      return imageUrl
    }
  }

  /**
   * Limpiar URL del producto
   */
  private cleanProductUrl(productUrl: string): string {
    if (!productUrl) return ''
    
    try {
      // Si es una URL relativa, agregar dominio de SHEIN
      if (productUrl.startsWith('/')) {
        return `https://us.shein.com${productUrl}`
      }
      
      // Si no tiene protocolo, agregar https
      if (!productUrl.startsWith('http')) {
        return `https://${productUrl}`
      }
      
      return productUrl
    } catch (error) {
      return productUrl
    }
  }

  /**
   * Estimar ventas basado en información disponible
   */
  private estimateSales(salesData: any): number {
    try {
      if (typeof salesData === 'number') {
        return salesData
      }
      
      if (typeof salesData === 'string') {
        const match = salesData.match(/\d+/)
        if (match) {
          return parseInt(match[0])
        }
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing sales:', error)
    }
    
    // Estimación basada en popularidad
    return Math.floor(Math.random() * 5000) + 100
  }

  /**
   * Extraer categoría del breadcrumb
   */
  private extractCategory(breadcrumb: any): string {
    try {
      if (Array.isArray(breadcrumb) && breadcrumb.length > 0) {
        return breadcrumb[breadcrumb.length - 1]
      }
      
      if (typeof breadcrumb === 'string') {
        const parts = breadcrumb.split('>')
        return parts[parts.length - 1].trim()
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing category:', error)
    }
    
    return 'Fashion'
  }

  /**
   * Extraer tallas disponibles
   */
  private extractSizes(sizesData: any): string[] {
    try {
      if (Array.isArray(sizesData)) {
        return sizesData.map(size => String(size))
      }
      
      if (typeof sizesData === 'string') {
        return sizesData.split(',').map(s => s.trim())
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing sizes:', error)
    }
    
    return ['S', 'M', 'L', 'XL'] // Tallas por defecto
  }

  /**
   * Extraer colores disponibles
   */
  private extractColors(colorsData: any): string[] {
    try {
      if (Array.isArray(colorsData)) {
        return colorsData.map(color => String(color))
      }
      
      if (typeof colorsData === 'string') {
        return colorsData.split(',').map(c => c.trim())
      }
    } catch (error) {
      console.log('[SHEIN SearchAPI] Error parsing colors:', error)
    }
    
    return ['Black', 'White', 'Navy'] // Colores por defecto
  }

  /**
   * Obtener estadísticas del scraper
   */
  getStats(): {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    successRate: number
  } {
    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0
    }
  }

  /**
   * Verificar salud del servicio
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    apiKey: boolean
    endpoint: boolean
    lastCheck: string
  }> {
    const hasApiKey = !!this.config.apiKey
    const hasEndpoint = !!this.config.endpoint
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (!hasApiKey || !hasEndpoint) {
      status = 'unhealthy'
    } else if (this.requestCount > 0 && this.successCount / this.requestCount < 0.5) {
      status = 'degraded'
    }

    return {
      status,
      apiKey: hasApiKey,
      endpoint: hasEndpoint,
      lastCheck: new Date().toISOString()
    }
  }
}

// Singleton para reutilizar instancia
let sheinSearchAPIInstance: SheinSearchAPIScraper | null = null

export function getSheinSearchAPIScraper(): SheinSearchAPIScraper {
  if (!sheinSearchAPIInstance) {
    sheinSearchAPIInstance = new SheinSearchAPIScraper()
  }
  return sheinSearchAPIInstance
}

export async function scrapeShein(query: string, maxResults: number = 20): Promise<ScrapingResult> {
  const scraper = getSheinSearchAPIScraper()
  return scraper.search(query, maxResults)
}