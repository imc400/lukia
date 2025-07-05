import { Product, Vendor, Review, Platform } from '@prisma/client'

// Tipos extendidos para el frontend
export interface ProductWithVendor extends Product {
  vendor?: Vendor | null
  reviews: Review[]
  reviewsSummary?: {
    averageRating: number
    totalReviews: number
    positiveCount: number
    negativeCount: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }
}

export interface VendorWithStats extends Vendor {
  products: Product[]
  stats?: {
    totalProducts: number
    averageRating: number
    totalReviews: number
  }
}

export interface SearchParams {
  query: string
  platform?: Platform | 'all'
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sortBy?: 'price' | 'rating' | 'trustScore' | 'relevance'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  products: ProductWithVendor[]
  totalCount: number
  page: number
  pageSize: number
  filters: {
    platforms: Platform[]
    priceRange: { min: number; max: number }
    ratingRange: { min: number; max: number }
  }
}

export interface TrustScoreData {
  score: number
  factors: {
    vendorRating: number
    salesCount: number
    reviewQuality: number
    responseTime: number
    yearsActive: number
  }
  explanation: string
}

export interface AIAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  summary: string
  keyPoints: string[]
  isFakeDetected: boolean
  fakeConfidence?: number
}

export interface ScrapingResult {
  success: boolean
  products: Partial<Product>[]
  errors: string[]
  platform: Platform
  totalFound: number
  processingTime: number
}

export { Platform } from '@prisma/client'