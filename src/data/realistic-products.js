// Datos de productos realistas basados en búsquedas reales de e-commerce

const productTemplates = {
  // Electrónicos
  'headphones': [
    'Wireless Bluetooth 5.0 Headphones with Active Noise Cancellation',
    'Over-Ear Gaming Headset with RGB LED Light and Microphone',
    'True Wireless Earbuds with Charging Case - 30H Battery Life',
    'Studio Monitor Headphones Professional DJ Equipment',
    'Sports Bluetooth Earphones Waterproof IPX7 Running Gym'
  ],
  
  'iphone': [
    'Shockproof Clear Case for iPhone 15 Pro Max with Camera Protection',
    'Magnetic Wireless Charging Compatible TPU Bumper Case',
    'Tempered Glass Screen Protector 9H Hardness Anti-Scratch',
    'Leather Wallet Case with Card Holder and Stand Function',
    'Ultra Slim Transparent Hard PC Back Cover Anti-Yellowing'
  ],
  
  'phone': [
    'Fast Charging USB-C Cable 3ft Braided Nylon Data Sync Cord',
    'Wireless Charger 15W Qi-Certified Charging Pad Stand',
    'Car Phone Mount Dashboard Windshield Universal Holder',
    'Portable Power Bank 20000mAh with PD Fast Charging',
    'Bluetooth Car FM Transmitter with Dual USB Charger'
  ],
  
  // Ropa
  'shirt': [
    'Cotton Blend Basic T-Shirt Unisex Casual Wear',
    'Oversized Vintage Graphic Tee 100% Cotton Short Sleeve',
    'Business Formal Dress Shirt Long Sleeve Non-Iron',
    'Sports Performance Moisture-Wicking Athletic Shirt',
    'Polo Shirt Classic Fit with Embroidered Logo'
  ],
  
  'dress': [
    'Summer Floral Midi Dress with Belt Casual Elegant',
    'Evening Party Cocktail Dress Sleeveless A-Line',
    'Bohemian Maxi Dress Long Sleeve Vintage Print',
    'Little Black Dress Classic Fit Office Business',
    'Casual Sundress Beach Vacation Loose Fit Cotton'
  ],
  
  // Hogar
  'cup': [
    'Stainless Steel Travel Mug with Leak-Proof Lid 16oz',
    'Ceramic Coffee Mug Set of 4 with Gift Box Packaging',
    'Double Wall Glass Tea Cup with Bamboo Lid and Strainer',
    'Insulated Tumbler with Straw 20oz Temperature Control',
    'Vintage Enamel Camping Mug Outdoor Adventure Style'
  ],
  
  'lamp': [
    'LED Desk Lamp with USB Charging Port and Touch Control',
    'Vintage Industrial Table Lamp with Edison Bulb',
    'Smart WiFi Floor Lamp with RGB Color Changing',
    'Reading Light Clip-On Book Lamp Rechargeable',
    'Himalayan Salt Lamp Natural Crystal with Dimmer'
  ]
};

const realisticVendors = [
  { name: 'UGREEN Official Store', rating: 4.8, sales: 45230 },
  { name: 'ESR Store', rating: 4.7, sales: 32100 },
  { name: 'Baseus Official', rating: 4.9, sales: 67890 },
  { name: 'Anker Official Store', rating: 4.8, sales: 89320 },
  { name: 'Xiaomi Youpin', rating: 4.6, sales: 23450 },
  { name: 'SHEIN Basics', rating: 4.5, sales: 156780 },
  { name: 'H&M Online', rating: 4.4, sales: 98760 },
  { name: 'Tech Accessories Pro', rating: 4.7, sales: 34560 },
  { name: 'HomeGoods Direct', rating: 4.6, sales: 21340 },
  { name: 'Fashion Forward Store', rating: 4.3, sales: 76540 },
  { name: 'ElectroWorld', rating: 4.8, sales: 43210 },
  { name: 'StyleHub Official', rating: 4.5, sales: 65430 }
];

const realisticImages = [
  'https://ae01.alicdn.com/kf/H1234567890.jpg',
  'https://ae01.alicdn.com/kf/H9876543210.jpg',
  'https://ae01.alicdn.com/kf/H5555555555.jpg',
  'https://ae01.alicdn.com/kf/H7777777777.jpg',
  'https://ae01.alicdn.com/kf/H3333333333.jpg'
];

function generateRealisticProducts(query, platform = 'ALIEXPRESS', count = 6) {
  const results = [];
  const queryLower = query.toLowerCase();
  
  // Encontrar categoría más relevante
  let relevantTemplates = [];
  for (const [category, templates] of Object.entries(productTemplates)) {
    if (queryLower.includes(category) || category.includes(queryLower)) {
      relevantTemplates = templates;
      break;
    }
  }
  
  // Si no encuentra categoría específica, usar términos genéricos
  if (relevantTemplates.length === 0) {
    relevantTemplates = [
      `Premium ${query} with Advanced Features`,
      `Professional ${query} High Quality Materials`,
      `${query} - Latest Model with Warranty`,
      `Luxury ${query} Designer Collection`,
      `${query} Set with Accessories Included`
    ];
  }
  
  for (let i = 0; i < count; i++) {
    const vendor = realisticVendors[Math.floor(Math.random() * realisticVendors.length)];
    const template = relevantTemplates[i % relevantTemplates.length];
    
    // Generar precio realista basado en categoría
    let basePrice = 15;
    if (queryLower.includes('phone') || queryLower.includes('electronic')) basePrice = 25;
    if (queryLower.includes('headphone') || queryLower.includes('audio')) basePrice = 35;
    if (queryLower.includes('shirt') || queryLower.includes('cloth')) basePrice = 12;
    if (queryLower.includes('dress')) basePrice = 20;
    if (queryLower.includes('case')) basePrice = 8;
    
    const price = basePrice + (Math.random() * basePrice * 2);
    const finalPrice = Math.round(price * 100) / 100;
    
    // Calcular Trust Score basado en rating del vendedor y ventas
    const trustScore = Math.min(10, 
      (vendor.rating * 1.8) + 
      (Math.log10(vendor.sales) * 0.3) + 
      (Math.random() * 0.5)
    );
    
    results.push({
      title: template,
      price: finalPrice,
      currency: 'USD',
      imageUrl: realisticImages[i % realisticImages.length],
      productUrl: `https://www.aliexpress.com/item/${1000000000 + Math.floor(Math.random() * 999999999)}.html`,
      platform: platform,
      vendorName: vendor.name,
      vendorRating: vendor.rating,
      totalSales: vendor.sales + Math.floor(Math.random() * 1000),
      trustScore: Math.round(trustScore * 10) / 10
    });
  }
  
  return results;
}

module.exports = {
  generateRealisticProducts,
  productTemplates,
  realisticVendors
};