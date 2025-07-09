# LUKIA - Buscador Inteligente de Proveedores con IA

## 📋 Información General del Proyecto

### Nombre del Proyecto
**LUKIA** - Buscador Inteligente de Proveedores

### Objetivo General
Desarrollar un "Buscador Inteligente de Proveedores" para AliExpress, Alibaba, SHEIN, Temu, y otras plataformas, que permita a los usuarios encontrar solo vendedores confiables y comparar opciones de forma mucho más segura y fácil.

### Propuesta de Valor Diferencial
- **Multi-plataforma**: Búsqueda unificada en AliExpress, Alibaba, SHEIN, Temu
- **Trust Score personalizado con IA**: Ranking confiable de vendedores basado en múltiples señales
- **Análisis avanzado de reviews usando IA (NLP)**: Detección de reviews falsas y análisis de sentimiento
- **Traducción y simplificación de descripciones usando IA**: Comprensión clara de productos
- **Comparación inteligente**: Precios, tiempos de envío, reputación unificados
- **Experiencia humanizada**: Interfaz simple para decisiones complejas de compra
- **Monetización por afiliados**: Revenue sharing con plataformas objetivo

## 🎯 Usuarios Objetivo

### Segmento Primario (B2C)
- **Compradores ocasionales**: Personas que compran 1-5 productos al mes en plataformas chinas
- **Edad**: 25-45 años
- **Problema**: Desconfianza, información confusa, dificultad para evaluar vendedores
- **Solución**: Interface simple con recomendaciones claras basadas en IA

### Segmento Secundario (B2B - Futuro)
- **Pequeños retailers**: Necesitan encontrar proveedores confiables para reventa
- **Emprendedores**: Buscan productos para dropshipping o importación
- **Problema**: Volumen de búsqueda y validación manual de proveedores
- **Solución**: Herramientas avanzadas de análisis y comparación masiva

## 🛠️ Stack Tecnológico Propuesto

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn/ui
- **Estado**: Zustand
- **Formularios**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js o Fastify
- **Base de datos**: PostgreSQL (datos estructurados) + Redis (caché)
- **ORM**: Prisma

### IA/ML
- **LLM**: OpenAI GPT-4o (análisis de reviews, traducción)
- **Embeddings**: OpenAI text-embedding-3-large
- **Vector DB**: Pinecone (similitud de productos)
- **Análisis de sentimiento**: Modelo personalizado con Hugging Face

### Scraping/APIs
- **Scraping**: Puppeteer + Playwright (rotación)
- **Proxies**: Bright Data o Oxylabs
- **Rate limiting**: Bottleneck.js
- **Caching**: Redis con TTL inteligente

### Infraestructura
- **Hosting**: Vercel (Frontend) + Railway/Fly.io (Backend)
- **Monitoreo**: Sentry + Posthog
- **CI/CD**: GitHub Actions
- **Cron jobs**: Vercel Cron o GitHub Actions

## 🚀 MVP Inicial (Fase 1 - 2-3 meses)

### Features Esenciales
1. **Búsqueda Básica Multi-plataforma**
   - Soporte para AliExpress y SHEIN inicialmente
   - Búsqueda por palabra clave
   - Filtros básicos (precio, envío, rating)

2. **Trust Score con IA**
   - Algoritmo que analiza: rating vendedor, número de ventas, reviews recientes
   - Puntuación 1-10 con explicación clara
   - **IA**: Análisis de patrones en histórico de vendedores

3. **Análisis de Reviews con IA**
   - Detección de reviews falsas usando NLP
   - Resumen de reviews positivas/negativas
   - **IA**: Sentiment analysis y detección de anomalías

4. **Interfaz Simple**
   - Lista de resultados con Trust Score visible
   - Comparación lado a lado de hasta 3 productos
   - Botón directo a la plataforma original

### Métricas de Éxito MVP
- 100 búsquedas exitosas por día
- Trust Score accuracy > 85%
- CTR a plataformas > 15%
- Tiempo promedio en página > 3 minutos

## 📊 Roadmap por Fases

### Fase 1: MVP Core (Meses 1-3)
- [x] Documentación inicial
- [ ] Setup técnico inicial
- [ ] Scraping básico AliExpress/SHEIN
- [ ] Trust Score v1 con IA
- [ ] UI/UX básica
- [ ] Análisis de reviews con IA

### Fase 2: Expansión B2C (Meses 4-6)
- [ ] Soporte para Temu y Alibaba (B2C)
- [ ] Traducción automática con IA
- [ ] Comparación inteligente de precios
- [ ] Sistema de usuarios básico
- [ ] Favoritos y alertas de precios

### Fase 3: Monetización (Meses 7-9)
- [ ] Integración con programas de afiliados
- [ ] Tracking de conversiones
- [ ] Dashboard de analytics
- [ ] SEO y content marketing
- [ ] Optimización de revenue

### Fase 4: B2B Features (Meses 10-12)
- [ ] Análisis masivo de proveedores
- [ ] Herramientas de sourcing
- [ ] Integración con MOQ y precios por volumen
- [ ] CRM básico para proveedores
- [ ] Planes de pago B2B

## 🤖 Uso de IA en Cada Feature

### Trust Score Inteligente
- **Problema**: Ratings manipulados, información inconsistente
- **IA**: Algoritmo de ML que analiza patrones en:
  - Histórico de ratings vs ventas
  - Velocidad de acumulación de reviews
  - Correlación entre precio y calidad reportada
- **Modelo**: Ensemble de Random Forest + regresión logística
- **Datos**: Reviews, ratings, tiempo de respuesta, disputas

### Análisis de Reviews con NLP
- **Problema**: Reviews falsas, idioma confuso, volumen masivo
- **IA**: Pipeline de NLP para:
  - Detección de reviews generadas por bots
  - Análisis de sentimiento por aspectos (calidad, envío, servicio)
  - Extracción de entidades (defectos comunes, fortalezas)
- **Modelo**: BERT fine-tuned + clasificadores personalizados
- **Output**: Resumen de 2-3 frases con pros/cons principales

### Traducción y Simplificación
- **Problema**: Descripciones confusas, inglés/chino mezclado
- **IA**: GPT-4o para:
  - Traducción contextual (no literal)
  - Simplificación de especificaciones técnicas
  - Detección de claims exagerados o misleading
- **Prompt Engineering**: Templates específicos por categoría de producto

### Comparación Inteligente
- **Problema**: Productos similares con especificaciones diferentes
- **IA**: Embeddings para:
  - Matching de productos similares cross-platform
  - Normalización de especificaciones
  - Recomendación de alternativas
- **Modelo**: Vector similarity con text-embedding-3-large

## 💰 Modelo de Monetización

### Fase 1: Afiliados (0-6 meses)
- Comisiones por ventas dirigidas a plataformas
- Revenue share: 3-8% dependiendo de la plataforma
- Objetivo: $1K-5K MRR

### Fase 2: Freemium (6-12 meses)
- Límite de búsquedas gratuitas (50/mes)
- Plan Premium: $9.99/mes (búsquedas ilimitadas + features avanzadas)
- Objetivo: $10K-25K MRR

### Fase 3: B2B (12+ meses)
- Planes empresariales: $49-199/mes
- Herramientas de sourcing masivo
- API access para integraciones
- Objetivo: $50K+ MRR

## ⚠️ Riesgos y Desafíos Identificados

### Técnicos
- **Blocking de scraping**: Detección y bloqueo por plataformas
- **Rate limiting**: Limitaciones en velocidad de extracción
- **Cambios de estructura**: Websites que cambian layout
- **Mitigación**: Proxies rotativos, múltiples estrategias, monitoreo

### Legales
- **ToS violations**: Violación de términos de servicio
- **Copyright**: Uso de imágenes y descripciones
- **Mitigación**: Consultoría legal, fair use, attribution

### Negocio
- **Dependencia de plataformas**: Cambios en programas de afiliados
- **Competencia**: Grandes players que copien la idea
- **Mitigación**: Diversificación, moat tecnológico con IA

### Operacionales
- **Costos de IA**: Llamadas a APIs de OpenAI escalando
- **Infraestructura**: Costos de proxies y compute
- **Mitigación**: Optimización de prompts, caché inteligente

## 📝 Notas y Decisiones Tomadas

### Decisiones Arquitectónicas
- **Fecha**: 2025-07-05
- **Decisión**: Next.js + Node.js como stack principal
- **Razón**: Rápido desarrollo, comunidad, facilidad de deployment

### Decisiones de IA
- **Fecha**: 2025-07-05
- **Decisión**: OpenAI GPT-4o como LLM principal
- **Razón**: Mejor performance en análisis de texto multiidioma

### Decisiones de Monetización
- **Fecha**: 2025-07-05
- **Decisión**: Empezar con afiliados, no freemium desde día 1
- **Razón**: Validar product-market fit antes de paywall

## 🔄 Próximos Pasos

### Esta Semana ✅ COMPLETADO
1. ✅ Setup del repositorio y estructura inicial
2. ✅ Investigación técnica de APIs disponibles
3. ✅ Prototipo de scraping básico
4. ✅ Diseño de arquitectura de base de datos

### Próximas 2 Semanas (EN PROGRESO)
1. [ ] Implementación de scraping robusto
2. [ ] Primer modelo de Trust Score
3. [ ] UI básica para búsqueda
4. [ ] Pipeline de análisis de reviews

### Próximo Mes
1. [ ] Integración completa IA + scraping
2. [ ] Testing con usuarios reales
3. [ ] Optimización de performance
4. [ ] Preparación para launch beta

---

## 📊 PROGRESO ACTUAL (2025-07-05)

### ✅ Fundaciones Completadas:
- **Next.js 14 + TypeScript** configurado con App Router
- **Prisma** con schema completo para productos, vendors, reviews
- **Redis** configurado para caché inteligente con ioredis
- **Estructura de carpetas** y tipos TypeScript definidos
- **UI básica** con enfoque en UX (landing page funcional)
- **Sistema de commits** y documentación actualizada

### ✅ Funcionalidad Core Implementada:
- **Scraping real de AliExpress** con Puppeteer funcionando
- **API de búsqueda** con endpoints para productos y estadísticas
- **Frontend funcional** con página de resultados y componentes UX
- **Caché inteligente** para optimizar performance
- **Sistema de logging** para monitoreo de scraping
- **Trust Score básico** (calculado desde rating del vendedor)

### 🎯 Próximo Objetivo: 
Integración con IA para análisis de reviews y Trust Score avanzado

### 🚀 APLICACIÓN FUNCIONANDO:
- **Servidor:** `http://localhost:3001`
- **Búsqueda real:** Conectada con AliExpress
- **Base de datos:** Schema listo para datos reales
- **UI/UX:** Responsive y profesional

---

*Documento actualizado: 2025-07-05*
*Próxima revisión: 2025-07-12*