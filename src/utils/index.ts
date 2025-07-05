import { Platform } from '@prisma/client'

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    ALIEXPRESS: 'AliExpress',
    SHEIN: 'SHEIN',
    TEMU: 'Temu',
    ALIBABA: 'Alibaba',
  }
  return names[platform] || platform
}

export function getPlatformColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    ALIEXPRESS: 'bg-orange-100 text-orange-800',
    SHEIN: 'bg-pink-100 text-pink-800',
    TEMU: 'bg-blue-100 text-blue-800',
    ALIBABA: 'bg-yellow-100 text-yellow-800',
  }
  return colors[platform] || 'bg-gray-100 text-gray-800'
}

export function getTrustScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600'
  if (score >= 6) return 'text-yellow-600'
  return 'text-red-600'
}

export function getTrustScoreLabel(score: number): string {
  if (score >= 8) return 'Muy Confiable'
  if (score >= 6) return 'Confiable'
  if (score >= 4) return 'Moderado'
  return 'Poco Confiable'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}