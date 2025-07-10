import { NextResponse } from 'next/server'
import { getSheinSearchAPIScraper } from '@/services/scraping/shein-searchapi'

export async function GET() {
  try {
    console.log('Starting SHEIN SearchAPI test...')
    
    const scraper = getSheinSearchAPIScraper()
    
    // Verificar salud del servicio
    const healthCheck = await scraper.healthCheck()
    console.log('Health check:', healthCheck)
    
    if (healthCheck.status === 'unhealthy') {
      return NextResponse.json({
        success: false,
        message: 'SearchAPI service is not configured properly',
        healthCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Realizar búsqueda de prueba
    const result = await scraper.search('dress', 5)
    const stats = scraper.getStats()
    
    return NextResponse.json({
      success: true,
      message: 'SHEIN SearchAPI test completed',
      result,
      stats,
      healthCheck,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('SHEIN SearchAPI test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}