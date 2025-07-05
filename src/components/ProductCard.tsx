import Image from 'next/image'
import { formatPrice, getPlatformName, getPlatformColor, getTrustScoreColor, getTrustScoreLabel, truncateText } from '@/utils'

interface ProductCardProps {
  product: {
    title: string
    price: number
    currency: string
    imageUrl: string
    productUrl: string
    platform: string
    vendorName?: string
    vendorRating?: number
    totalSales?: number
    trustScore?: number
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const handleClick = () => {
    window.open(product.productUrl, '_blank', 'noopener,noreferrer')
  }

  const trustScore = product.trustScore || (product.vendorRating ? product.vendorRating * 2 : 5.0)
  const displayPrice = formatPrice(product.price, product.currency)

  return (
    <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={handleClick}>
      <div className="relative">
        <Image
          src={product.imageUrl}
          alt={product.title}
          width={300}
          height={200}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-product.jpg'
          }}
        />
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(product.platform as any)}`}>
            {getPlatformName(product.platform as any)}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {truncateText(product.title, 80)}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-gray-900">
            {displayPrice}
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${getTrustScoreColor(trustScore)}`}>
              {trustScore.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500">
              {getTrustScoreLabel(trustScore)}
            </span>
          </div>
        </div>
        
        {product.vendorName && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="truncate">{product.vendorName}</span>
            <div className="flex items-center space-x-2">
              {product.vendorRating && (
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs">{product.vendorRating.toFixed(1)}</span>
                </div>
              )}
              {product.totalSales && (
                <span className="text-xs text-gray-500">
                  {product.totalSales}+ ventas
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-gray-600">Análisis IA</span>
            </div>
            <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Ver detalles →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}