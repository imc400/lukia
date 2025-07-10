import OpenAI from 'openai'
import { Platform } from '@prisma/client'

export interface ProductAnalysis {
  trustScore: number
  trustFactors: {
    vendorReliability: number
    priceConsistency: number
    productQuality: number
    customerSatisfaction: number
    shippingReliability: number
  }
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    recommendations: string[]
  }
  qualityIndicators: {
    imageQuality: number
    descriptionQuality: number
    brandAuthenticity: number
    customerReviews: number
  }
  recommendations: string[]
  warnings: string[]
  summary: string
  confidence: number
  analysisTime: number
}

export interface ReviewAnalysis {
  overallSentiment: 'positive' | 'negative' | 'neutral'
  sentimentScore: number
  keyThemes: string[]
  commonComplaints: string[]
  commonPraises: string[]
  authenticityScore: number
  reviewQuality: number
  summary: string
  recommendations: string[]
}

export interface ProductInput {
  title: string
  price: number
  currency: string
  imageUrl: string
  vendorName: string
  vendorRating: number
  totalSales: number
  platform: Platform
  reviews?: Array<{
    rating: number
    comment: string
    date: string
    helpful: number
  }>
}

export class ProductAnalyzer {
  private openai: OpenAI
  private rateLimitDelay: number = 1000 // 1 segundo entre requests

  constructor() {
    let apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }
    
    // Limpiar la API key de espacios, saltos de línea y caracteres extraños
    apiKey = apiKey.replace(/\s+/g, '').trim()
    
    // Validar formato de la API key
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format')
    }
    
    // Validar longitud aproximada de la API key
    if (apiKey.length < 50) {
      throw new Error('OpenAI API key appears to be truncated')
    }
    
    console.log(`[AI] Initializing OpenAI with key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)} (length: ${apiKey.length})`)
    
    this.openai = new OpenAI({
      apiKey: apiKey
    })
  }

  /**
   * Análisis completo de producto usando IA
   */
  async analyzeProduct(product: ProductInput): Promise<ProductAnalysis> {
    const startTime = Date.now()
    
    try {
      console.log(`[AI Analysis] Analyzing product: ${product.title}`)
      
      // Preparar prompt con información del producto
      const prompt = this.buildAnalysisPrompt(product)
      
      // Hacer llamada a OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert e-commerce product analyst specializing in trust assessment, quality evaluation, and risk analysis for online shopping. You have deep knowledge of different e-commerce platforms, vendor reliability patterns, and consumer protection. Always provide detailed, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })

      const result = completion.choices[0]?.message?.content
      if (!result) {
        throw new Error('No response from OpenAI')
      }

      // Parsear respuesta JSON
      const analysisData = JSON.parse(result)
      
      // Construir análisis estructurado
      const analysis: ProductAnalysis = {
        trustScore: this.validateScore(analysisData.trustScore),
        trustFactors: {
          vendorReliability: this.validateScore(analysisData.trustFactors?.vendorReliability),
          priceConsistency: this.validateScore(analysisData.trustFactors?.priceConsistency),
          productQuality: this.validateScore(analysisData.trustFactors?.productQuality),
          customerSatisfaction: this.validateScore(analysisData.trustFactors?.customerSatisfaction),
          shippingReliability: this.validateScore(analysisData.trustFactors?.shippingReliability)
        },
        riskAssessment: {
          level: this.validateRiskLevel(analysisData.riskAssessment?.level),
          factors: Array.isArray(analysisData.riskAssessment?.factors) ? analysisData.riskAssessment.factors : [],
          recommendations: Array.isArray(analysisData.riskAssessment?.recommendations) ? analysisData.riskAssessment.recommendations : []
        },
        qualityIndicators: {
          imageQuality: this.validateScore(analysisData.qualityIndicators?.imageQuality),
          descriptionQuality: this.validateScore(analysisData.qualityIndicators?.descriptionQuality),
          brandAuthenticity: this.validateScore(analysisData.qualityIndicators?.brandAuthenticity),
          customerReviews: this.validateScore(analysisData.qualityIndicators?.customerReviews)
        },
        recommendations: Array.isArray(analysisData.recommendations) ? analysisData.recommendations : [],
        warnings: Array.isArray(analysisData.warnings) ? analysisData.warnings : [],
        summary: analysisData.summary || 'No summary available',
        confidence: this.validateScore(analysisData.confidence),
        analysisTime: Date.now() - startTime
      }

      console.log(`[AI Analysis] Completed analysis for ${product.title} (${analysis.analysisTime}ms)`)
      return analysis

    } catch (error) {
      console.error('[AI Analysis] Error:', error)
      
      // Log más detalles del error
      if (error instanceof Error) {
        console.error('[AI Analysis] Error name:', error.name)
        console.error('[AI Analysis] Error message:', error.message)
        if ('status' in error) {
          console.error('[AI Analysis] Error status:', (error as any).status)
        }
      }
      
      // Fallback analysis si falla la IA
      return this.generateFallbackAnalysis(product, Date.now() - startTime)
    }
  }

  /**
   * Análisis de reviews usando IA
   */
  async analyzeReviews(reviews: Array<{ rating: number, comment: string, date: string, helpful: number }>): Promise<ReviewAnalysis> {
    if (!reviews || reviews.length === 0) {
      return this.generateEmptyReviewAnalysis()
    }

    try {
      const prompt = this.buildReviewAnalysisPrompt(reviews)
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in sentiment analysis and review authenticity detection. Analyze customer reviews to extract key insights, detect fake reviews, and provide actionable recommendations for buyers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const result = completion.choices[0]?.message?.content
      if (!result) {
        throw new Error('No response from OpenAI for review analysis')
      }

      const reviewData = JSON.parse(result)
      
      return {
        overallSentiment: this.validateSentiment(reviewData.overallSentiment),
        sentimentScore: this.validateScore(reviewData.sentimentScore),
        keyThemes: Array.isArray(reviewData.keyThemes) ? reviewData.keyThemes : [],
        commonComplaints: Array.isArray(reviewData.commonComplaints) ? reviewData.commonComplaints : [],
        commonPraises: Array.isArray(reviewData.commonPraises) ? reviewData.commonPraises : [],
        authenticityScore: this.validateScore(reviewData.authenticityScore),
        reviewQuality: this.validateScore(reviewData.reviewQuality),
        summary: reviewData.summary || 'No review summary available',
        recommendations: Array.isArray(reviewData.recommendations) ? reviewData.recommendations : []
      }

    } catch (error) {
      console.error('[AI Review Analysis] Error:', error)
      return this.generateFallbackReviewAnalysis(reviews)
    }
  }

  /**
   * Análisis de comparación entre productos
   */
  async compareProducts(products: ProductInput[]): Promise<{
    bestValue: ProductInput
    mostTrusted: ProductInput
    riskRanking: Array<{ product: ProductInput, riskLevel: 'low' | 'medium' | 'high' }>
    recommendations: string[]
    summary: string
  }> {
    try {
      const analyses = await Promise.all(
        products.map(product => this.analyzeProduct(product))
      )

      const productsWithAnalysis = products.map((product, index) => ({
        product,
        analysis: analyses[index]
      }))

      // Encontrar el mejor valor (balance entre precio y trust score)
      const bestValue = productsWithAnalysis.reduce((best, current) => {
        const bestValueScore = best.analysis.trustScore / best.product.price
        const currentValueScore = current.analysis.trustScore / current.product.price
        return currentValueScore > bestValueScore ? current : best
      }).product

      // Encontrar el más confiable
      const mostTrusted = productsWithAnalysis.reduce((best, current) => {
        return current.analysis.trustScore > best.analysis.trustScore ? current : best
      }).product

      // Ranking de riesgo
      const riskRanking = productsWithAnalysis
        .map(({ product, analysis }) => ({
          product,
          riskLevel: analysis.riskAssessment.level
        }))
        .sort((a, b) => {
          const riskOrder = { low: 1, medium: 2, high: 3 }
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
        })

      return {
        bestValue,
        mostTrusted,
        riskRanking,
        recommendations: [
          `Best value: ${bestValue.title} offers the best balance of quality and price`,
          `Most trusted: ${mostTrusted.title} has the highest trust score`,
          'Consider reading recent reviews before making a purchase',
          'Check shipping policies and return guarantees'
        ],
        summary: `Analyzed ${products.length} products. ${bestValue.title} offers the best value, while ${mostTrusted.title} is the most trusted option.`
      }

    } catch (error) {
      console.error('[AI Product Comparison] Error:', error)
      throw new Error('Failed to compare products')
    }
  }

  /**
   * Construir prompt para análisis de producto
   */
  private buildAnalysisPrompt(product: ProductInput): string {
    return `
Analyze this e-commerce product and provide a comprehensive trust and quality assessment:

Product Information:
- Title: ${product.title}
- Price: ${product.price} ${product.currency}
- Platform: ${product.platform}
- Vendor: ${product.vendorName}
- Vendor Rating: ${product.vendorRating}/5
- Total Sales: ${product.totalSales}
- Image URL: ${product.imageUrl}

Please provide analysis in the following JSON format:
{
  "trustScore": <number 0-100>,
  "trustFactors": {
    "vendorReliability": <number 0-100>,
    "priceConsistency": <number 0-100>,
    "productQuality": <number 0-100>,
    "customerSatisfaction": <number 0-100>,
    "shippingReliability": <number 0-100>
  },
  "riskAssessment": {
    "level": "<low|medium|high>",
    "factors": ["<risk factor 1>", "<risk factor 2>"],
    "recommendations": ["<recommendation 1>", "<recommendation 2>"]
  },
  "qualityIndicators": {
    "imageQuality": <number 0-100>,
    "descriptionQuality": <number 0-100>,
    "brandAuthenticity": <number 0-100>,
    "customerReviews": <number 0-100>
  },
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "warnings": ["<warning 1>", "<warning 2>"],
  "summary": "<brief summary of analysis>",
  "confidence": <number 0-100>
}

Focus on:
1. Platform-specific trust indicators
2. Vendor reliability patterns
3. Price analysis relative to Chilean market (CLP pricing, local retailers)
4. Product quality assessment
5. Potential risks and red flags

Chilean Market Context:
- Major trusted retailers: Falabella, Ripley, Paris, Lider, MercadoLibre Chile
- Typical shipping: 2-7 days for Santiago, 3-10 days for regions
- Consumer protection: SERNAC regulations apply
- Currency: Chilean Peso (CLP) - consider price ranges typical for Chile
- Import considerations: Products may have import duties
- Local preferences: Chileans prefer established retailers with local presence
`
  }

  /**
   * Construir prompt para análisis de reviews
   */
  private buildReviewAnalysisPrompt(reviews: Array<{ rating: number, comment: string, date: string, helpful: number }>): string {
    const reviewsText = reviews.slice(0, 20).map(review => 
      `Rating: ${review.rating}/5, Comment: "${review.comment}", Date: ${review.date}, Helpful: ${review.helpful}`
    ).join('\n')

    return `
Analyze these customer reviews and provide insights:

Reviews:
${reviewsText}

Provide analysis in JSON format:
{
  "overallSentiment": "<positive|negative|neutral>",
  "sentimentScore": <number 0-100>,
  "keyThemes": ["<theme 1>", "<theme 2>"],
  "commonComplaints": ["<complaint 1>", "<complaint 2>"],
  "commonPraises": ["<praise 1>", "<praise 2>"],
  "authenticityScore": <number 0-100>,
  "reviewQuality": <number 0-100>,
  "summary": "<brief summary>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}
`
  }

  /**
   * Validar y normalizar scores
   */
  private validateScore(score: any): number {
    const num = Number(score)
    if (isNaN(num)) return 50
    return Math.max(0, Math.min(100, num))
  }

  /**
   * Validar nivel de riesgo
   */
  private validateRiskLevel(level: any): 'low' | 'medium' | 'high' {
    if (level === 'low' || level === 'medium' || level === 'high') {
      return level
    }
    return 'medium'
  }

  /**
   * Validar sentimiento
   */
  private validateSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' {
    if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
      return sentiment
    }
    return 'neutral'
  }

  /**
   * Generar análisis de fallback
   */
  private generateFallbackAnalysis(product: ProductInput, analysisTime: number): ProductAnalysis {
    const baseScore = Math.min(85, product.vendorRating * 20)
    
    return {
      trustScore: baseScore,
      trustFactors: {
        vendorReliability: baseScore,
        priceConsistency: 70,
        productQuality: 65,
        customerSatisfaction: baseScore,
        shippingReliability: 60
      },
      riskAssessment: {
        level: baseScore > 80 ? 'low' : baseScore > 60 ? 'medium' : 'high',
        factors: ['Limited analysis available'],
        recommendations: ['Read recent reviews', 'Check return policy']
      },
      qualityIndicators: {
        imageQuality: 70,
        descriptionQuality: 65,
        brandAuthenticity: 60,
        customerReviews: baseScore
      },
      recommendations: ['Basic analysis only', 'Consider additional research'],
      warnings: ['AI analysis not available'],
      summary: 'Basic analysis based on vendor metrics',
      confidence: 60,
      analysisTime
    }
  }

  /**
   * Generar análisis de reviews vacío
   */
  private generateEmptyReviewAnalysis(): ReviewAnalysis {
    return {
      overallSentiment: 'neutral',
      sentimentScore: 50,
      keyThemes: [],
      commonComplaints: [],
      commonPraises: [],
      authenticityScore: 50,
      reviewQuality: 0,
      summary: 'No reviews available for analysis',
      recommendations: ['Look for products with customer reviews']
    }
  }

  /**
   * Generar análisis de reviews de fallback
   */
  private generateFallbackReviewAnalysis(reviews: Array<{ rating: number, comment: string, date: string, helpful: number }>): ReviewAnalysis {
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    
    return {
      overallSentiment: avgRating > 3.5 ? 'positive' : avgRating < 2.5 ? 'negative' : 'neutral',
      sentimentScore: avgRating * 20,
      keyThemes: ['Basic analysis'],
      commonComplaints: [],
      commonPraises: [],
      authenticityScore: 70,
      reviewQuality: 60,
      summary: `Basic analysis of ${reviews.length} reviews with average rating ${avgRating.toFixed(1)}`,
      recommendations: ['AI analysis not available']
    }
  }
}

// Singleton
let productAnalyzer: ProductAnalyzer | null = null

export function getProductAnalyzer(): ProductAnalyzer {
  if (!productAnalyzer) {
    productAnalyzer = new ProductAnalyzer()
  }
  return productAnalyzer
}