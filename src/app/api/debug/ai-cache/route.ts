import { NextRequest, NextResponse } from 'next/server'
import { CacheService } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || 'anteojos de sol'
    
    const cache = CacheService.getInstance()
    const cacheKey = `ai_analysis:cl:${query}`
    
    // Verificar qué hay en el cache
    const cachedData = await cache.get(cacheKey)
    
    return NextResponse.json({
      success: true,
      query,
      cacheKey,
      cachedData,
      hasCachedData: !!cachedData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Debug AI cache error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}