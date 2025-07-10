import { getPlatformName } from '@/utils'

interface SearchSummaryProps {
  query: string
  totalResults: number
  aiAnalysis: {
    enabled: boolean
    status: string
    message: string
    isPolling?: boolean
    progressPercentage?: number
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
        <div className={`mt-4 p-4 border rounded-lg ${
          aiAnalysis.status === 'completed' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {aiAnalysis.status === 'completed' ? (
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className={`text-sm font-medium ${
                aiAnalysis.status === 'completed' ? 'text-green-700' : 'text-blue-700'
              }`}>
                {aiAnalysis.status === 'completed' ? '🎉 Análisis IA Completado' : '🤖 Analizando con IA...'}
              </span>
            </div>
            {aiAnalysis.isPolling && (
              <span className="text-xs text-blue-600">
                {Math.round(aiAnalysis.progressPercentage || 0)}%
              </span>
            )}
          </div>
          
          {aiAnalysis.isPolling && aiAnalysis.progressPercentage && (
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${aiAnalysis.progressPercentage}%` }}
              ></div>
            </div>
          )}
          
          <p className={`text-sm ${
            aiAnalysis.status === 'completed' ? 'text-green-600' : 'text-blue-600'
          }`}>
            {aiAnalysis.message}
          </p>
          
          {aiAnalysis.status === 'completed' && (
            <div className="mt-2 text-xs text-green-600">
              ✨ Los productos ahora están ordenados por confiabilidad y muestran análisis detallado
            </div>
          )}
        </div>
      )}
    </div>
  )
}