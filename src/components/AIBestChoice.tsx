import Image from 'next/image'
import { formatPrice } from '@/utils'

interface BestChoiceProps {
  product: {
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
  }
  reasons: string[]
  marketInsights: {
    priceRange: { min: number, max: number, average: number }
    topVendors: string[]
  }
}

export function AIBestChoice({ product, reasons, marketInsights }: BestChoiceProps) {
  const handleBuyClick = () => {
    window.open(product.productUrl, '_blank', 'noopener,noreferrer')
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const riskText = {
    low: 'Bajo Riesgo',
    medium: 'Riesgo Medio', 
    high: 'Alto Riesgo'
  }

  const savings = product.price < marketInsights.priceRange.average 
    ? Math.round(((marketInsights.priceRange.average - product.price) / marketInsights.priceRange.average) * 100)
    : null

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-6 mb-8 shadow-lg">
      {/* Header con badge de recomendación */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏆 #1 RECOMENDADO POR IA</h2>
            <p className="text-sm text-gray-600">Mejor opción basada en análisis real de datos</p>
          </div>
        </div>
        
        {savings && (
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            -{savings}% vs promedio
          </div>
        )}
      </div>

      {/* Producto principal */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Imagen y básicos */}
        <div className="space-y-4">
          <div className="relative">
            <Image
              src={product.imageUrl}
              alt={product.title}
              width={300}
              height={200}
              className="w-full h-48 object-cover rounded-lg"
              unoptimized={true}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://via.placeholder.com/300x200/e5e7eb/9ca3af?text=Sin+Imagen'
              }}
            />
            {product.aiAnalysis && (
              <div className="absolute top-2 right-2">
                <div className={`px-2 py-1 rounded-full text-xs font-bold border ${getTrustScoreColor(product.aiAnalysis.trustScore)}`}>
                  {product.aiAnalysis.trustScore}/100
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{product.title}</h3>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(product.price, product.currency)}
            </div>
            
            {/* Vendor info */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">{product.vendorName}</span>
              {product.vendorRating > 0 && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">{product.vendorRating}/5</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Análisis AI */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            ¿Por qué es la mejor opción?
          </h4>
          
          <div className="space-y-2">
            {reasons.map((reason, index) => (
              <div key={index} className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">{reason}</span>
              </div>
            ))}
          </div>

          {/* Risk assessment */}
          {product.aiAnalysis && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Nivel de Riesgo:</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskBadge(product.aiAnalysis.riskLevel)}`}>
                  {riskText[product.aiAnalysis.riskLevel]}
                </div>
              </div>
              
              {product.aiAnalysis.confidence && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-gray-700">Confianza IA:</span>
                  <span className="text-sm font-bold text-blue-600">{product.aiAnalysis.confidence}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleBuyClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>COMPRAR AHORA</span>
          </button>
          
          <button
            onClick={handleBuyClick}
            className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Ver Detalles
          </button>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            {product.rating > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{product.rating}/5</div>
                <div className="text-xs text-gray-600">Rating</div>
              </div>
            )}
            
            {product.reviewCount > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{product.reviewCount}</div>
                <div className="text-xs text-gray-600">Reviews</div>
              </div>
            )}
            
            {product.aiAnalysis && (
              <div className="text-center col-span-2">
                <div className="text-lg font-bold text-blue-600">{product.aiAnalysis.trustScore}/100</div>
                <div className="text-xs text-gray-600">Trust Score IA</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings si existen */}
      {product.aiAnalysis?.warnings && product.aiAnalysis.warnings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="font-medium text-yellow-800 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Consideraciones:
          </h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            {product.aiAnalysis.warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}