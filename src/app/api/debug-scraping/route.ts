import { NextResponse } from 'next/server'
import { DebugAliExpressScraper } from '@/services/scraping/debug-aliexpress'

export async function GET() {
  try {
    console.log('Starting debug scraping test...')
    
    const scraper = new DebugAliExpressScraper()
    const result = await scraper.debugSearch('phone case')
    
    return NextResponse.json({
      success: true,
      message: 'Debug scraping test completed',
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Debug scraping error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}