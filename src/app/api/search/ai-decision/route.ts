import { NextRequest, NextResponse } from 'next/server'
import { CacheService } from '@/lib/redis'

const cache = CacheService.getInstance()

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: 'Query is required' 
      }, { status: 400 })
    }

    // Buscar en cache la decisión AI
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = `ai_analysis:cl:v3:${normalizedQuery}`
    
    const cachedData = await cache.get<{
      products: any[]
      decisionAnalysis?: any
      totalAnalyzed: number
      completedAt: string
      processingTime: number
    }>(cacheKey)
    
    if (cachedData && cachedData.decisionAnalysis) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        data: {
          bestChoice: cachedData.decisionAnalysis,
          totalAnalyzed: cachedData.totalAnalyzed,
          completedAt: cachedData.completedAt,
          processingTime: cachedData.processingTime
        }
      })
    }

    // Si no hay decisión disponible aún
    return NextResponse.json({
      success: true,
      status: 'processing',
      message: 'AI decision analysis in progress'
    })

  } catch (error) {
    console.error('[AI Decision API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get AI decision' 
    }, { status: 500 })
  }
}