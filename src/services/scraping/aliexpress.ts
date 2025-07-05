import puppeteer, { Browser, Page } from 'puppeteer'
import { Platform } from '@prisma/client'
import { ScrapingResult } from '@/types'
import { sleep } from '@/utils'

export class AliExpressScraper {
  private browser: Browser | null = null
  private page: Page | null = null

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })
    
    this.page = await this.browser.newPage()
    
    // Configurar user agent para evitar detección
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    )
    
    // Configurar viewport
    await this.page.setViewport({ width: 1366, height: 768 })
    
    // Configurar extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })
  }

  async search(query: string, maxResults: number = 20): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    try {
      if (!this.page) {
        await this.initialize()
      }

      const searchUrl = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(query)}.html`
      console.log(`Scraping AliExpress: ${searchUrl}`)
      
      await this.page!.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      })

      // Esperar a que carguen los productos
      await this.page!.waitForSelector('[data-widget-cid="widget-common-5.0.0"]', { timeout: 10000 })
      
      // Extraer productos
      const products = await this.page!.evaluate((maxResults) => {
        const productElements = document.querySelectorAll('[data-widget-cid="widget-common-5.0.0"] .list--gallery--C2f2tvm a')
        const results: any[] = []
        
        for (let i = 0; i < Math.min(productElements.length, maxResults); i++) {
          const element = productElements[i] as HTMLElement
          
          try {
            const titleElement = element.querySelector('.multi--titleText--nXeOvyr')
            const priceElement = element.querySelector('.multi--price-sale--U-S0jtj')
            const imageElement = element.querySelector('img')
            const linkElement = element.closest('a')
            
            // Extraer información del vendedor
            const sellerElement = element.querySelector('.multi--shop--kQl8dPz')
            const ratingElement = element.querySelector('.multi--star--A7FkN8w')
            const ordersElement = element.querySelector('.multi--trade--Ktbl2jB')
            
            if (titleElement && priceElement && imageElement && linkElement) {
              const title = titleElement.textContent?.trim() || ''
              const priceText = priceElement.textContent?.trim() || ''
              const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0
              const imageUrl = imageElement.src || imageElement.dataset.src || ''
              const productUrl = linkElement.href || ''
              
              const vendorName = sellerElement?.textContent?.trim() || ''
              const ratingText = ratingElement?.textContent?.trim() || ''
              const rating = parseFloat(ratingText.replace(/[^0-9.]/g, '')) || 0
              const ordersText = ordersElement?.textContent?.trim() || ''
              const orders = parseInt(ordersText.replace(/[^0-9]/g, '')) || 0
              
              results.push({
                title,
                price,
                currency: 'USD',
                imageUrl,
                productUrl: productUrl.startsWith('http') ? productUrl : `https:${productUrl}`,
                platform: 'ALIEXPRESS',
                vendorName,
                vendorRating: rating,
                totalSales: orders
              })
            }
          } catch (error) {
            console.error('Error parsing product:', error)
          }
        }
        
        return results
      }, maxResults)

      // Simular comportamiento humano
      await sleep(1000 + Math.random() * 2000)

      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        products,
        errors: [],
        platform: Platform.ALIEXPRESS,
        totalFound: products.length,
        processingTime
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        products: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        platform: Platform.ALIEXPRESS,
        totalFound: 0,
        processingTime
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }
}

// Singleton para reutilizar el browser
let scraperInstance: AliExpressScraper | null = null

export async function scrapeAliExpress(query: string, maxResults: number = 20): Promise<ScrapingResult> {
  if (!scraperInstance) {
    scraperInstance = new AliExpressScraper()
  }
  
  try {
    return await scraperInstance.search(query, maxResults)
  } catch (error) {
    // Si hay error, reiniciar el scraper
    if (scraperInstance) {
      await scraperInstance.close()
      scraperInstance = null
    }
    throw error
  }
}