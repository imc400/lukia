'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SearchForm() {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('all')
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: query.trim(), 
          platform,
          maxResults: 20
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Redirigir a página de resultados con los datos
        const searchParams = new URLSearchParams({
          q: query.trim(),
          platform,
          results: JSON.stringify(data)
        })
        router.push(`/search?${searchParams.toString()}`)
      } else {
        console.error('Error en búsqueda:', data.error)
        alert('Error al buscar productos. Por favor, intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error de red:', error)
      alert('Error de conexión. Por favor, intenta nuevamente.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="¿Qué producto estás buscando?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="sm:w-48">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todas las plataformas</option>
              <option value="aliexpress">AliExpress</option>
              <option value="shein">SHEIN</option>
              <option value="temu">Temu</option>
            </select>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="w-full sm:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isSearching ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar con IA</span>
            </>
          )}
        </button>
      </form>
      
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-gray-500">Búsquedas populares:</span>
        {['iPhone case', 'Wireless earbuds', 'Laptop stand', 'Phone charger'].map((term) => (
          <button
            key={term}
            onClick={() => setQuery(term)}
            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}