/**
 * AI Decision Engine - Identifica la mejor opción de compra basado en datos reales
 * Solo usa datos reales de Google Shopping API + AI analysis
 */

interface ProductWithAI {
  title: string
  price: number
  currency: string
  vendorName: string
  vendorRating: number
  rating: number
  reviewCount: number
  imageUrl: string
  productUrl: string
  aiAnalysis?: {
    trustScore: number
    riskLevel: 'low' | 'medium' | 'high'
    recommendations: string[]
    warnings: string[]
    confidence: number
  }
  reviews?: Array<{
    rating: number
    comment: string
    verified?: boolean
  }>
}

interface BestOptionAnalysis {
  bestProduct: ProductWithAI
  reasons: string[]
  alternatives: {
    product: ProductWithAI
    category: 'budget' | 'premium' | 'balanced'
    reason: string
  }[]
  marketInsights: {
    priceRange: { min: number, max: number, average: number }
    topVendors: string[]
    qualityTiers: {
      premium: ProductWithAI[]
      standard: ProductWithAI[]
      budget: ProductWithAI[]
    }
  }
}

interface VendorAnalysis {
  vendorName: string
  trustLevel: 'very-high' | 'high' | 'medium' | 'low'
  trustScore: number
  verifications: string[]
  concerns: string[]
  productCount: number
  averageRating: number
  isOfficial: boolean
  hasPhysicalPresence: boolean
}

export class AIDecisionEngine {
  
  /**
   * Analiza todos los productos y determina la mejor opción real
   */
  async findBestOption(products: ProductWithAI[]): Promise<BestOptionAnalysis> {
    // Solo procesar productos con datos mínimos reales
    const validProducts = products.filter(p => 
      p.title && 
      p.price > 0 && 
      p.vendorName &&
      p.vendorName !== 'Unknown' &&
      p.vendorName !== 'Online Store'
    )

    if (validProducts.length === 0) {
      throw new Error('No valid products found for analysis')
    }

    // Calcular insights del mercado con datos reales
    const marketInsights = this.calculateMarketInsights(validProducts)
    
    // Ranking de productos basado en datos reales
    const rankedProducts = this.rankProductsByRealData(validProducts)
    
    // Mejor producto es el #1 del ranking
    const bestProduct = rankedProducts[0]
    
    // Generar razones basadas en datos reales
    const reasons = this.generateRealReasons(bestProduct, validProducts, marketInsights)
    
    // Identificar alternativas reales
    const alternatives = this.identifyRealAlternatives(rankedProducts.slice(1, 4), marketInsights)

    return {
      bestProduct,
      reasons,
      alternatives,
      marketInsights
    }
  }

  /**
   * Analiza un vendedor específico basado en datos reales
   */
  analyzeVendor(vendorName: string, products: ProductWithAI[]): VendorAnalysis {
    const vendorProducts = products.filter(p => p.vendorName === vendorName)
    
    if (vendorProducts.length === 0) {
      throw new Error(`No products found for vendor: ${vendorName}`)
    }

    // Calcular métricas reales del vendedor
    const averageRating = vendorProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / vendorProducts.length
    const averageTrustScore = vendorProducts.reduce((sum, p) => sum + (p.aiAnalysis?.trustScore || 0), 0) / vendorProducts.length
    
    // Determinar si es vendedor oficial (basado en nombre real)
    const isOfficial = this.isOfficialVendor(vendorName)
    
    // Determinar presencia física en Chile (basado en datos reales)
    const hasPhysicalPresence = this.hasChileanPresence(vendorName)
    
    // Calcular nivel de confianza basado en datos reales
    const trustLevel = this.calculateTrustLevel(averageTrustScore, isOfficial, hasPhysicalPresence, averageRating)
    
    // Verificaciones reales basadas en datos
    const verifications = this.generateRealVerifications(vendorName, vendorProducts, isOfficial, hasPhysicalPresence)
    
    // Concerns basados en análisis real de productos
    const concerns = this.generateRealConcerns(vendorProducts)

    return {
      vendorName,
      trustLevel,
      trustScore: Math.round(averageTrustScore),
      verifications,
      concerns,
      productCount: vendorProducts.length,
      averageRating: Math.round(averageRating * 10) / 10,
      isOfficial,
      hasPhysicalPresence
    }
  }

  /**
   * Ranking basado únicamente en datos reales
   */
  private rankProductsByRealData(products: ProductWithAI[]): ProductWithAI[] {
    return products.sort((a, b) => {
      // Scoring basado en datos reales disponibles
      const scoreA = this.calculateRealScore(a)
      const scoreB = this.calculateRealScore(b)
      return scoreB - scoreA
    })
  }

  /**
   * Calcula score real basado en datos disponibles
   */
  private calculateRealScore(product: ProductWithAI): number {
    let score = 0

    // AI Trust Score (peso: 40%)
    if (product.aiAnalysis?.trustScore) {
      score += (product.aiAnalysis.trustScore / 100) * 40
    }

    // Vendor Rating real (peso: 25%)
    if (product.vendorRating > 0) {
      score += (product.vendorRating / 5) * 25
    }

    // Product Rating real (peso: 20%)
    if (product.rating > 0) {
      score += (product.rating / 5) * 20
    }

    // Review Count (peso: 10%)
    if (product.reviewCount > 0) {
      const reviewScore = Math.min(product.reviewCount / 100, 1) // Max score at 100+ reviews
      score += reviewScore * 10
    }

    // Vendor Bonus (peso: 5%)
    if (this.isOfficialVendor(product.vendorName)) {
      score += 5
    }

    return score
  }

  /**
   * Genera razones basadas en datos reales del producto
   */
  private generateRealReasons(bestProduct: ProductWithAI, allProducts: ProductWithAI[], market: any): string[] {
    const reasons: string[] = []

    // Razón basada en Trust Score real
    if (bestProduct.aiAnalysis?.trustScore) {
      const trustScore = bestProduct.aiAnalysis.trustScore
      if (trustScore >= 90) {
        reasons.push(`Máxima confiabilidad con ${trustScore}/100 puntos de trust score`)
      } else if (trustScore >= 80) {
        reasons.push(`Alta confiabilidad con ${trustScore}/100 puntos de trust score`)
      }
    }

    // Razón basada en vendedor real
    if (this.isOfficialVendor(bestProduct.vendorName)) {
      reasons.push(`Vendedor oficial verificado: ${bestProduct.vendorName}`)
    } else if (bestProduct.vendorRating >= 4.0) {
      reasons.push(`Vendedor confiable con ${bestProduct.vendorRating}/5 estrellas`)
    }

    // Razón basada en precio real vs mercado
    if (bestProduct.price < market.priceRange.average) {
      const savings = Math.round(((market.priceRange.average - bestProduct.price) / market.priceRange.average) * 100)
      reasons.push(`Precio ${savings}% bajo el promedio de mercado`)
    }

    // Razón basada en reviews reales
    if (bestProduct.reviewCount > 50) {
      reasons.push(`Respaldado por ${bestProduct.reviewCount} reviews de clientes`)
    }

    // Razón basada en rating real
    if (bestProduct.rating >= 4.5) {
      reasons.push(`Excelente calificación: ${bestProduct.rating}/5 estrellas`)
    }

    return reasons.slice(0, 4) // Máximo 4 razones
  }

  /**
   * Calcula insights reales del mercado
   */
  private calculateMarketInsights(products: ProductWithAI[]): any {
    const prices = products.map(p => p.price).filter(p => p > 0)
    const vendors = [...new Set(products.map(p => p.vendorName))]

    return {
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        average: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
      },
      topVendors: vendors.slice(0, 5),
      qualityTiers: this.categorizeProductsByPrice(products)
    }
  }

  /**
   * Categoriza productos por precio real
   */
  private categorizeProductsByPrice(products: ProductWithAI[]): any {
    const prices = products.map(p => p.price).sort((a, b) => a - b)
    const q1 = prices[Math.floor(prices.length * 0.33)]
    const q3 = prices[Math.floor(prices.length * 0.67)]

    return {
      budget: products.filter(p => p.price <= q1),
      standard: products.filter(p => p.price > q1 && p.price <= q3),
      premium: products.filter(p => p.price > q3)
    }
  }

  /**
   * Identifica alternativas reales
   */
  private identifyRealAlternatives(products: ProductWithAI[], market: any): any[] {
    const alternatives: any[] = []

    // Mejor opción económica real
    const budgetOptions = market.qualityTiers.budget.filter(p => p.rating >= 4.0)
    if (budgetOptions.length > 0) {
      const bestBudget = budgetOptions.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
      alternatives.push({
        product: bestBudget,
        category: 'budget' as const,
        reason: `Opción más económica con buena calidad: $${bestBudget.price.toLocaleString()}`
      })
    }

    // Mejor opción premium real
    const premiumOptions = market.qualityTiers.premium.filter(p => p.aiAnalysis?.trustScore >= 80)
    if (premiumOptions.length > 0) {
      const bestPremium = premiumOptions.sort((a, b) => (b.aiAnalysis?.trustScore || 0) - (a.aiAnalysis?.trustScore || 0))[0]
      alternatives.push({
        product: bestPremium,
        category: 'premium' as const,
        reason: `Opción premium con máxima calidad y confiabilidad`
      })
    }

    // Mejor balance real
    const balancedOptions = market.qualityTiers.standard.filter(p => 
      p.rating >= 4.0 && p.aiAnalysis?.trustScore >= 75
    )
    if (balancedOptions.length > 0) {
      const bestBalanced = balancedOptions.sort((a, b) => this.calculateRealScore(b) - this.calculateRealScore(a))[0]
      alternatives.push({
        product: bestBalanced,
        category: 'balanced' as const,
        reason: `Mejor balance precio-calidad del mercado`
      })
    }

    return alternatives.slice(0, 2) // Máximo 2 alternativas
  }

  /**
   * Determina si es vendedor oficial basado en nombre real
   */
  private isOfficialVendor(vendorName: string): boolean {
    const officialPatterns = [
      'nike', 'adidas', 'puma', 'reebok', 'under armour',
      'samsung', 'apple', 'lg', 'sony', 'huawei',
      'falabella', 'ripley', 'paris', 'lider', 'sodimac'
    ]
    
    const vendorLower = vendorName.toLowerCase()
    return officialPatterns.some(pattern => 
      vendorLower.includes(pattern) && 
      (vendorLower.includes('oficial') || vendorLower.includes('chile') || vendorLower.includes('.cl'))
    )
  }

  /**
   * Determina presencia física en Chile
   */
  private hasChileanPresence(vendorName: string): boolean {
    const chileanRetailers = [
      'falabella', 'ripley', 'paris', 'lider', 'sodimac', 'la polar', 'hites',
      'tricot', 'corona', 'easy', 'homecenter', 'walmart chile'
    ]
    
    const vendorLower = vendorName.toLowerCase()
    return chileanRetailers.some(retailer => vendorLower.includes(retailer)) ||
           vendorLower.includes('chile') ||
           vendorLower.includes('.cl')
  }

  /**
   * Calcula nivel de confianza basado en datos reales
   */
  private calculateTrustLevel(trustScore: number, isOfficial: boolean, hasPresence: boolean, rating: number): 'very-high' | 'high' | 'medium' | 'low' {
    if (trustScore >= 90 && isOfficial && hasPresence) return 'very-high'
    if (trustScore >= 80 && (isOfficial || hasPresence) && rating >= 4.0) return 'high'
    if (trustScore >= 70 && rating >= 3.5) return 'medium'
    return 'low'
  }

  /**
   * Genera verificaciones reales basadas en datos
   */
  private generateRealVerifications(vendorName: string, products: ProductWithAI[], isOfficial: boolean, hasPresence: boolean): string[] {
    const verifications: string[] = []

    if (isOfficial) {
      verifications.push('Vendedor oficial verificado')
    }

    if (hasPresence) {
      verifications.push('Presencia física en Chile')
    }

    const avgRating = products.reduce((sum, p) => sum + (p.vendorRating || 0), 0) / products.length
    if (avgRating >= 4.0) {
      verifications.push(`Rating promedio: ${avgRating.toFixed(1)}/5`)
    }

    const totalReviews = products.reduce((sum, p) => sum + (p.reviewCount || 0), 0)
    if (totalReviews > 100) {
      verifications.push(`${totalReviews}+ reviews de clientes`)
    }

    const highTrustProducts = products.filter(p => p.aiAnalysis?.trustScore >= 80).length
    if (highTrustProducts > 0) {
      verifications.push(`${highTrustProducts} productos con alta confiabilidad`)
    }

    return verifications
  }

  /**
   * Genera concerns reales basados en análisis
   */
  private generateRealConcerns(products: ProductWithAI[]): string[] {
    const concerns: string[] = []

    const lowTrustProducts = products.filter(p => p.aiAnalysis?.trustScore < 70).length
    if (lowTrustProducts > 0) {
      concerns.push(`${lowTrustProducts} productos con trust score bajo`)
    }

    const highRiskProducts = products.filter(p => p.aiAnalysis?.riskLevel === 'high').length
    if (highRiskProducts > 0) {
      concerns.push(`${highRiskProducts} productos con alto riesgo`)
    }

    const lowRatingProducts = products.filter(p => p.rating < 3.5).length
    if (lowRatingProducts > 0) {
      concerns.push(`${lowRatingProducts} productos con rating bajo`)
    }

    return concerns
  }
}

// Singleton para reutilizar instancia
let decisionEngineInstance: AIDecisionEngine | null = null

export function getDecisionEngine(): AIDecisionEngine {
  if (!decisionEngineInstance) {
    decisionEngineInstance = new AIDecisionEngine()
  }
  return decisionEngineInstance
}