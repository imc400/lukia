interface VendorAnalysisProps {
  analysis: {
    vendorName: string
    trustLevel: 'very-high' | 'high' | 'medium' | 'low'
    trustScore: number
    verifications: string[]
    concerns: string[]
    productCount: number
    averageRating: number
    isOfficial: boolean
    hasPhysicalPresence: boolean
  }
}

export function AIVendorAnalysis({ analysis }: VendorAnalysisProps) {
  const getTrustLevelConfig = (level: string) => {
    switch (level) {
      case 'very-high':
        return {
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          label: 'MUY ALTO',
          icon: '🛡️'
        }
      case 'high':
        return {
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          label: 'ALTO',
          icon: '✅'
        }
      case 'medium':
        return {
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          label: 'MEDIO',
          icon: '⚠️'
        }
      case 'low':
        return {
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          label: 'BAJO',
          icon: '❌'
        }
      default:
        return {
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          label: 'DESCONOCIDO',
          icon: '❓'
        }
    }
  }

  const config = getTrustLevelConfig(analysis.trustLevel)

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-6 mb-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{config.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              ANÁLISIS DE VENDEDOR: {analysis.vendorName}
            </h3>
            <p className="text-sm text-gray-600">
              Basado en {analysis.productCount} productos analizados
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${config.color} text-white`}>
            CONFIANZA: {config.label}
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {analysis.trustScore}/100
          </div>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-white rounded-lg border">
          <div className="text-xl font-bold text-gray-900">
            {analysis.averageRating > 0 ? `${analysis.averageRating}/5` : 'N/A'}
          </div>
          <div className="text-xs text-gray-600">Rating Promedio</div>
        </div>
        
        <div className="text-center p-3 bg-white rounded-lg border">
          <div className="text-xl font-bold text-gray-900">{analysis.productCount}</div>
          <div className="text-xs text-gray-600">Productos</div>
        </div>
        
        <div className="text-center p-3 bg-white rounded-lg border">
          <div className="text-xl font-bold text-gray-900">
            {analysis.isOfficial ? '✅' : '❌'}
          </div>
          <div className="text-xs text-gray-600">Oficial</div>
        </div>
        
        <div className="text-center p-3 bg-white rounded-lg border">
          <div className="text-xl font-bold text-gray-900">
            {analysis.hasPhysicalPresence ? '🏪' : '🌐'}
          </div>
          <div className="text-xs text-gray-600">Presencia</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Verificaciones */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            VERIFICACIONES:
          </h4>
          
          {analysis.verifications.length > 0 ? (
            <div className="space-y-2">
              {analysis.verifications.map((verification, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">{verification}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No hay verificaciones disponibles</p>
          )}
        </div>

        {/* Concerns */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            ASPECTOS A CONSIDERAR:
          </h4>
          
          {analysis.concerns.length > 0 ? (
            <div className="space-y-2">
              {analysis.concerns.map((concern, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-gray-700">{concern}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-600 italic">No se identificaron preocupaciones</p>
          )}
        </div>
      </div>

      {/* Veredicto final */}
      <div className={`mt-6 p-4 ${config.bgColor} rounded-lg border ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{config.icon}</div>
            <div>
              <h5 className={`font-bold ${config.textColor}`}>
                VEREDICTO IA: {getVerdict(analysis.trustLevel)}
              </h5>
              <p className="text-sm text-gray-600">
                {getVerdictMessage(analysis.trustLevel, analysis.isOfficial)}
              </p>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-lg font-bold text-white ${config.color}`}>
            {analysis.trustScore}/100
          </div>
        </div>
      </div>
    </div>
  )
}

function getVerdict(trustLevel: string): string {
  switch (trustLevel) {
    case 'very-high': return 'COMPRA ALTAMENTE SEGURA'
    case 'high': return 'COMPRA SEGURA'
    case 'medium': return 'COMPRA CON PRECAUCIÓN'
    case 'low': return 'REVISAR ANTES DE COMPRAR'
    default: return 'EVALUAR CUIDADOSAMENTE'
  }
}

function getVerdictMessage(trustLevel: string, isOfficial: boolean): string {
  if (trustLevel === 'very-high') {
    return isOfficial 
      ? 'Vendedor oficial con máxima confiabilidad y garantías'
      : 'Vendedor altamente confiable con excelente historial'
  }
  
  if (trustLevel === 'high') {
    return 'Vendedor confiable con buenos indicadores de calidad'
  }
  
  if (trustLevel === 'medium') {
    return 'Vendedor con indicadores mixtos, revisar detalles antes de comprar'
  }
  
  return 'Recomendamos revisar cuidadosamente antes de realizar la compra'
}