import { getPlatformName } from '@/utils'

interface SearchSummaryProps {
  query: string
  totalResults: number
  aiAnalysis: {
    enabled: boolean
    status: string
    message: string
  }
}

export function SearchSummary({ query, totalResults, aiAnalysis }: SearchSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Resultados para "{query}"
        </h1>
        <div className="text-sm text-gray-500">
          {totalResults} productos encontrados
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{totalResults}</div>
          <div className="text-sm text-green-700">Productos Encontrados</div>
        </div>
        
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">Google Shopping</div>
          <div className="text-sm text-blue-700">Fuente Principal</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {aiAnalysis.enabled ? '🤖' : '📋'}
          </div>
          <div className="text-sm text-purple-700">
            {aiAnalysis.enabled ? 'AI Activado' : 'Búsqueda Básica'}
          </div>
        </div>
      </div>
      
      {aiAnalysis.enabled && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-blue-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm text-blue-700">
              {aiAnalysis.message}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}