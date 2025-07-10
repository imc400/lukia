import { NextRequest, NextResponse } from 'next/server'
import { CacheService } from '@/lib/redis'
import { z } from 'zod'

const statusSchema = z.object({
  query: z.string().min(1).max(100)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = statusSchema.parse(body)
    
    const cache = CacheService.getInstance()
    const cacheKey = `ai_analysis:cl:${query}`
    
    // Verificar si el análisis está completo
    const analysisResult = await cache.get(cacheKey)
    
    if (analysisResult) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        query,
        data: analysisResult,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: true,
        status: 'processing',
        query,
        message: 'AI analysis is still in progress. Please check again in a few moments.',
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('AI Status API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      )
    }
    
    const cache = CacheService.getInstance()
    const cacheKey = `ai_analysis:cl:${query}`
    
    const analysisResult = await cache.get(cacheKey)
    
    if (analysisResult) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        query,
        data: analysisResult,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: true,
        status: 'processing',
        query,
        message: 'AI analysis is still in progress.',
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('AI Status API error:', error)
    
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