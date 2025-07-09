require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Test de conexiones
console.log('🔍 Testing connections...');

// Test PostgreSQL
const testPostgreSQL = async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
};

// Test Redis
const testRedis = async () => {
  try {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    console.log('✅ Redis connected successfully');
    redis.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
};

// Test OpenAI
const testOpenAI = async () => {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-openai-api-key')) {
      console.log('⚠️  OpenAI API key not configured (using demo mode)');
      return false;
    }
    console.log('✅ OpenAI API key configured');
    return true;
  } catch (error) {
    console.error('❌ OpenAI configuration failed:', error.message);
    return false;
  }
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await testPostgreSQL(),
      redis: await testRedis(),
      openai: await testOpenAI()
    }
  };
  
  res.json(health);
});

// Servir archivos estáticos
app.use(express.static('public'));

// Ruta para búsqueda
app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search.html'));
});

// Ruta para testing
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-frontend.html'));
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de respaldo para status del server
app.get('/status', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LUKIA - Server Status</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0; padding: 20px; min-height: 100vh;
                display: flex; align-items: center; justify-content: center;
            }
            .container { 
                background: white; padding: 40px; border-radius: 20px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; max-width: 600px;
            }
            h1 { color: #2d3748; margin-bottom: 20px; }
            .status { margin: 20px 0; padding: 15px; border-radius: 10px; }
            .success { background: #48bb78; color: white; }
            .info { background: #4299e1; color: white; }
            .button { 
                display: inline-block; margin: 10px; padding: 15px 30px; 
                background: #667eea; color: white; text-decoration: none; 
                border-radius: 10px; font-weight: 600;
            }
            .button:hover { background: #5a67d8; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎉 LUKIA Server is Running!</h1>
            <div class="status success">
                ✅ Express Server: Active
            </div>
            <div class="status info">
                🌐 URL: http://localhost:${PORT}
            </div>
            <div class="status info">
                📊 Health Check: <a href="/health" style="color: white;">/health</a>
            </div>
            <div class="status info">
                🔍 Search API: <a href="/api/search" style="color: white;">/api/search</a>
            </div>
            
            <h3>Test Endpoints:</h3>
            <a href="/health" class="button">Health Check</a>
            <a href="/api/test" class="button">API Test</a>
            
            <div style="margin-top: 30px; font-size: 14px; color: #718096;">
                Server started at: ${new Date().toLocaleString()}
            </div>
        </div>
    </body>
    </html>
  `);
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test database query
    const testQuery = await prisma.$queryRaw`SELECT NOW() as current_time`;
    
    res.json({
      success: true,
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      database: testQuery,
      environment: {
        node_version: process.version,
        database_url: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
        redis_url: process.env.REDIS_URL ? 'Configured' : 'Not configured',
        openai_key: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'
      }
    });
    
    await prisma.$disconnect();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Search API (básico por ahora)
app.post('/api/search', async (req, res) => {
  console.log('[SEARCH] Request received:', req.body);
  
  try {
    const { query, platform = 'all' } = req.body;
    
    if (!query) {
      console.log('[SEARCH] Error: Missing query parameter');
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    console.log('[SEARCH] Processing search:', { query, platform });

    // Log búsqueda en base de datos
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('[SEARCH] Creating search record...');
    
    // Convertir platform a formato correcto para la DB
    let dbPlatform = null;
    if (platform !== 'all') {
      dbPlatform = platform.toUpperCase();
    }
    
    const searchRecord = await prisma.search.create({
      data: {
        query,
        platform: dbPlatform,
        results: 3
      }
    });
    console.log('[SEARCH] Search record created:', searchRecord.id);

    let products = [];
    let scrapingResults = [];
    
    // Determinar si usar scraping real o datos demo
    const useRealScraping = process.env.ENABLE_REAL_SCRAPING === 'true';
    
    if (useRealScraping && (platform === 'all' || platform === 'aliexpress')) {
      console.log('[SEARCH] Using REAL Products API with AI analysis...');
      
      try {
        const { RealProductsAPI } = require('./src/services/api/real-products-api.js');
        const { getOpenAIService } = require('./src/services/ai/openai.js');
        
        const startTime = Date.now();
        const productsAPI = new RealProductsAPI();
        const aiService = getOpenAIService();
        
        // 1. Obtener productos reales
        console.log('[SEARCH] Fetching real products...');
        const result = await productsAPI.searchProducts(query, 'ALIEXPRESS', 8);
        
        if (result.success && result.products.length > 0) {
          console.log(`[SEARCH] Found ${result.products.length} real products`);
          
          // 2. Análisis IA de cada producto
          console.log('[SEARCH] Starting AI analysis...');
          const enhancedProducts = [];
          
          for (const product of result.products) {
            try {
              // Obtener reviews reales para este producto
              const reviews = await productsAPI.getReviewsForProduct(
                product.productUrl, 
                query
              );
              
              // Análisis IA de reviews
              const reviewAnalysis = await aiService.analyzeReviews(reviews);
              
              // Cálculo de Trust Score con IA
              const trustAnalysis = await aiService.calculateTrustScore({
                vendorRating: product.vendorRating,
                totalSales: product.totalSales,
                reviewsCount: product.reviewsCount || 1000,
                responseTime: '2 hours',
                yearsInBusiness: 3,
                recentReviews: reviews.slice(0, 3)
              });
              
              // Traducción y simplificación del título
              const translation = await aiService.translateAndSimplify(product.title);
              
              // Detección de actividad sospechosa
              const suspiciousAnalysis = await aiService.detectSuspiciousActivity({
                vendorName: product.vendorName,
                productTitle: product.title,
                price: product.price,
                reviews: reviews,
                vendorRating: product.vendorRating,
                totalSales: product.totalSales
              });
              
              // Producto enriquecido con análisis IA
              enhancedProducts.push({
                ...product,
                trustScore: trustAnalysis.overallScore,
                aiAnalysis: {
                  reviewSentiment: reviewAnalysis.sentiment,
                  fakeReviewsDetected: reviewAnalysis.isFakeDetected,
                  translatedTitle: translation.translatedTitle,
                  simplifiedDescription: translation.simplifiedDescription,
                  keyFeatures: translation.keyFeatures,
                  suspiciousActivity: suspiciousAnalysis.isSuspicious,
                  recommendation: suspiciousAnalysis.recommendation,
                  trustExplanation: trustAnalysis.explanation
                }
              });
              
              console.log(`[SEARCH] AI analysis completed for: ${product.title.substring(0, 50)}...`);
              
            } catch (aiError) {
              console.error('[SEARCH] AI analysis failed for product:', aiError.message);
              // Agregar producto sin análisis IA
              enhancedProducts.push({
                ...product,
                trustScore: Math.min(10, (product.vendorRating * 2) + Math.random()),
                aiAnalysis: {
                  reviewSentiment: 'neutral',
                  fakeReviewsDetected: false,
                  translatedTitle: product.title,
                  simplifiedDescription: 'Análisis IA no disponible',
                  keyFeatures: ['Información no disponible'],
                  suspiciousActivity: false,
                  recommendation: 'caution',
                  trustExplanation: 'Análisis básico sin IA'
                }
              });
            }
          }
          
          products = enhancedProducts;
          const duration = Date.now() - startTime;
          
          scrapingResults.push({
            platform: 'ALIEXPRESS',
            success: true,
            count: enhancedProducts.length,
            errors: [],
            processingTime: duration,
            aiAnalysisCompleted: true,
            source: 'real-api-with-ai'
          });
          
          console.log(`[SEARCH] Real products + AI analysis completed: ${enhancedProducts.length} products in ${duration}ms`);
          
        } else {
          throw new Error('No real products found');
        }
        
      } catch (error) {
        console.error('[SEARCH] Real API failed, falling back to enhanced demo data:', error.message);
        
        scrapingResults.push({
          platform: 'ALIEXPRESS',
          success: false,
          count: 0,
          errors: [error.message],
          processingTime: 1000
        });
        
        // Fallback a datos demo realistas
        const { generateRealisticProducts } = require('./src/data/realistic-products.js');
        products = generateRealisticProducts(query, 'ALIEXPRESS', 6);
      }
    } else {
      console.log('[SEARCH] Using realistic demo data...');
      
      // Generar datos demo realistas
      const { generateRealisticProducts } = require('./src/data/realistic-products.js');
      products = generateRealisticProducts(query, platform === 'all' ? 'ALIEXPRESS' : platform.toUpperCase(), 8);
      
      scrapingResults.push({
        platform: 'ALIEXPRESS',
        success: true,
        count: products.length,
        errors: [],
        processingTime: 1200
      });
    }

    // Log de scraping
    for (const result of scrapingResults) {
      await prisma.scrapingLog.create({
        data: {
          platform: result.platform,
          status: result.success ? 'success' : 'error',
          duration: result.processingTime
        }
      });
    }

    await prisma.$disconnect();

    const successfulPlatforms = scrapingResults.filter(r => r.success).length;
    const failedPlatforms = scrapingResults.filter(r => !r.success).length;

    res.json({
      success: true,
      query,
      totalResults: products.length,
      platforms: { 
        successful: successfulPlatforms, 
        failed: failedPlatforms, 
        total: scrapingResults.length 
      },
      products,
      results: scrapingResults,
      searchId: searchRecord.id,
      timestamp: new Date().toISOString(),
      realScraping: useRealScraping
    });

  } catch (error) {
    console.error('[SEARCH] Search API error:', error);
    console.error('[SEARCH] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// AI Services API Endpoints
app.post('/api/ai/analyze-reviews', async (req, res) => {
  try {
    const { reviews } = req.body;
    
    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({
        success: false,
        error: 'Reviews array is required'
      });
    }

    const { getOpenAIService } = require('./src/services/ai/openai.js');
    const aiService = getOpenAIService();
    
    const analysis = await aiService.analyzeReviews(reviews);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Review Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'AI analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ai/trust-score', async (req, res) => {
  try {
    const { vendorRating, totalSales, reviewsCount, responseTime, yearsInBusiness, recentReviews } = req.body;
    
    if (!vendorRating || !totalSales || !reviewsCount || !recentReviews) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: vendorRating, totalSales, reviewsCount, recentReviews'
      });
    }

    const { getOpenAIService } = require('./src/services/ai/openai.js');
    const aiService = getOpenAIService();
    
    const trustScore = await aiService.calculateTrustScore({
      vendorRating,
      totalSales,
      reviewsCount,
      responseTime,
      yearsInBusiness,
      recentReviews
    });
    
    res.json({
      success: true,
      trustScore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Trust Score error:', error);
    res.status(500).json({
      success: false,
      error: 'Trust score calculation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ai/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'es' } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const { getOpenAIService } = require('./src/services/ai/openai.js');
    const aiService = getOpenAIService();
    
    const translation = await aiService.translateAndSimplify(text, targetLanguage);
    
    res.json({
      success: true,
      translation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Translation error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/ai/detect-suspicious', async (req, res) => {
  try {
    const { vendorName, productTitle, price, reviews, vendorRating, totalSales } = req.body;
    
    if (!vendorName || !productTitle || !price || !reviews || !vendorRating || !totalSales) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: vendorName, productTitle, price, reviews, vendorRating, totalSales'
      });
    }

    const { getOpenAIService } = require('./src/services/ai/openai.js');
    const aiService = getOpenAIService();
    
    const suspiciousAnalysis = await aiService.detectSuspiciousActivity({
      vendorName,
      productTitle,
      price,
      reviews,
      vendorRating,
      totalSales
    });
    
    res.json({
      success: true,
      suspiciousAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Suspicious Detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Suspicious activity detection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize server
const startServer = async () => {
  console.log('\\n🚀 ==========================================');
  console.log('🎉 Starting LUKIA Robust Server...');
  console.log('==========================================');
  
  // Test all connections
  const dbOk = await testPostgreSQL();
  const redisOk = await testRedis();
  const openaiOk = await testOpenAI();
  
  if (!dbOk) {
    console.error('❌ Database connection failed - server may not work properly');
  }
  
  if (!redisOk) {
    console.error('❌ Redis connection failed - caching disabled');
  }
  
  // Start server regardless
  app.listen(PORT, '0.0.0.0', () => {
    console.log('==========================================');
    console.log(`📍 Local:    http://localhost:${PORT}`);
    console.log(`🌐 Network:  http://0.0.0.0:${PORT}`);
    console.log('==========================================');
    console.log('✅ Server ready for connections');
    console.log('🔍 Health check: /health');
    console.log('🧪 API test: /api/test');
    console.log('🔍 Search: POST /api/search');
    console.log('==========================================\\n');
  });
};

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Start the server
startServer();