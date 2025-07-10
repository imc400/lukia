import { NextResponse } from 'next/server'
import { getProductAnalyzer, ProductInput } from '@/services/ai/product-analyzer'
import { Platform } from '@prisma/client'

export async function GET() {
  try {
    console.log('Starting AI analysis test...')
    
    const analyzer = getProductAnalyzer()
    
    // Producto de prueba con datos realistas
    const testProduct: ProductInput = {
      title: 'Wireless Bluetooth Headphones with Noise Cancellation',
      price: 45.99,
      currency: 'USD',
      imageUrl: 'https://example.com/headphones.jpg',
      vendorName: 'TechGear Electronics',
      vendorRating: 4.3,
      totalSales: 2847,
      platform: Platform.ALIEXPRESS,
      reviews: [
        {
          rating: 5,
          comment: 'Amazing sound quality and comfortable fit. Battery lasts all day!',
          date: '2024-01-15',
          helpful: 12
        },
        {
          rating: 4,
          comment: 'Good headphones but the noise cancellation could be better.',
          date: '2024-01-10',
          helpful: 8
        },
        {
          rating: 3,
          comment: 'Decent for the price but had connection issues after 2 months.',
          date: '2024-01-05',
          helpful: 5
        },
        {
          rating: 5,
          comment: 'Excellent value for money! Fast delivery and great packaging.',
          date: '2024-01-01',
          helpful: 15
        }
      ]
    }
    
    // Realizar análisis completo
    const startTime = Date.now()
    const analysis = await analyzer.analyzeProduct(testProduct)
    const reviewAnalysis = await analyzer.analyzeReviews(testProduct.reviews || [])
    const totalTime = Date.now() - startTime
    
    console.log(`[AI Test] Analysis completed in ${totalTime}ms`)
    
    return NextResponse.json({
      success: true,
      message: 'AI analysis test completed successfully',
      testProduct: {
        title: testProduct.title,
        price: testProduct.price,
        vendor: testProduct.vendorName,
        platform: testProduct.platform,
        reviewCount: testProduct.reviews?.length || 0
      },
      analysis: {
        trustScore: analysis.trustScore,
        riskLevel: analysis.riskAssessment.level,
        confidence: analysis.confidence,
        summary: analysis.summary,
        keyRecommendations: analysis.recommendations.slice(0, 3),
        processingTime: analysis.analysisTime
      },
      reviewAnalysis: {
        sentiment: reviewAnalysis.overallSentiment,
        sentimentScore: reviewAnalysis.sentimentScore,
        keyThemes: reviewAnalysis.keyThemes,
        authenticityScore: reviewAnalysis.authenticityScore,
        summary: reviewAnalysis.summary
      },
      performance: {
        totalProcessingTime: totalTime,
        aiResponseTime: analysis.analysisTime,
        reviewProcessingTime: totalTime - analysis.analysisTime
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('AI analysis test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'AI analysis test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product } = body
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product data is required'
      }, { status: 400 })
    }
    
    const analyzer = getProductAnalyzer()
    const analysis = await analyzer.analyzeProduct(product)
    
    let reviewAnalysis = null
    if (product.reviews && product.reviews.length > 0) {
      reviewAnalysis = await analyzer.analyzeReviews(product.reviews)
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      reviewAnalysis,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('AI analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}