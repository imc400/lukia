import puppeteer, { Browser, Page } from 'puppeteer'
import { ProxyConfig, getProxyManager } from '../proxies/proxy-manager'
import { sleep } from '@/utils'

export class DebugAliExpressScraper {
  private browser: Browser | null = null
  private page: Page | null = null
  private proxyManager = getProxyManager()

  async initialize(proxy?: ProxyConfig): Promise<void> {
    const launchOptions: any = {
      headless: false, // Cambiar a false para debug
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-infobars',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ]
    }

    // Configurar proxy si está disponible
    if (proxy) {
      launchOptions.args.push(`--proxy-server=${proxy.host}:${proxy.port}`)
      console.log(`[Debug] Using proxy: ${proxy.host}:${proxy.port}`)
    }

    this.browser = await puppeteer.launch(launchOptions)
    this.page = await this.browser.newPage()
    
    // Configurar autenticación de proxy
    if (proxy && proxy.username && proxy.password) {
      await this.page.authenticate({
        username: proxy.username,
        password: proxy.password
      })
    }
    
    // User agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Viewport
    await this.page.setViewport({ width: 1366, height: 768 })
    
    // Interceptar requests
    await this.page.setRequestInterception(true)
    this.page.on('request', (request) => {
      const url = request.url()
      console.log(`[Debug] Request: ${url}`)
      
      // Detectar redirects
      if (url.includes('captcha') || url.includes('verify') || url.includes('robot') || url.includes('slides.aliexpress.com')) {
        console.log(`[Debug] CAPTCHA/VERIFICATION DETECTED: ${url}`)
      }
      
      // Continuar con la request
      request.continue()
    })

    // Manejar respuestas
    this.page.on('response', (response) => {
      console.log(`[Debug] Response: ${response.status()} - ${response.url()}`)
    })
  }

  async debugSearch(query: string): Promise<any> {
    // Inicializar con proxy
    const proxy = await this.proxyManager.getBestProxy('ALIEXPRESS' as any)
    await this.initialize(proxy)

    const searchUrl = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(query)}.html`
    console.log(`[Debug] Navigating to: ${searchUrl}`)
    
    // Navegar
    await this.page!.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    })

    // Esperar
    await sleep(5000)

    // Verificar URL actual
    const currentUrl = this.page!.url()
    console.log(`[Debug] Current URL: ${currentUrl}`)

    // Verificar si fuimos redirigidos
    if (currentUrl !== searchUrl) {
      console.log(`[Debug] REDIRECT DETECTED: ${currentUrl}`)
    }

    // Extraer información de la página
    const pageInfo = await this.page!.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        hasProducts: document.querySelector('[data-widget-cid="widget-common-5.0.0"]') !== null,
        hasGallery: document.querySelector('.list--gallery--C2f2tvm') !== null,
        hasProductItem: document.querySelector('.product-item') !== null,
        hasListItem: document.querySelector('.list-item') !== null,
        allSelectors: Array.from(document.querySelectorAll('*')).map(el => el.className).filter(c => c && c.includes('list')).slice(0, 20)
      }
    })

    console.log(`[Debug] Page info:`, pageInfo)

    // Tomar screenshot
    await this.page!.screenshot({ path: 'debug-screenshot.png' })
    console.log(`[Debug] Screenshot saved as debug-screenshot.png`)

    await this.close()
    return pageInfo
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }
}