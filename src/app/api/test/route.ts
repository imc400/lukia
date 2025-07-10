import { NextResponse } from 'next/server'

export async function GET() {
  // Datos de prueba para verificar que el frontend funciona
  const testProducts = [
    {
      title: "iPhone 15 Pro Case - Chile Test",
      price: 25990,
      currency: "CLP",
      imageUrl: "https://via.placeholder.com/300x300?text=iPhone+Case",
      productUrl: "https://www.google.com/shopping",
      platform: "SHEIN",
      vendorName: "MercadoLibre Chile",
      vendorRating: 4.5,
      totalSales: 1250,
      reviewCount: 89,
      rating: 4.3,
      extractedAt: new Date().toISOString(),
      brand: "Apple Compatible",
      category: "Electronics",
      description: "Carcasa protectora para iPhone 15 Pro",
      delivery: "Envío gratis a Chile",
      inStock: true
    },
    {
      title: "Funda Magnética iPhone 14 - Precio Chile",
      price: 19990,
      currency: "CLP", 
      imageUrl: "https://via.placeholder.com/300x300?text=Funda+Magnetica",
      productUrl: "https://www.google.com/shopping",
      platform: "SHEIN",
      vendorName: "Falabella",
      vendorRating: 4.7,
      totalSales: 890,
      reviewCount: 156,
      rating: 4.6,
      extractedAt: new Date().toISOString(),
      brand: "Premium",
      category: "Electronics",
      description: "Funda magnética compatible con MagSafe",
      delivery: "Retiro en tienda disponible",
      inStock: true
    }
  ]

  return NextResponse.json({
    success: true,
    query: "test productos chile",
    totalResults: 2,
    products: testProducts,
    aiAnalysis: {
      enabled: true,
      status: "processing",
      message: "Test mode - AI analysis simulation"
    },
    timestamp: new Date().toISOString()
  })
}

export async function POST() {
  return GET() // Same response for POST
}