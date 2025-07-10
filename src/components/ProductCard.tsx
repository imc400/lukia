import Image from 'next/image'
import { formatPrice, getPlatformName, getPlatformColor, getTrustScoreColor, getTrustScoreLabel, truncateText } from '@/utils'

interface ProductCardProps {
  product: {
    title: string
    price: number
    currency: string
    imageUrl: string
    productUrl: string
    platform: string
    vendorName?: string
    vendorRating?: number
    totalSales?: number
    trustScore?: number
    aiAnalysis?: {
      status: 'processing' | 'completed' | 'failed'
      trustScore: number
      riskLevel: 'low' | 'medium' | 'high'
      recommendations: string[]
      warnings: string[]
      summary: string
      confidence: number
      completedAt?: string
    }
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const handleClick = () => {
    window.open(product.productUrl, '_blank', 'noopener,noreferrer')
  }

  // Usar AI trust score si está disponible, sino fallback a rating del vendor
  const trustScore = product.aiAnalysis?.trustScore ?? 
                    product.trustScore ?? 
                    (product.vendorRating ? product.vendorRating * 20 : 70)
  
  const displayPrice = formatPrice(product.price, product.currency)
  
  // Determinar estado del análisis AI
  const aiStatus = product.aiAnalysis?.status || 'processing'
  const hasAIData = aiStatus === 'completed' && product.aiAnalysis
  
  // Función para obtener color del riesgo
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={handleClick}>
      <div className="relative">
        <Image
          src={product.imageUrl}
          alt={product.title}
          width={300}
          height={200}
          className="w-full h-48 object-cover"
          unoptimized={true}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://via.placeholder.com/300x200/e5e7eb/9ca3af?text=Sin+Imagen'
          }}
        />
        
        {/* AI BADGES - Prominentes en la imagen */}
        <div className="absolute top-2 left-2 space-y-1">
          {/* Badge de producto patrocinado */}
          {(product as any).isSponsored && (
            <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              📢 PATROCINADO
            </div>
          )}
          
          {/* AI Analysis badges */}
          {hasAIData && product.aiAnalysis && (
            <>
              {product.aiAnalysis.trustScore >= 90 && (
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                  🏆 TOP AI
                </div>
              )}
              {product.aiAnalysis.trustScore >= 80 && product.aiAnalysis.trustScore < 90 && (
                <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                  ⭐ RECOMENDADO
                </div>
              )}
              {product.aiAnalysis.riskLevel === 'low' && (
                <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                  ✅ SEGURO
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Descuento badge */}
        {(product as any).originalPrice && (product as any).originalPrice > product.price && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            -{Math.round((((product as any).originalPrice - product.price) / (product as any).originalPrice) * 100)}%
          </div>
        )}
        
        {/* Platform badge en la esquina inferior derecha */}
        <div className="absolute bottom-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(product.platform as any)}`}>
            {getPlatformName(product.platform as any)}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {truncateText(product.title, 80)}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-gray-900">
            {displayPrice}
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${getTrustScoreColor(trustScore)}`}>
              {trustScore.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500">
              {getTrustScoreLabel(trustScore)}
            </span>
          </div>
        </div>
        
        {product.vendorName && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="truncate">{product.vendorName}</span>
            <div className="flex items-center space-x-2">
              {product.vendorRating && product.vendorRating > 0 && (
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs">{product.vendorRating.toFixed(1)}</span>
                </div>
              )}
              {product.totalSales && product.totalSales > 0 && (
                <span className="text-xs text-gray-500">
                  {product.totalSales}+ ventas
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* PRECIO - Lo más importante para el usuario */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            {product.price && (
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(product.price, product.currency)}
                </span>
                {(product as any).originalPrice && (product as any).originalPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice((product as any).originalPrice, product.currency)}
                  </span>
                )}
              </div>
            )}
            {(product as any).originalPrice && (product as any).originalPrice > product.price && (
              <div className="text-xs text-green-600 font-medium">
                {Math.round((((product as any).originalPrice - product.price) / (product as any).originalPrice) * 100)}% descuento
              </div>
            )}
          </div>
          
          {/* Rating del producto */}
          {(product as any).rating && (product as any).rating > 0 && (
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium">{(product as any).rating}</span>
              {(product as any).reviewCount && (product as any).reviewCount > 0 && (
                <span className="text-xs text-gray-500">({(product as any).reviewCount})</span>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          {hasAIData && product.aiAnalysis ? (
            // Análisis IA Completado
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-900">Análisis IA Completado</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(product.aiAnalysis.riskLevel)}`}>
                  {product.aiAnalysis.riskLevel === 'low' ? 'Bajo Riesgo' : 
                   product.aiAnalysis.riskLevel === 'medium' ? 'Riesgo Medio' : 'Alto Riesgo'}
                </div>
              </div>
              
              {product.aiAnalysis.recommendations.length > 0 && (
                <div className="text-xs text-gray-600">
                  <strong>💡 Recomendación:</strong> {product.aiAnalysis.recommendations[0]}
                </div>
              )}
              
              {product.aiAnalysis.warnings.length > 0 && (
                <div className="text-xs text-red-600">
                  <strong>⚠️ Advertencia:</strong> {product.aiAnalysis.warnings[0]}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Confianza: {product.aiAnalysis.confidence}% • Trust Score: {product.aiAnalysis.trustScore}/100
              </div>
            </div>
          ) : aiStatus === 'processing' ? (
            // Análisis en Progreso
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs text-blue-600">Analizando con IA...</span>
              </div>
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          ) : (
            // Análisis Fallido
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-gray-500">Análisis básico</span>
              </div>
              <span className="text-xs text-gray-400">Score: {trustScore.toFixed(0)}/100</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}