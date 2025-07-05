import { NextResponse } from 'next/server'
import { scrapeAliExpress } from '@/services/scraping/aliexpress'

export async function GET() {
  try {
    console.log('Iniciando test de scraping...')
    
    const result = await scrapeAliExpress('phone case', 5)
    
    return NextResponse.json({
      success: true,
      message: 'Test de scraping completado',
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error en test de scraping:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en test de scraping',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}