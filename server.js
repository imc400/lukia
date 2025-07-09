const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Ruta principal - Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de búsqueda
app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search.html'));
});

// API endpoint para búsqueda
app.post('/api/search', async (req, res) => {
  try {
    console.log('📥 Search request:', req.body);
    
    const { query, platform = 'all', maxResults = 20 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Usar servicio demo por ahora
    const mockResults = {
      success: true,
      query,
      totalResults: 5,
      platforms: { successful: 1, failed: 0, total: 1 },
      products: [
        {
          title: `${query} - Premium Quality Case`,
          price: 12.99,
          currency: 'USD',
          imageUrl: '/placeholder.jpg',
          productUrl: '#',
          platform: 'ALIEXPRESS',
          vendorName: 'TechCase Store',
          vendorRating: 4.8,
          totalSales: 15420
        },
        {
          title: `Wireless ${query} - HD Sound Quality`,
          price: 29.99,
          currency: 'USD',
          imageUrl: '/placeholder.jpg',
          productUrl: '#',
          platform: 'ALIEXPRESS',
          vendorName: 'AudioTech Official',
          vendorRating: 4.6,
          totalSales: 8930
        },
        {
          title: `Fast Charging ${query} Cable`,
          price: 8.50,
          currency: 'USD',
          imageUrl: '/placeholder.jpg',
          productUrl: '#',
          platform: 'ALIEXPRESS',
          vendorName: 'Cable Plus',
          vendorRating: 4.5,
          totalSales: 22100
        },
        {
          title: `${query} Stand Adjustable Aluminum`,
          price: 35.99,
          currency: 'USD',
          imageUrl: '/placeholder.jpg',
          productUrl: '#',
          platform: 'ALIEXPRESS',
          vendorName: 'WorkSpace Pro',
          vendorRating: 4.7,
          totalSales: 5670
        },
        {
          title: `Smart ${query} Sports Edition - Waterproof`,
          price: 89.99,
          currency: 'USD',
          imageUrl: '/placeholder.jpg',
          productUrl: '#',
          platform: 'ALIEXPRESS',
          vendorName: 'SmartTech Hub',
          vendorRating: 4.4,
          totalSales: 3450
        }
      ],
      results: [
        {
          platform: 'ALIEXPRESS',
          success: true,
          count: 5,
          errors: [],
          processingTime: 1200
        }
      ],
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending results:', { query, totalResults: mockResults.totalResults });
    res.json(mockResults);
    
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint para estadísticas
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalSearches: 42,
      successRate: 95.2,
      averageProcessingTime: 1200,
      platformStats: {
        ALIEXPRESS: { searches: 42, successRate: 95.2 }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Catch all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ========================================');
  console.log('🎉 LUKIA Server is running successfully!');
  console.log('========================================');
  console.log(`📍 Local:    http://localhost:${PORT}`);
  console.log(`🌐 Network:  http://0.0.0.0:${PORT}`);
  console.log('========================================');
  console.log('✅ Ready to accept connections');
  console.log('🔍 Try searching for: phone case, earbuds, etc.');
  console.log('========================================\n');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});