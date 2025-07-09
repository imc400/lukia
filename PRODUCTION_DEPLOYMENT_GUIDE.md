# 🚀 LUKIA - Guía de Despliegue a Producción

## **📋 Resumen de lo Implementado**

### **✅ Funcionalidades Completadas:**

1. **🔄 Sistema de Rotación de Proxies**
   - Rotación automática e inteligente de proxies
   - Soporte para Bright Data, Oxylabs y proxies gratuitos
   - Fallback automático en caso de fallos
   - Métricas de rendimiento por proxy

2. **⚡ Sistema de Reintentos Robusto**
   - Reintentos exponenciales con jitter
   - Configuración específica por plataforma
   - Manejo inteligente de errores
   - Timeout configurables

3. **📊 Monitoreo en Tiempo Real**
   - Métricas de rendimiento completas
   - Alertas automáticas
   - Salud del sistema
   - API de monitoreo (`/api/monitoring`)

4. **🔗 Integración SHEIN API**
   - Cliente completo para Scrapeless API
   - Normalización de datos
   - Manejo de errores específicos
   - Métricas de uso

5. **🛡️ Rate Limiting Inteligente**
   - Límites adaptativos por plataforma
   - Cola de requests con prioridades
   - Cooldown automático
   - API de control (`/api/rate-limit`)

6. **🔍 Scraping Mejorado**
   - Detección de captchas
   - User agents rotativos
   - Múltiples estrategias de extracción
   - Pool de scrapers

## **🏗️ Arquitectura de Producción**

```
┌─────────────────────────────────────────────────────────────┐
│                     LUKIA Production                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)                                     │
│  ├── /api/search          (Búsqueda principal)             │
│  ├── /api/monitoring      (Métricas en tiempo real)        │
│  ├── /api/rate-limit      (Control de rate limiting)       │
│  └── /api/ai/*            (Análisis con IA)                │
├─────────────────────────────────────────────────────────────┤
│  Backend Services                                           │
│  ├── ScrapingService      (Coordinador principal)          │
│  ├── ProxyManager         (Gestión de proxies)             │
│  ├── RateLimiter          (Control de velocidad)           │
│  ├── ScrapingMonitor      (Monitoreo y alertas)            │
│  └── RetryHandler         (Manejo de errores)              │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── PostgreSQL           (Productos, logs, métricas)      │
│  ├── Redis                (Cache, rate limiting)           │
│  └── OpenAI API           (Análisis de IA)                 │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  ├── AliExpress          (Scraping directo + proxies)      │
│  ├── SHEIN               (Scrapeless API)                  │
│  ├── Temu                (Pendiente - Piloterr API)        │
│  └── Alibaba             (Pendiente - Bright Data)         │
└─────────────────────────────────────────────────────────────┘
```

## **🔧 Configuración Paso a Paso**

### **Paso 1: Configurar Variables de Entorno**

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Configurar variables críticas
DATABASE_URL="postgresql://user:password@localhost:5432/lukia"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-..."

# Configurar proxies premium (recomendado)
BRIGHT_DATA_PROXY_HOST="brd-customer-hl_xxx.zproxy.lum-cdn.com"
BRIGHT_DATA_PROXY_PORT="22225"
BRIGHT_DATA_USERNAME="brd-customer-hl_xxx"
BRIGHT_DATA_PASSWORD="your_password"

# Configurar API de SHEIN
SCRAPELESS_API_KEY="your_scrapeless_api_key"

# Configuración de producción
SCRAPING_MODE="production"
RATE_LIMIT_REQUESTS_PER_MINUTE="30"
CACHE_TTL_SECONDS="1800"
```

### **Paso 2: Configurar Base de Datos**

```bash
# Ejecutar migraciones
npm run db:generate
npm run db:push

# Verificar conexión
npm run db:studio  # Abrir en localhost:5555
```

### **Paso 3: Configurar Redis**

```bash
# Instalar Redis localmente
brew install redis  # macOS
# o
sudo apt-get install redis-server  # Ubuntu

# Iniciar Redis
redis-server

# Verificar conexión
redis-cli ping  # Debe responder PONG
```

### **Paso 4: Configurar Proxies**

#### **Opción A: Bright Data (Recomendado)**
1. Registrarse en [Bright Data](https://brightdata.com)
2. Crear zona de datacenter proxy
3. Obtener credenciales y configurar en `.env`

#### **Opción B: Oxylabs**
1. Registrarse en [Oxylabs](https://oxylabs.io)
2. Obtener credenciales de Web Scraper API
3. Configurar en `.env`

#### **Opción C: Solo proxies gratuitos**
- El sistema funcionará con proxies gratuitos pero con menor reliability

### **Paso 5: Configurar APIs Externas**

#### **SHEIN (Scrapeless API)**
1. Registrarse en [Scrapeless](https://scrapeless.com)
2. Obtener API key
3. Configurar `SCRAPELESS_API_KEY` en `.env`

#### **Temu (Futuro - Piloterr API)**
1. Registrarse en [Piloterr](https://piloterr.com)
2. Obtener API key para Temu
3. Agregar implementación

## **🚀 Despliegue en Producción**

### **Opción 1: Vercel + Railway (Recomendado)**

#### **Frontend en Vercel:**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Configurar proyecto
vercel

# Configurar variables de entorno en Vercel dashboard
# - DATABASE_URL
# - REDIS_URL
# - OPENAI_API_KEY
# - SCRAPELESS_API_KEY
# - Todas las variables de proxy

# Desplegar
vercel --prod
```

#### **Base de Datos en Railway:**
```bash
# Crear proyecto en Railway
railway login
railway new

# Agregar PostgreSQL
railway add postgresql

# Agregar Redis
railway add redis

# Obtener URLs de conexión
railway variables
```

### **Opción 2: VPS Completo**

```bash
# Preparar servidor (Ubuntu 22.04)
sudo apt update
sudo apt install -y nginx postgresql redis-server nodejs npm

# Configurar PostgreSQL
sudo -u postgres createdb lukia
sudo -u postgres createuser lukia_user

# Configurar Nginx
sudo cp deployment/nginx.conf /etc/nginx/sites-available/lukia
sudo ln -s /etc/nginx/sites-available/lukia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Configurar SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# Configurar PM2 para Node.js
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### **Opción 3: Docker**

```bash
# Construir imagen
docker build -t lukia:latest .

# Ejecutar con docker-compose
docker-compose up -d
```

## **📊 Monitoreo y Métricas**

### **Endpoints de Monitoreo:**

```bash
# Estado general del sistema
curl https://your-domain.com/api/monitoring?type=health

# Métricas de scraping
curl https://your-domain.com/api/monitoring?type=metrics

# Estado de rate limiting
curl https://your-domain.com/api/rate-limit?type=status

# Estadísticas detalladas
curl https://your-domain.com/api/monitoring?type=detailed
```

### **Alertas Automáticas:**
- Success rate < 50%: Sistema unhealthy
- Proxy success rate < 80%: Proxies degradados
- Cola > 100 requests: Sobrecarga
- Errores > 10/min: Problemas de conectividad

## **💰 Costos de Producción**

### **Configuración Básica (1K-5K usuarios/mes):**
- **Vercel Pro**: $20/mes
- **Railway**: $10/mes (PostgreSQL + Redis)
- **Bright Data**: $50/mes (proxies premium)
- **Scrapeless**: $49/mes (SHEIN API)
- **OpenAI**: $20-50/mes (análisis de IA)
- **TOTAL**: ~$150-180/mes

### **Configuración Escalada (10K-50K usuarios/mes):**
- **Vercel Pro**: $50/mes
- **Railway**: $25/mes
- **Bright Data**: $150/mes
- **Scrapeless**: $199/mes
- **OpenAI**: $100-200/mes
- **TOTAL**: ~$525-625/mes

### **Configuración Enterprise (50K+ usuarios/mes):**
- **Servidor dedicado**: $200/mes
- **Proxies enterprise**: $500/mes
- **APIs premium**: $500/mes
- **OpenAI**: $300-500/mes
- **TOTAL**: ~$1,500-1,700/mes

## **🔐 Configuración de Seguridad**

### **Variables de Entorno Seguras:**
```bash
# Usar servicios como Vercel Secrets o Railway Variables
# Nunca commits .env files
# Rotar API keys regularmente
```

### **Rate Limiting por IP:**
```typescript
// Implementar en middleware
const ipRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Too many requests from this IP'
}
```

### **Cors y Headers:**
```typescript
// Configurar CORS apropiadamente
const corsOptions = {
  origin: ['https://yourdomain.com'],
  credentials: true,
  optionsSuccessStatus: 200
}
```

## **⚡ Optimizaciones de Rendimiento**

### **1. Caching Inteligente:**
```typescript
// Cache por query con TTL dinámico
const cacheKey = `search:${query}:${platform}`
const ttl = success ? 1800 : 300 // 30min éxito, 5min error
```

### **2. Pool de Conexiones:**
```typescript
// Configurar pool de Puppeteer
const maxPoolSize = 3
const scraperPool = new ScraperPool(maxPoolSize)
```

### **3. Compresión de Responses:**
```typescript
// Comprimir respuestas JSON grandes
app.use(compression())
```

## **🔄 Proceso de Actualización**

### **Deployment Automatizado:**
```bash
# GitHub Actions para CI/CD
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

### **Rollback Plan:**
```bash
# Vercel rollback
vercel --prod --rollback

# Railway rollback
railway rollback
```

## **📈 Métricas de Éxito**

### **KPIs Técnicos:**
- **Uptime**: > 99.5%
- **Response Time**: < 2 segundos
- **Success Rate**: > 85%
- **Error Rate**: < 5%

### **KPIs de Negocio:**
- **Búsquedas/día**: 1,000-10,000
- **Conversion Rate**: 2-5%
- **User Retention**: > 30%
- **Revenue/mes**: $1K-10K

## **🎯 Próximos Pasos**

### **Implementación Inmediata:**
1. **Configurar proxies premium** (Bright Data)
2. **Agregar API de SHEIN** (Scrapeless)
3. **Configurar monitoreo** (alertas)
4. **Desplegar en Vercel** (producción)

### **Siguientes 2 Semanas:**
1. **Agregar Temu API** (Piloterr)
2. **Implementar CDN** (Cloudflare)
3. **Agregar analytics** (Google Analytics)
4. **Optimizar SEO** (meta tags, sitemap)

### **Próximo Mes:**
1. **Agregar Alibaba API** (Bright Data)
2. **Implementar autenticación** (usuarios)
3. **Agregar favoritos** (persistencia)
4. **Monetización** (afiliados)

---

## **🎉 ¡LUKIA está listo para producción!**

Con esta implementación, LUKIA tiene:
- ✅ **Arquitectura robusta** para miles de usuarios
- ✅ **Scraping inteligente** con proxies y rate limiting
- ✅ **Monitoreo completo** con alertas automáticas
- ✅ **APIs reales** funcionando (AliExpress + SHEIN)
- ✅ **Escalabilidad** para crecer sin problemas

**Costo inicial**: ~$150-180/mes  
**Revenue potencial**: $1K-10K/mes  
**ROI esperado**: 500-6,000%

¡Es hora de lanzar! 🚀