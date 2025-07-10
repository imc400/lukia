'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Header } from '@/components/Header'
import { ProductCard } from '@/components/ProductCard'
import { SearchSummary } from '@/components/SearchSummary'
import { AIRecommendations } from '@/components/AIRecommendations'
import { AIBestChoice } from '@/components/AIBestChoice'
import { AIVendorAnalysis } from '@/components/AIVendorAnalysis'
import { AIComparison } from '@/components/AIComparison'
import { formatPrice, getPlatformName, getPlatformColor } from '@/utils'
import { useAIPolling } from '@/hooks/useAIPolling'
import { useAIDecision } from '@/hooks/useAIDecision'

interface SearchResult {
  success: boolean
  query: string
  totalResults: number
  products: any[]
  aiAnalysis: {
    enabled: boolean
    status: string
    message: string
  }
  timestamp: string
}

function SearchContent() {
  const searchParams = useSearchParams()
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Hook de polling para AI analysis
  const { aiResult, isPolling, progressPercentage } = useAIPolling({
    query: searchResult?.query || '',
    enabled: !!(searchResult?.aiAnalysis?.enabled && searchResult?.query),
    interval: 3000
  })

  // Hook para AI Decision Engine
  const { decisionResult, isPolling: isDecisionPolling } = useAIDecision({
    query: searchResult?.query || '',
    enabled: !!(searchResult?.aiAnalysis?.enabled && searchResult?.query),
    interval: 4000
  })

  useEffect(() => {
    const query = searchParams.get('q')
    const platform = searchParams.get('platform')
    
    // Primero intentar cargar desde sessionStorage
    const cachedResults = sessionStorage.getItem('searchResults')
    
    if (cachedResults && query) {
      try {
        const data = JSON.parse(cachedResults)
        // Verificar que los resultados coincidan con la query actual
        if (data.query === query) {
          setSearchResult(data)
          setIsLoading(false)
          return
        }
      } catch (err) {
        console.error('Error parsing cached results:', err)
      }
    }
    
    // Si no hay cache válido y hay query, hacer búsqueda nueva
    if (query) {
      performSearch(query, platform || 'all')
    } else {
      setError('No se encontraron parámetros de búsqueda')
      setIsLoading(false)
    }
  }, [searchParams])

  // Actualizar productos cuando AI analysis esté completo
  useEffect(() => {
    if (aiResult?.status === 'completed' && aiResult.data?.products && searchResult) {
      console.log('[AI Polling] Updating products with AI analysis')
      
      const updatedProducts = searchResult.products.map(product => {
        const aiProduct = aiResult.data!.products.find(p => p.title === product.title)
        if (aiProduct?.aiAnalysis) {
          return {
            ...product,
            aiAnalysis: aiProduct.aiAnalysis
          }
        }
        return product
      })
      
      // Ordenar por trust score si hay análisis AI
      const sortedProducts = updatedProducts.sort((a, b) => {
        const scoreA = a.aiAnalysis?.trustScore ?? 0
        const scoreB = b.aiAnalysis?.trustScore ?? 0
        return scoreB - scoreA
      })
      
      setSearchResult(prev => prev ? {
        ...prev,
        products: sortedProducts,
        aiAnalysis: {
          ...prev.aiAnalysis,
          status: 'completed',
          message: `Análisis completado: ${aiResult.data!.totalAnalyzed} productos analizados`
        }
      } : null)
    }
  }, [aiResult, searchResult])

  const performSearch = async (query: string, platform: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query, 
          platform, 
          maxResults: 50,
          includeAI: true 
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setSearchResult(data)
        // Guardar en sessionStorage para futuras navegaciones
        sessionStorage.setItem('searchResults', JSON.stringify(data))
      } else {
        setError(data.error || 'Error en la búsqueda')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto">
          <Header />
          <div className="py-16 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Buscando productos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto">
          <Header />
          <div className="py-16 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error en la búsqueda</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!searchResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto">
          <Header />
          <div className="py-16 text-center">
            <p className="text-gray-600">No se encontraron resultados</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <SearchSummary 
        query={searchResult.query}
        totalResults={searchResult.totalResults}
        aiAnalysis={{
          ...searchResult.aiAnalysis,
          isPolling,
          progressPercentage: isPolling ? progressPercentage : 100
        }}
      />

      {/* AI RECOMMENDATION - Mostrar inmediatamente con el mejor producto disponible */}
      {searchResult.products.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center mb-4">
            <div className="bg-white/20 p-2 rounded-full mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">🤖 RECOMENDACIÓN AI</h2>
              <p className="text-blue-100">Basado en análisis de {searchResult.products.length} productos reales</p>
            </div>
          </div>
          
          {(() => {
            // Calcular mejor opción inmediatamente con algoritmo simple
            const bestProduct = searchResult.products
              .filter(p => p.price && p.vendorName && p.vendorName !== 'Unknown')
              .sort((a, b) => {
                const scoreA = (a.aiAnalysis?.trustScore || 0) + (a.rating || 0) * 10 + (a.vendorRating || 0) * 5
                const scoreB = (b.aiAnalysis?.trustScore || 0) + (b.rating || 0) * 10 + (b.vendorRating || 0) * 5
                return scoreB - scoreA
              })[0]
            
            if (!bestProduct) return <p>Analizando opciones...</p>
            
            const reasons = [
              bestProduct.aiAnalysis?.trustScore >= 80 ? `Alta confiabilidad (${bestProduct.aiAnalysis.trustScore}/100)` : 'Producto verificado',
              bestProduct.vendorRating >= 4 ? `Vendedor confiable (${bestProduct.vendorRating}/5★)` : `Vendedor: ${bestProduct.vendorName}`,
              bestProduct.rating >= 4 ? `Excelente calificación (${bestProduct.rating}/5★)` : 'Producto bien valorado',
              bestProduct.price ? `Precio competitivo: ${formatPrice(bestProduct.price, bestProduct.currency)}` : 'Precio verificado'
            ]
            
            return (
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <img 
                    src={bestProduct.imageUrl} 
                    alt={bestProduct.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">{bestProduct.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                          {reason}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{formatPrice(bestProduct.price, bestProduct.currency)}</span>
                      <span className="text-blue-100">por {bestProduct.vendorName}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ALTERNATIVES AI - Categorías inteligentes */}
      {searchResult.products.length > 3 && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            Alternativas AI por Categoría
          </h2>
          
          {(() => {
            const validProducts = searchResult.products.filter(p => p.price && p.vendorName !== 'Unknown')
            const prices = validProducts.map(p => p.price).sort((a, b) => a - b)
            const q1 = prices[Math.floor(prices.length * 0.33)]
            const q3 = prices[Math.floor(prices.length * 0.67)]
            
            const budget = validProducts.filter(p => p.price <= q1).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
            const premium = validProducts.filter(p => p.price > q3).sort((a, b) => (b.aiAnalysis?.trustScore || 0) - (a.aiAnalysis?.trustScore || 0))[0]
            const balanced = validProducts.filter(p => p.price > q1 && p.price <= q3).sort((a, b) => {
              const scoreA = (a.aiAnalysis?.trustScore || 0) + (a.rating || 0) * 20
              const scoreB = (b.aiAnalysis?.trustScore || 0) + (b.rating || 0) * 20
              return scoreB - scoreA
            })[0]
            
            // Obtener múltiples opciones por categoría
            const budgetOptions = validProducts.filter(p => p.price <= q1).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 2)
            const premiumOptions = validProducts.filter(p => p.price > q3).sort((a, b) => (b.aiAnalysis?.trustScore || 0) - (a.aiAnalysis?.trustScore || 0)).slice(0, 2)
            const balancedOptions = validProducts.filter(p => p.price > q1 && p.price <= q3).sort((a, b) => {
              const scoreA = (a.aiAnalysis?.trustScore || 0) + (a.rating || 0) * 20
              const scoreB = (b.aiAnalysis?.trustScore || 0) + (b.rating || 0) * 20
              return scoreB - scoreA
            }).slice(0, 2)
            
            const alternatives = [
              ...budgetOptions.map(p => ({ product: p, category: 'Económica', color: 'green', icon: '💰' })),
              ...balancedOptions.map(p => ({ product: p, category: 'Equilibrada', color: 'blue', icon: '⚖️' })),
              ...premiumOptions.map(p => ({ product: p, category: 'Premium', color: 'purple', icon: '✨' }))
            ].filter(alt => alt.product)
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {alternatives.map((alt, idx) => (
                  <div key={idx} className={`border border-${alt.color}-200 bg-${alt.color}-50 rounded-lg p-4`}>
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-2">{alt.icon}</span>
                      <span className={`font-semibold text-${alt.color}-800`}>{alt.category}</span>
                    </div>
                    <div className="flex items-center space-x-3 mb-3">
                      <img 
                        src={alt.product.imageUrl} 
                        alt={alt.product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{alt.product.title}</h4>
                        <p className="text-xs text-gray-600">{alt.product.vendorName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">{formatPrice(alt.product.price, alt.product.currency)}</span>
                      {alt.product.rating && (
                        <span className="text-sm text-gray-600">{alt.product.rating}★</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* MARKET INSIGHTS AI - Datos del mercado */}
      {searchResult.products.length > 5 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            Análisis de Mercado AI
          </h2>
          
          {(() => {
            const validProducts = searchResult.products.filter(p => p.price && p.vendorName !== 'Unknown')
            const prices = validProducts.map(p => p.price)
            const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            const highTrustCount = validProducts.filter(p => p.aiAnalysis?.trustScore >= 80).length
            const lowRiskCount = validProducts.filter(p => p.aiAnalysis?.riskLevel === 'low').length
            const sponsoredCount = validProducts.filter(p => (p as any).isSponsored).length
            const organicCount = validProducts.length - sponsoredCount
            
            return (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatPrice(avgPrice, 'CLP')}</div>
                  <div className="text-sm text-gray-600">Precio Promedio</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(minPrice, 'CLP')}</div>
                  <div className="text-sm text-gray-600">Precio Mínimo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{highTrustCount}</div>
                  <div className="text-sm text-gray-600">Alta Confiabilidad</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{lowRiskCount}</div>
                  <div className="text-sm text-gray-600">Bajo Riesgo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{sponsoredCount}</div>
                  <div className="text-sm text-gray-600">Patrocinados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{organicCount}</div>
                  <div className="text-sm text-gray-600">Orgánicos</div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* AI Vendor Analysis - Mostrar para el vendedor de la mejor opción */}
      {decisionResult?.status === 'completed' && decisionResult.data?.bestChoice?.vendorAnalysis && (
        <AIVendorAnalysis 
          analysis={decisionResult.data.bestChoice.vendorAnalysis}
        />
      )}

      {/* AI Comparison - Mostrar alternativas */}
      {decisionResult?.status === 'completed' && 
       decisionResult.data?.bestChoice?.alternatives && 
       decisionResult.data.bestChoice.alternatives.length > 0 && (
        <AIComparison 
          alternatives={decisionResult.data.bestChoice.alternatives}
          marketInsights={decisionResult.data.bestChoice.marketInsights}
        />
      )}
      
      <AIRecommendations 
        products={searchResult.products}
        analysisCompleted={aiResult?.status === 'completed'}
      />
      
      {searchResult.products.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {searchResult.products.map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
          <p className="text-gray-600">Intenta con otros términos de búsqueda</p>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
        <Header />
        
        <Suspense fallback={
          <div className="py-16 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando búsqueda...</p>
          </div>
        }>
          <SearchContent />
        </Suspense>
      </div>
    </div>
  )
}