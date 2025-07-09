import { Platform } from '@prisma/client'
import { ScrapingResult } from '@/types'
import { sleep } from '@/utils'

// Datos mock para demostración cuando no hay scraping real disponible
const mockProducts = [
  {
    title: "iPhone 15 Pro Max Case - Ultra Clear Protection",
    price: 12.99,
    currency: "USD",
    imageUrl: "https://ae01.alicdn.com/kf/S12345.jpg",
    productUrl: "https://www.aliexpress.com/item/12345.html",
    platform: Platform.ALIEXPRESS,
    vendorName: "TechCase Store",
    vendorRating: 4.8,
    totalSales: 15420
  },
  {
    title: "Wireless Bluetooth Earbuds - HD Sound Quality",
    price: 29.99,
    currency: "USD", 
    imageUrl: "https://ae01.alicdn.com/kf/S67890.jpg",
    productUrl: "https://www.aliexpress.com/item/67890.html",
    platform: Platform.ALIEXPRESS,
    vendorName: "AudioTech Official",
    vendorRating: 4.6,
    totalSales: 8930
  },
  {
    title: "Fast Charging USB-C Cable 3ft",
    price: 8.50,
    currency: "USD",
    imageUrl: "https://ae01.alicdn.com/kf/S11111.jpg", 
    productUrl: "https://www.aliexpress.com/item/11111.html",
    platform: Platform.ALIEXPRESS,
    vendorName: "Cable Plus",
    vendorRating: 4.5,
    totalSales: 22100
  },
  {
    title: "Laptop Stand Adjustable Aluminum",
    price: 35.99,
    currency: "USD",
    imageUrl: "https://ae01.alicdn.com/kf/S22222.jpg",
    productUrl: "https://www.aliexpress.com/item/22222.html", 
    platform: Platform.ALIEXPRESS,
    vendorName: "WorkSpace Pro",
    vendorRating: 4.7,
    totalSales: 5670
  },
  {
    title: "Smart Watch Sports Edition - Waterproof",
    price: 89.99,
    currency: "USD",
    imageUrl: "https://ae01.alicdn.com/kf/S33333.jpg",
    productUrl: "https://www.aliexpress.com/item/33333.html",
    platform: Platform.ALIEXPRESS, 
    vendorName: "SmartTech Hub",
    vendorRating: 4.4,
    totalSales: 3450
  }
]

export async function demoScrape(query: string, maxResults: number = 20): Promise<ScrapingResult> {
  const startTime = Date.now()
  
  // Simular tiempo de scraping real
  await sleep(1000 + Math.random() * 2000)
  
  // Filtrar productos que coincidan vagamente con la búsqueda
  const filteredProducts = mockProducts.filter(product => 
    product.title.toLowerCase().includes(query.toLowerCase()) ||
    query.toLowerCase().split(' ').some(word => 
      product.title.toLowerCase().includes(word.toLowerCase())
    )
  )
  
  // Si no hay coincidencias, devolver todos los productos como fallback
  const resultProducts = filteredProducts.length > 0 ? filteredProducts : mockProducts
  
  // Simular variación en precios para que parezca real
  const variatedProducts = resultProducts.slice(0, maxResults).map(product => ({
    ...product,
    price: product.price + (Math.random() - 0.5) * 10, // Variación de ±$5
    vendorRating: Math.max(3.5, product.vendorRating + (Math.random() - 0.5) * 0.5),
    totalSales: Math.floor(product.totalSales + Math.random() * 1000)
  }))
  
  const processingTime = Date.now() - startTime
  
  return {
    success: true,
    products: variatedProducts,
    errors: [],
    platform: Platform.ALIEXPRESS,
    totalFound: variatedProducts.length,
    processingTime
  }
}

export function isDemoMode(): boolean {
  // Activar modo demo si no hay configuración de scraping real
  return !process.env.ENABLE_REAL_SCRAPING || process.env.NODE_ENV === 'development'
}