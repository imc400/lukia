import { NextRequest, NextResponse } from 'next/server'
import { getScrapingService } from '@/services/scraping'
import { SearchParams, Platform } from '@/types'
import { getProductAnalyzer } from '@/services/ai/product-analyzer'
import { getDecisionEngine } from '@/services/ai/decision-engine'
import { z } from 'zod'
import { CacheService } from '@/lib/redis'

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  platform: z.enum(['all', 'ALIEXPRESS', 'SHEIN', 'TEMU', 'ALIBABA', 'aliexpress', 'shein', 'temu', 'alibaba']).optional().default('all'),
  maxResults: z.number().min(1).max(100).optional().default(80),
  includeAI: z.boolean().optional().default(true)
})

/**
 * Procesar análisis de AI en background y guardar en cache
 */
async function processAIAnalysisBackground(products: any[], query: string) {
  const startTime = Date.now()
  const cache = CacheService.getInstance()
  
  try {
    console.log(`[AI Background] Starting analysis for ${products.length} products`)
    
    const analyzer = getProductAnalyzer()
    
    // Procesar todos los productos en lotes para mayor eficiencia
    const batchSize = 10 // Procesar en lotes de 10
    const analysisPromises = products.map(async (product, index) => {
      try {
        // Delay por lotes (más eficiente para 50+ productos)
        const batchIndex = Math.floor(index / batchSize)
        await new Promise(resolve => setTimeout(resolve, batchIndex * 300 + (index % batchSize) * 50))
        
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
            status: 'completed',
            trustScore: analysis.trustScore,
            riskLevel: analysis.riskAssessment.level,
            recommendations: analysis.recommendations.slice(0, 3),
            warnings: analysis.warnings,
            summary: analysis.summary,
            confidence: analysis.confidence,
            completedAt: new Date().toISOString()
          }
        }
      } catch (error) {
        console.error(`[AI Background] Error analyzing product ${product.title}:`, error)
        return {
          ...product,
          aiAnalysis: {
            status: 'failed',
            trustScore: 50,
            riskLevel: 'medium',
            recommendations: ['AI analysis failed'],
            warnings: ['Analysis error occurred'],
            summary: 'Basic product information only',
            confidence: 30,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    })
    
    const analyzedProducts = await Promise.all(analysisPromises)
    
    // Ordenar por trust score
    const sortedProducts = analyzedProducts.sort((a, b) => 
      (b.aiAnalysis?.trustScore || 0) - (a.aiAnalysis?.trustScore || 0)
    )
    
    // AI Decision Engine: Análisis inteligente de mejor opción
    let decisionAnalysis = null
    try {
      const decisionEngine = getDecisionEngine()
      decisionAnalysis = await decisionEngine.findBestOption(sortedProducts)
      
      // Agregar análisis del vendedor de la mejor opción
      if (decisionAnalysis?.bestProduct) {
        try {
          decisionAnalysis.vendorAnalysis = decisionEngine.analyzeVendor(
            decisionAnalysis.bestProduct.vendorName,
            sortedProducts
          )
        } catch (vendorError) {
          console.error('[AI Decision] Error analyzing vendor:', vendorError)
        }
      }
      
      console.log(`[AI Decision] Best choice: ${decisionAnalysis.bestProduct.title} with ${decisionAnalysis.reasons.length} reasons`)
    } catch (error) {
      console.error('[AI Decision] Error in decision analysis:', error)
    }

    // Cache inteligente: guardar resultado completo con clave específica
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = `ai_analysis:cl:v3:${normalizedQuery}` // v3 para nueva versión con decision engine
    const cacheData = {
      products: sortedProducts,
      decisionAnalysis,
      completedAt: new Date().toISOString(),
      totalAnalyzed: sortedProducts.length,
      processingTime: Date.now() - startTime,
      statistics: {
        highTrustProducts: sortedProducts.filter(p => p.aiAnalysis?.trustScore >= 80).length,
        lowRiskProducts: sortedProducts.filter(p => p.aiAnalysis?.riskLevel === 'low').length,
        averageTrustScore: Math.round(sortedProducts.reduce((sum, p) => sum + (p.aiAnalysis?.trustScore || 0), 0) / sortedProducts.length),
        hasReviews: sortedProducts.some(p => p.reviews && p.reviews.length > 0),
        topVendors: [...new Set(sortedProducts.slice(0, 10).map(p => p.vendorName))].slice(0, 5)
      }
    }
    
    // Cache por 2 horas para búsquedas exitosas
    await cache.set(cacheKey, cacheData, 7200)
    
    console.log(`[AI Background] Completed analysis for ${sortedProducts.length} products in ${Date.now() - startTime}ms`)
    console.log(`[AI Background] Cache saved with key: ${cacheKey}`)
    console.log(`[AI Background] Sample analysis:`, sortedProducts[0]?.aiAnalysis)
    
  } catch (error) {
    console.error('[AI Background] Fatal error during background processing:', error)
  }
}

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

    // Respuesta inmediata con productos básicos (sin modificaciones para velocidad)
    const analyzedProducts = allProducts
    
    // Si se solicita AI, iniciar análisis en background (completamente no-blocking)
    if (validatedData.includeAI && allProducts.length > 0) {
      console.log(`[AI Analysis] Starting background analysis for ${allProducts.length} products`)
      
      // Procesar AI en background sin bloquear la respuesta
      setImmediate(async () => {
        try {
          await processAIAnalysisBackground(allProducts, validatedData.query)
        } catch (error) {
          console.error('[AI Background] Error during background analysis:', error)
        }
      })
    }
    
    // Calcular estadísticas
    const totalResults = analyzedProducts.length
    const successfulPlatforms = results.filter(r => r.success).length
    const failedPlatforms = results.filter(r => !r.success).length
    
    // Estadísticas de IA (para análisis en progreso)
    const analyzedCount = validatedData.includeAI ? allProducts.length : 0
    
    // Respuesta mínima para velocidad máxima
    return NextResponse.json({
      success: true,
      query: validatedData.query,
      totalResults,
      products: analyzedProducts,
      aiAnalysis: {
        enabled: validatedData.includeAI,
        status: validatedData.includeAI ? 'processing' : 'disabled',
        message: validatedData.includeAI ? 'AI analysis in progress - check /api/search/ai-status' : 'AI analysis disabled'
      },
      timestamp: new Date().toISOString()
    })
    
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