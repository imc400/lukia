import { NextResponse } from 'next/server'
import { getScrapingService } from '@/services/scraping'

export async function GET() {
  try {
    const scrapingService = getScrapingService()
    const stats = await scrapingService.getScrapingStats()
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Stats API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}