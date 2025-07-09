import puppeteer, { Browser, Page } from 'puppeteer'
import { Platform } from '@prisma/client'
import { ScrapingResult } from '@/types'
import { sleep } from '@/utils'
import { ProxyConfig, getProxyManager } from '../proxies/proxy-manager'
import { getRetryHandler } from './retry-handler'

export interface ScrapingMetrics {
  requestsPerMinute: number
  successRate: number
  averageResponseTime: number
  blockedRequests: number
  captchaEncountered: number
}

export class EnhancedAliExpressScraper {
  private browser: Browser | null = null
  private page: Page | null = null
  private proxyManager = getProxyManager()
  private retryHandler = getRetryHandler()
  private metrics: ScrapingMetrics = {
    requestsPerMinute: 0,
    successRate: 0,
    averageResponseTime: 0,
    blockedRequests: 0,
    captchaEncountered: 0
  }
  private requestCount = 0
  private lastRequestTime = Date.now()

  /**
   * Inicializar browser con proxy
   */
  async initialize(proxy?: ProxyConfig): Promise<void> {
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection'
      ]
    }

    // Configurar proxy si está disponible
    if (proxy) {
      // Para proxies con autenticación, usar solo host:port
      launchOptions.args.push(`--proxy-server=${proxy.host}:${proxy.port}`)
      console.log(`[Scraper] Using proxy: ${proxy.host}:${proxy.port} (${proxy.provider})`)
    }

    this.browser = await puppeteer.launch(launchOptions)
    this.page = await this.browser.newPage()
    
    // Configurar autenticación de proxy si es necesario
    if (proxy && proxy.username && proxy.password) {
      await this.page.authenticate({
        username: proxy.username,
        password: proxy.password
      })
    }
    
    // Configurar user agent rotativo
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
    
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
    await this.page.setUserAgent(userAgent)
    
    // Configurar viewport aleatorio
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 }
    ]
    
    const viewport = viewports[Math.floor(Math.random() * viewports.length)]
    await this.page.setViewport(viewport)
    
    // Headers realistas
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    })

    // Interceptar requests para detectar bloqueos
    await this.page.setRequestInterception(true)
    this.page.on('request', (request) => {
      const url = request.url()
      
      // Detectar redirects a captcha o verificación
      if (url.includes('captcha') || url.includes('verify') || url.includes('robot') || url.includes('slides.aliexpress.com')) {
        this.metrics.captchaEncountered++
        console.log(`[Scraper] Captcha/verification detected: ${url}`)
      }
      
      // Bloquear recursos innecesarios para ahorrar bandwidth
      if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {
        request.abort()
      } else {
        request.continue()
      }
    })

    // Manejar errores de página
    this.page.on('error', (error) => {
      console.error('[Scraper] Page error:', error)
    })

    this.page.on('pageerror', (error) => {
      console.error('[Scraper] Page error:', error)
    })
  }

  /**
   * Búsqueda con reintentos automáticos
   */
  async search(query: string, maxResults: number = 20): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    const result = await this.retryHandler.executeWithRetry(
      async (proxy) => {
        return this.performSearch(query, maxResults, proxy)
      },
      this.retryHandler.getAliExpressConfig()
    )

    const processingTime = Date.now() - startTime
    this.updateMetrics(result.success, processingTime)

    if (result.success && result.data) {
      return {
        ...result.data,
        processingTime
      }
    } else {
      return {
        success: false,
        products: [],
        errors: [result.error?.message || 'Unknown error'],
        platform: Platform.ALIEXPRESS,
        totalFound: 0,
        processingTime
      }
    }
  }

  /**
   * Realizar búsqueda real
   */
  private async performSearch(query: string, maxResults: number, proxy?: ProxyConfig): Promise<ScrapingResult> {
    // Inicializar browser si es necesario
    if (!this.browser || !this.page) {
      await this.initialize(proxy)
    }

    const searchUrl = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(query)}.html`
    console.log(`[Scraper] Searching: ${searchUrl}`)
    
    // Navegación con timeout extendido
    await this.page!.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    })

    // Simular comportamiento humano antes de buscar elementos
    await sleep(2000 + Math.random() * 3000)

    // Verificar si hay captcha o bloqueo
    const captchaExists = await this.page!.evaluate(() => {
      return document.querySelector('.captcha-container') !== null ||
             document.querySelector('#captcha_challenge') !== null ||
             document.querySelector('.slider-container') !== null ||
             document.body.innerText.includes('Robot Check') ||
             document.body.innerText.includes('Access Denied') ||
             window.location.href.includes('slides.aliexpress.com')
    })

    if (captchaExists) {
      this.metrics.blockedRequests++
      throw new Error('Captcha or robot check detected')
    }

    // Esperar a que carguen los productos con múltiples selectores
    const productSelectors = [
      '[data-widget-cid="widget-common-5.0.0"]',
      '.list--gallery--C2f2tvm',
      '.product-item',
      '.list-item'
    ]

    let productSelectorFound = false
    for (const selector of productSelectors) {
      try {
        await this.page!.waitForSelector(selector, { timeout: 10000 })
        productSelectorFound = true
        break
      } catch (error) {
        console.log(`[Scraper] Selector ${selector} not found, trying next...`)
      }
    }

    if (!productSelectorFound) {
      throw new Error('Product containers not found on page')
    }

    // Scroll para cargar contenido lazy
    await this.page!.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await sleep(1000)

    // Extraer productos con múltiples estrategias
    const products = await this.page!.evaluate((maxResults) => {
      const extractProduct = (element: Element): any => {
        try {
          // Múltiples selectores para título
          const titleSelectors = [
            '.multi--titleText--nXeOvyr',
            '.item-title',
            '.product-title',
            'h3',
            '.title'
          ]
          
          let titleElement: Element | null = null
          for (const selector of titleSelectors) {
            titleElement = element.querySelector(selector)
            if (titleElement) break
          }

          // Múltiples selectores para precio
          const priceSelectors = [
            '.multi--price-sale--U-S0jtj',
            '.price-current',
            '.price',
            '.notranslate'
          ]
          
          let priceElement: Element | null = null
          for (const selector of priceSelectors) {
            priceElement = element.querySelector(selector)
            if (priceElement) break
          }

          // Imagen
          const imageElement = element.querySelector('img')
          
          // Link
          const linkElement = element.closest('a') || element.querySelector('a')
          
          // Información del vendedor
          const sellerSelectors = [
            '.multi--shop--kQl8dPz',
            '.shop-name',
            '.seller-name'
          ]
          
          let sellerElement: Element | null = null
          for (const selector of sellerSelectors) {
            sellerElement = element.querySelector(selector)
            if (sellerElement) break
          }

          // Rating
          const ratingSelectors = [
            '.multi--star--A7FkN8w',
            '.rating',
            '.stars'
          ]
          
          let ratingElement: Element | null = null
          for (const selector of ratingSelectors) {
            ratingElement = element.querySelector(selector)
            if (ratingElement) break
          }

          // Órdenes/ventas
          const ordersSelectors = [
            '.multi--trade--Ktbl2jB',
            '.orders',
            '.sold'
          ]
          
          let ordersElement: Element | null = null
          for (const selector of ordersSelectors) {
            ordersElement = element.querySelector(selector)
            if (ordersElement) break
          }

          if (titleElement && priceElement && imageElement && linkElement) {
            const title = titleElement.textContent?.trim() || ''
            const priceText = priceElement.textContent?.trim() || ''
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0
            const imageUrl = (imageElement as HTMLImageElement).src || 
                           (imageElement as HTMLImageElement).dataset.src || ''
            const productUrl = (linkElement as HTMLAnchorElement).href || ''
            
            const vendorName = sellerElement?.textContent?.trim() || 'Unknown Seller'
            const ratingText = ratingElement?.textContent?.trim() || ''
            const rating = parseFloat(ratingText.replace(/[^0-9.]/g, '')) || 0
            const ordersText = ordersElement?.textContent?.trim() || ''
            const orders = parseInt(ordersText.replace(/[^0-9]/g, '')) || 0
            
            return {
              title,
              price,
              currency: 'USD',
              imageUrl: imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl,
              productUrl: productUrl.startsWith('http') ? productUrl : `https:${productUrl}`,
              platform: 'ALIEXPRESS',
              vendorName,
              vendorRating: rating,
              totalSales: orders,
              extractedAt: new Date().toISOString()
            }
          }
        } catch (error) {
          console.error('Error extracting product:', error)
        }
        return null
      }

      // Múltiples selectores para contenedores de productos
      const containerSelectors = [
        '[data-widget-cid="widget-common-5.0.0"] .list--gallery--C2f2tvm a',
        '.list--gallery--C2f2tvm .list-item',
        '.product-item',
        '.item'
      ]

      let productElements: NodeListOf<Element> | null = null
      for (const selector of containerSelectors) {
        productElements = document.querySelectorAll(selector)
        if (productElements.length > 0) break
      }

      if (!productElements || productElements.length === 0) {
        throw new Error('No product elements found')
      }

      const results: any[] = []
      for (let i = 0; i < Math.min(productElements.length, maxResults); i++) {
        const product = extractProduct(productElements[i])
        if (product) {
          results.push(product)
        }
      }
      
      return results
    }, maxResults)

    // Simular comportamiento humano después de extraer
    await sleep(1000 + Math.random() * 2000)

    console.log(`[Scraper] Extracted ${products.length} products for query: ${query}`)

    return {
      success: true,
      products: products || [],
      errors: [],
      platform: Platform.ALIEXPRESS,
      totalFound: products?.length || 0,
      processingTime: 0 // Se calculará en el nivel superior
    }
  }

  /**
   * Actualizar métricas de rendimiento
   */
  private updateMetrics(success: boolean, responseTime: number): void {
    this.requestCount++
    const now = Date.now()
    const timeDiff = now - this.lastRequestTime
    
    // Calcular requests per minute
    this.metrics.requestsPerMinute = (60 * 1000) / timeDiff
    
    // Calcular success rate
    const totalRequests = this.requestCount
    const successfulRequests = success ? 1 : 0
    this.metrics.successRate = (this.metrics.successRate * (totalRequests - 1) + successfulRequests * 100) / totalRequests
    
    // Calcular average response time
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests
    
    this.lastRequestTime = now
  }

  /**
   * Obtener métricas de rendimiento
   */
  getMetrics(): ScrapingMetrics {
    return { ...this.metrics }
  }

  /**
   * Cerrar browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  /**
   * Verificar salud del scraper
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    metrics: ScrapingMetrics
    proxyHealth: { healthy: number, total: number }
  }> {
    const proxyHealth = await this.proxyManager.healthCheck()
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (this.metrics.successRate < 50) {
      status = 'unhealthy'
    } else if (this.metrics.successRate < 80 || this.metrics.blockedRequests > 10) {
      status = 'degraded'
    }

    return {
      status,
      metrics: this.metrics,
      proxyHealth
    }
  }
}

// Singleton con pool de scrapers
class ScraperPool {
  private scrapers: EnhancedAliExpressScraper[] = []
  private currentIndex = 0
  private maxPoolSize = 3

  async getScraperInstance(): Promise<EnhancedAliExpressScraper> {
    if (this.scrapers.length < this.maxPoolSize) {
      const scraper = new EnhancedAliExpressScraper()
      this.scrapers.push(scraper)
      return scraper
    }

    // Usar round-robin para distribuir carga
    const scraper = this.scrapers[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.scrapers.length
    return scraper
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.scrapers.map(scraper => scraper.close()))
    this.scrapers = []
  }
}

const scraperPool = new ScraperPool()

export async function scrapeAliExpress(query: string, maxResults: number = 20): Promise<ScrapingResult> {
  const scraper = await scraperPool.getScraperInstance()
  
  try {
    return await scraper.search(query, maxResults)
  } catch (error) {
    console.error('[Scraper] Error in scrapeAliExpress:', error)
    throw error
  }
}

export { scraperPool }