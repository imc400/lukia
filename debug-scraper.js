const puppeteer = require('puppeteer');

async function debugAliExpress() {
  console.log('🔍 Debugging AliExpress structure...');
  
  const browser = await puppeteer.launch({
    headless: false, // Mostrar navegador para debug
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  const page = await browser.newPage();
  
  // Configurar como navegador real
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  await page.setViewport({ width: 1366, height: 768 });
  
  try {
    console.log('🌐 Navigating to AliExpress...');
    await page.goto('https://www.aliexpress.com/wholesale?SearchText=iphone+case', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Tomar screenshot para debug
    await page.screenshot({ path: 'debug-aliexpress.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-aliexpress.png');
    
    // Buscar diferentes selectores posibles
    const selectors = [
      '[data-item-id]',
      '.list-item',
      '.product-item',
      '.manhattan--gridItem--1DBZA8x',
      '.manhattan--normal--1lCR09O',
      '[class*="product"]',
      '[class*="item"]',
      '[class*="card"]',
      '.search-item',
      '.gallery-item'
    ];
    
    console.log('🔍 Testing selectors...');
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        
        if (elements.length > 0) {
          // Intentar extraer información del primer elemento
          const info = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (!element) return null;
            
            return {
              html: element.outerHTML.substring(0, 200),
              text: element.textContent.substring(0, 100),
              className: element.className
            };
          }, selector);
          
          console.log(`📄 Sample element info:`, info);
        }
        
      } catch (error) {
        console.log(`❌ Selector ${selector} failed: ${error.message}`);
      }
    }
    
    // Obtener estructura general de la página
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        mainContent: document.querySelector('main, #main, .main') ? 'Found main content' : 'No main content',
        productCount: document.querySelectorAll('[class*="product"], [class*="item"]').length
      };
    });
    
    console.log('📊 Page info:', pageInfo);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
  
  console.log('⏸️  Pausing for manual inspection (press any key to continue)...');
  
  // Esperar input del usuario para continuar
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    await browser.close();
    process.exit();
  });
}

debugAliExpress().catch(console.error);