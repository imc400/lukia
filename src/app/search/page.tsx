'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Header } from '@/components/Header'
import { ProductCard } from '@/components/ProductCard'
import { SearchSummary } from '@/components/SearchSummary'
import { formatPrice, getPlatformName, getPlatformColor } from '@/utils'
import { useAIPolling } from '@/hooks/useAIPolling'

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

  useEffect(() => {
    const resultsParam = searchParams.get('results')
    const query = searchParams.get('q')
    const platform = searchParams.get('platform')
    
    if (resultsParam) {
      try {
        const data = JSON.parse(resultsParam)
        setSearchResult(data)
      } catch (err) {
        setError('Error al cargar los resultados')
      }
    } else if (query) {
      // Búsqueda directa si no hay resultados en parámetros
      performSearch(query, platform || 'all')
    } else {
      setError('No se encontraron parámetros de búsqueda')
    }
    
    setIsLoading(false)
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
        body: JSON.stringify({ query, platform }),
      })

      const data = await response.json()
      
      if (data.success) {
        setSearchResult(data)
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