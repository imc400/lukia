import Image from 'next/image'
import { formatPrice } from '@/utils'

interface ComparisonProps {
  alternatives: Array<{
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
        confidence: number
      }
    }
    category: 'budget' | 'premium' | 'balanced'
    reason: string
  }>
  marketInsights: {
    priceRange: { min: number, max: number, average: number }
    topVendors: string[]
  }
}

export function AIComparison({ alternatives, marketInsights }: ComparisonProps) {
  if (alternatives.length === 0) return null

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'budget':
        return {
          icon: '💰',
          label: 'MEJOR PRECIO',
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'premium':
        return {
          icon: '⭐',
          label: 'PREMIUM',
          color: 'bg-purple-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        }
      case 'balanced':
        return {
          icon: '⚖️',
          label: 'EQUILIBRADO',
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      default:
        return {
          icon: '🔄',
          label: 'ALTERNATIVA',
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const handleProductClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">🔄 ALTERNATIVAS INTELIGENTES</h3>
          <p className="text-sm text-gray-600">Comparación basada en análisis real de datos</p>
        </div>
      </div>

      {/* Tabla de comparación */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                {alternatives.map((alt, index) => {
                  const config = getCategoryConfig(alt.category)
                  return (
                    <th key={index} className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center space-y-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white ${config.color}`}>
                          {config.icon} {config.label}
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Imagen y título */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Producto
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    <div className="space-y-3">
                      <Image
                        src={alt.product.imageUrl}
                        alt={alt.product.title}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                        unoptimized={true}
                        onClick={() => handleProductClick(alt.product.productUrl)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://via.placeholder.com/80x80/e5e7eb/9ca3af?text=Sin+Imagen'
                        }}
                      />
                      <div className="text-xs text-gray-700 line-clamp-2 h-8">
                        {alt.product.title.length > 50 
                          ? `${alt.product.title.substring(0, 50)}...` 
                          : alt.product.title
                        }
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Precio */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Precio
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {formatPrice(alt.product.price, alt.product.currency)}
                    </div>
                    {/* Indicador vs promedio */}
                    {alt.product.price < marketInsights.priceRange.average && (
                      <div className="text-xs text-green-600 font-medium">
                        -{Math.round(((marketInsights.priceRange.average - alt.product.price) / marketInsights.priceRange.average) * 100)}% vs promedio
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Trust Score */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Trust Score IA
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    {alt.product.aiAnalysis ? (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-blue-600">
                          {alt.product.aiAnalysis.trustScore}/100
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          alt.product.aiAnalysis.trustScore >= 80 
                            ? 'bg-green-100 text-green-800' 
                            : alt.product.aiAnalysis.trustScore >= 70
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {alt.product.aiAnalysis.trustScore >= 80 ? 'Alto' : 
                           alt.product.aiAnalysis.trustScore >= 70 ? 'Medio' : 'Bajo'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Analizando...</div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Vendedor */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Vendedor
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {alt.product.vendorName.length > 20 
                          ? `${alt.product.vendorName.substring(0, 20)}...` 
                          : alt.product.vendorName
                        }
                      </div>
                      {alt.product.vendorRating > 0 && (
                        <div className="flex items-center justify-center space-x-1">
                          <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs">{alt.product.vendorRating}/5</span>
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Rating del producto */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Rating Producto
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    {alt.product.rating > 0 ? (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-gray-900">
                          {alt.product.rating}/5
                        </div>
                        {alt.product.reviewCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {alt.product.reviewCount} reviews
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Sin rating</div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Razón IA */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  🧠 IA Dice
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4">
                    <div className="text-xs text-gray-700 text-center px-2">
                      {alt.reason}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Acciones */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Acción
                </td>
                {alternatives.map((alt, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleProductClick(alt.product.productUrl)}
                      className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 text-xs font-medium rounded transition-colors"
                    >
                      Ver Producto
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Market insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Insights del Mercado:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
          <div>
            <strong>Rango de Precios:</strong><br />
            Desde {formatPrice(marketInsights.priceRange.min, 'CLP')} hasta {formatPrice(marketInsights.priceRange.max, 'CLP')}
          </div>
          <div>
            <strong>Precio Promedio:</strong><br />
            {formatPrice(marketInsights.priceRange.average, 'CLP')}
          </div>
          <div>
            <strong>Top Vendedores:</strong><br />
            {marketInsights.topVendors.slice(0, 3).join(', ')}
          </div>
        </div>
      </div>
    </div>
  )
}