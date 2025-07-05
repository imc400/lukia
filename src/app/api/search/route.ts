import { NextRequest, NextResponse } from 'next/server'
import { getScrapingService } from '@/services/scraping'
import { SearchParams, Platform } from '@/types'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  platform: z.enum(['all', 'ALIEXPRESS', 'SHEIN', 'TEMU', 'ALIBABA']).optional().default('all'),
  maxResults: z.number().min(1).max(50).optional().default(20)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = searchSchema.parse(body)
    
    const searchParams: SearchParams = {
      query: validatedData.query,
      platform: validatedData.platform === 'all' ? 'all' : validatedData.platform as Platform
    }
    
    const scrapingService = getScrapingService()
    const results = await scrapingService.search(searchParams)
    
    // Combinar resultados de todas las plataformas
    const allProducts = results.reduce((acc, result) => {
      return [...acc, ...result.products]
    }, [] as any[])
    
    // Calcular estadísticas
    const totalResults = allProducts.length
    const successfulPlatforms = results.filter(r => r.success).length
    const failedPlatforms = results.filter(r => !r.success).length
    
    const response = {
      success: true,
      query: validatedData.query,
      totalResults,
      platforms: {
        successful: successfulPlatforms,
        failed: failedPlatforms,
        total: results.length
      },
      products: allProducts,
      results: results.map(r => ({
        platform: r.platform,
        success: r.success,
        count: r.products.length,
        errors: r.errors,
        processingTime: r.processingTime
      })),
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Search API error:', error)
    
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
    const query = searchParams.get('q')
    const platform = searchParams.get('platform') || 'all'
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      )
    }
    
    const validatedData = searchSchema.parse({ query, platform })
    
    const searchParamsObj: SearchParams = {
      query: validatedData.query,
      platform: validatedData.platform === 'all' ? 'all' : validatedData.platform as Platform
    }
    
    const scrapingService = getScrapingService()
    const results = await scrapingService.search(searchParamsObj)
    
    const allProducts = results.reduce((acc, result) => {
      return [...acc, ...result.products]
    }, [] as any[])
    
    const response = {
      success: true,
      query: validatedData.query,
      totalResults: allProducts.length,
      products: allProducts,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Search API error:', error)
    
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