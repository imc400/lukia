import { NextRequest, NextResponse } from 'next/server'
import { getScrapingService } from '@/services/scraping'
import { SearchParams, Platform } from '@/types'
import { getProductAnalyzer } from '@/services/ai/product-analyzer'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  platform: z.enum(['all', 'ALIEXPRESS', 'SHEIN', 'TEMU', 'ALIBABA', 'aliexpress', 'shein', 'temu', 'alibaba']).optional().default('all'),
  maxResults: z.number().min(1).max(50).optional().default(20),
  includeAI: z.boolean().optional().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = searchSchema.parse(body)
    
    // Normalizar plataforma a mayúsculas
    const normalizedPlatform = validatedData.platform === 'all' ? 'all' : 
      validatedData.platform.toUpperCase() as Platform
    
    const searchParams: SearchParams = {
      query: validatedData.query,
      platform: normalizedPlatform
    }
    
    const scrapingService = getScrapingService()
    const results = await scrapingService.search(searchParams)
    
    // Combinar resultados de todas las plataformas
    const allProducts = results.reduce((acc, result) => {
      return [...acc, ...result.products]
    }, [] as any[])

    // Aplicar análisis de IA si está habilitado
    let analyzedProducts = allProducts
    let aiAnalysisTime = 0
    
    if (validatedData.includeAI && allProducts.length > 0) {
      const aiStartTime = Date.now()
      console.log(`[AI Analysis] Starting analysis for ${allProducts.length} products`)
      
      try {
        const analyzer = getProductAnalyzer()
        
        // Analizar productos (máximo 10 para evitar timeouts)
        const productsToAnalyze = allProducts.slice(0, 10)
        const analysisPromises = productsToAnalyze.map(async (product) => {
          try {
            const analysis = await analyzer.analyzeProduct({
              title: product.title,
              price: product.price,
              currency: product.currency,
              imageUrl: product.imageUrl,
              vendorName: product.vendorName,
              vendorRating: product.vendorRating,
              totalSales: product.totalSales,
              platform: product.platform,
              reviews: product.reviews || []
            })
            
            return {
              ...product,
              aiAnalysis: {
                trustScore: analysis.trustScore,
                riskLevel: analysis.riskAssessment.level,
                recommendations: analysis.recommendations.slice(0, 3),
                warnings: analysis.warnings,
                summary: analysis.summary,
                confidence: analysis.confidence
              }
            }
          } catch (error) {
            console.error(`[AI Analysis] Error analyzing product ${product.title}:`, error)
            return {
              ...product,
              aiAnalysis: {
                trustScore: 50,
                riskLevel: 'medium',
                recommendations: ['AI analysis not available'],
                warnings: ['Analysis failed'],
                summary: 'Basic product information only',
                confidence: 30
              }
            }
          }
        })
        
        const analyzedProductsWithAI = await Promise.all(analysisPromises)
        
        // Ordenar productos por trust score (más alto primero)
        analyzedProducts = [
          ...analyzedProductsWithAI.sort((a, b) => (b.aiAnalysis?.trustScore || 0) - (a.aiAnalysis?.trustScore || 0)),
          ...allProducts.slice(10) // Productos no analizados
        ]
        
        aiAnalysisTime = Date.now() - aiStartTime
        console.log(`[AI Analysis] Completed analysis for ${productsToAnalyze.length} products in ${aiAnalysisTime}ms`)
        
      } catch (error) {
        console.error('[AI Analysis] Error during product analysis:', error)
      }
    }
    
    // Calcular estadísticas
    const totalResults = analyzedProducts.length
    const successfulPlatforms = results.filter(r => r.success).length
    const failedPlatforms = results.filter(r => !r.success).length
    
    // Estadísticas de IA
    const analyzedCount = analyzedProducts.filter(p => p.aiAnalysis).length
    const highTrustProducts = analyzedProducts.filter(p => p.aiAnalysis?.trustScore >= 80).length
    const lowRiskProducts = analyzedProducts.filter(p => p.aiAnalysis?.riskLevel === 'low').length
    
    const response = {
      success: true,
      query: validatedData.query,
      totalResults,
      platforms: {
        successful: successfulPlatforms,
        failed: failedPlatforms,
        total: results.length
      },
      products: analyzedProducts,
      aiAnalysis: validatedData.includeAI ? {
        enabled: true,
        analyzedProducts: analyzedCount,
        processingTime: aiAnalysisTime,
        statistics: {
          highTrustProducts,
          lowRiskProducts,
          averageTrustScore: analyzedCount > 0 ? 
            analyzedProducts
              .filter(p => p.aiAnalysis)
              .reduce((sum, p) => sum + p.aiAnalysis.trustScore, 0) / analyzedCount : 0
        }
      } : {
        enabled: false,
        analyzedProducts: 0,
        processingTime: 0
      },
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
    
    // Normalizar plataforma a mayúsculas
    const normalizedPlatform = validatedData.platform === 'all' ? 'all' : 
      validatedData.platform.toUpperCase() as Platform
    
    const searchParamsObj: SearchParams = {
      query: validatedData.query,
      platform: normalizedPlatform
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