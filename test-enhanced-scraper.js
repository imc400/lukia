const { EnhancedAliExpressScraper } = require('./src/services/scraping/enhanced-aliexpress.ts');

async function testEnhancedScraper() {
  console.log('Testing enhanced AliExpress scraper...');
  
  const scraper = new EnhancedAliExpressScraper();
  
  try {
    console.log('Starting search for "phone case"...');
    const result = await scraper.search('phone case', 5);
    
    console.log('Search result:', {
      success: result.success,
      totalFound: result.totalFound,
      productsCount: result.products.length,
      errors: result.errors,
      processingTime: result.processingTime
    });
    
    if (result.success && result.products.length > 0) {
      console.log('First product:', {
        title: result.products[0].title,
        price: result.products[0].price,
        vendorName: result.products[0].vendorName,
        imageUrl: result.products[0].imageUrl?.substring(0, 50) + '...'
      });
    }
    
    const metrics = scraper.getMetrics();
    console.log('Scraper metrics:', metrics);
    
  } catch (error) {
    console.error('Error testing scraper:', error.message);
  } finally {
    await scraper.close();
  }
}

testEnhancedScraper();