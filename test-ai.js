#!/usr/bin/env node

/**
 * Test completo de funcionalidad AI de LUKIA
 * Prueba todos los endpoints de IA con datos reales
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE = 'http://localhost:3000';

// Datos de prueba realistas
const testData = {
  reviews: [
    "Excelente producto, muy buena calidad, llegó rápido y bien empacado. Lo recomiendo 100%",
    "Good quality, fast shipping, happy with purchase",
    "Amazing product! Works perfectly, great value for money",
    "快速配送，产品质量很好，满意",
    "Producto tal como se describe, envío rápido, vendedor confiable",
    "Perfect! Exactly as described. Fast delivery. Recommended seller!",
    "Très bon produit, livraison rapide, vendeur sérieux"
  ],
  
  vendorData: {
    vendorRating: 4.8,
    totalSales: 15420,
    reviewsCount: 3240,
    responseTime: "2 hours",
    yearsInBusiness: 3,
    recentReviews: [
      "Excelente producto, muy buena calidad, llegó rápido y bien empacado. Lo recomiendo 100%",
      "Good quality, fast shipping, happy with purchase",
      "Amazing product! Works perfectly, great value for money"
    ]
  },
  
  translation: {
    text: "Wireless Bluetooth 5.0 Headphones with Active Noise Cancellation, 30H Battery Life, Hi-Fi Stereo Sound, Over-Ear Headphones with Microphone for Travel, Work, Phone Calls - Black",
    targetLanguage: "es"
  },
  
  suspiciousData: {
    vendorName: "TechCase Store",
    productTitle: "Wireless Bluetooth Headphones Premium",
    price: 29.99,
    reviews: [
      "Excelente producto, muy buena calidad, llegó rápido y bien empacado. Lo recomiendo 100%",
      "Good quality, fast shipping, happy with purchase",
      "Amazing product! Works perfectly, great value for money"
    ],
    vendorRating: 4.8,
    totalSales: 15420
  }
};

// Funciones de prueba
async function testEndpoint(name, endpoint, data) {
  console.log(`\n🧪 Testing ${name}...`.yellow);
  
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos para AI requests
    });
    
    console.log(`✅ ${name} - SUCCESS`.green);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
    
  } catch (error) {
    console.log(`❌ ${name} - FAILED`.red);
    if (error.response) {
      console.log('Error Response:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    return null;
  }
}

async function testHealthCheck() {
  console.log('\n🔍 Checking server health...'.cyan);
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health Check - SUCCESS'.green);
    
    const health = response.data;
    console.log(`Database: ${health.services.database ? '✅' : '❌'}`);
    console.log(`Redis: ${health.services.redis ? '✅' : '❌'}`);
    console.log(`OpenAI: ${health.services.openai ? '✅' : '❌'}`);
    
    return health.services.openai;
    
  } catch (error) {
    console.log('❌ Health Check - FAILED'.red);
    console.log('Error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🎯 LUKIA AI FUNCTIONALITY TESTS'.rainbow);
  console.log('====================================='.rainbow);
  
  // 1. Health check
  const openaiReady = await testHealthCheck();
  
  if (!openaiReady) {
    console.log('\n⚠️  OpenAI not configured - some tests may fail'.yellow);
  }
  
  // 2. Test AI Review Analysis
  await testEndpoint(
    'AI Review Analysis',
    '/api/ai/analyze-reviews',
    { reviews: testData.reviews }
  );
  
  // 3. Test AI Trust Score
  await testEndpoint(
    'AI Trust Score',
    '/api/ai/trust-score',
    testData.vendorData
  );
  
  // 4. Test AI Translation
  await testEndpoint(
    'AI Translation',
    '/api/ai/translate',
    testData.translation
  );
  
  // 5. Test Suspicious Activity Detection
  await testEndpoint(
    'AI Suspicious Detection',
    '/api/ai/detect-suspicious',
    testData.suspiciousData
  );
  
  console.log('\n🎉 All tests completed!'.rainbow);
  console.log('====================================='.rainbow);
}

// Ejecutar pruebas
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testEndpoint,
  testHealthCheck,
  runAllTests
};