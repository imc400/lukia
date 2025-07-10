interface AIRecommendationsProps {
  products: any[]
  analysisCompleted: boolean
}

export function AIRecommendations({ products, analysisCompleted }: AIRecommendationsProps) {
  if (!analysisCompleted) return null

  // Filtrar productos con AI analysis y ordenar por trust score
  const analyzedProducts = products
    .filter(p => p.aiAnalysis?.status === 'completed')
    .sort((a, b) => (b.aiAnalysis?.trustScore || 0) - (a.aiAnalysis?.trustScore || 0))

  if (analyzedProducts.length === 0) return null

  const topProduct = analyzedProducts[0]
  const highTrustProducts = analyzedProducts.filter(p => p.aiAnalysis?.trustScore >= 80)
  const lowRiskProducts = analyzedProducts.filter(p => p.aiAnalysis?.riskLevel === 'low')

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">🎯 Recomendaciones AI</h3>
          <p className="text-sm text-gray-600">Análisis inteligente de {analyzedProducts.length} productos</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Product */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="flex items-center mb-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <span className="font-semibold text-green-700">Mejor Opción</span>
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {topProduct.aiAnalysis.trustScore}/100
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{topProduct.title}</h4>
          <div className="text-lg font-bold text-gray-900 mb-2">
            {new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0,
            }).format(topProduct.price)}
          </div>
          {topProduct.aiAnalysis.recommendations.length > 0 && (
            <p className="text-sm text-gray-600">
              💡 {topProduct.aiAnalysis.recommendations[0]}
            </p>
          )}
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Alta Confiabilidad</span>
            </div>
            <span className="text-sm font-bold text-green-600">{highTrustProducts.length} productos</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Bajo Riesgo</span>
            </div>
            <span className="text-sm font-bold text-blue-600">{lowRiskProducts.length} productos</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Trust Score Promedio</span>
            </div>
            <span className="text-sm font-bold text-purple-600">
              {Math.round(analyzedProducts.reduce((sum, p) => sum + (p.aiAnalysis?.trustScore || 0), 0) / analyzedProducts.length)}/100
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>🤖 Análisis IA:</strong> Hemos evaluado factores como confiabilidad del vendedor, 
          autenticidad del producto, consistencia de precios y satisfacción del cliente para ordenar 
          estos productos por su nivel de confianza.
        </p>
      </div>
    </div>
  )
}