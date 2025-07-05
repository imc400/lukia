import { getPlatformName } from '@/utils'

interface SearchSummaryProps {
  query: string
  totalResults: number
  platforms: {
    successful: number
    failed: number
    total: number
  }
  results: Array<{
    platform: string
    success: boolean
    count: number
    errors: string[]
    processingTime: number
  }>
}

export function SearchSummary({ query, totalResults, platforms, results }: SearchSummaryProps) {
  const totalProcessingTime = results.reduce((sum, result) => sum + result.processingTime, 0)
  const avgProcessingTime = totalProcessingTime / results.length

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
          <div className="text-sm text-green-700">Productos Totales</div>
        </div>
        
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{platforms.successful}</div>
          <div className="text-sm text-blue-700">Plataformas Exitosas</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{avgProcessingTime.toFixed(0)}ms</div>
          <div className="text-sm text-gray-700">Tiempo Promedio</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Detalles por plataforma:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((result, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">
                  {getPlatformName(result.platform as any)}
                </span>
                <div className="flex items-center space-x-2">
                  {result.success ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div>Productos: {result.count}</div>
                <div>Tiempo: {result.processingTime}ms</div>
                {result.errors.length > 0 && (
                  <div className="text-red-600 text-xs">
                    {result.errors[0]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {platforms.failed > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-yellow-700">
              {platforms.failed} plataforma(s) no pudieron ser consultadas. Los resultados pueden estar incompletos.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}