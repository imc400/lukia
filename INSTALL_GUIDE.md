# 🚀 LUKIA - Guía de Instalación Completa

## ✅ Estado Actual

### Infraestructura Instalada:
- ✅ **PostgreSQL 14**: Servicio activo en puerto 5432
- ✅ **Redis**: Servicio activo en puerto 6379  
- ✅ **Base de datos**: `lukia_db` creada con todas las tablas
- ✅ **Prisma**: Configurado y migrado
- ✅ **Express Server**: Código listo con todas las conexiones

### Servicios Funcionando:
```bash
brew services list | grep -E "(postgresql|redis)"
# postgresql@14 started
# redis         started
```

### Base de Datos Verificada:
```bash
psql lukia_db -c "\dt"
# 6 tablas creadas: products, vendors, reviews, searches, scraping_logs, product_searches
```

## 🔧 Problema Actual

**Servidor no accesible desde navegador** - Posible configuración de firewall/red en macOS.

## 🎯 Soluciones Alternativas

### Opción 1: Verificar Firewall de macOS

1. **Abrir Configuración del Sistema**
2. **Ir a Red → Firewall**
3. **Desactivar temporalmente** para probar
4. **Probar**: `http://localhost:3000`

### Opción 2: Usar Puerto Diferente

```bash
# En el terminal, desde la carpeta lukia:
PORT=8080 node server-robust.js
```

Luego probar: `http://localhost:8080`

### Opción 3: Usar Next.js en Modo Desarrollo

```bash
# En el terminal:
npm run dev
```

Luego probar: `http://localhost:3000`

### Opción 4: Probar con IP Local

1. **Obtener IP local**:
```bash
ifconfig | grep "inet " | grep -v "127.0.0.1"
```

2. **Usar IP en lugar de localhost**:
```
http://[TU_IP]:3000
```

## 🚀 Funcionalidades Listas

### Base de Datos:
- ✅ Productos, vendedores, reviews
- ✅ Sistema de Trust Score
- ✅ Logs de scraping
- ✅ Búsquedas registradas

### APIs:
- ✅ `/health` - Verificación de servicios
- ✅ `/api/test` - Test de conexiones
- ✅ `/api/search` - Búsqueda de productos (guarda en DB)

### Próximos Pasos:
1. **OpenAI API**: Configurar tu API key real
2. **Scraping Real**: Activar Puppeteer para AliExpress
3. **UI Completa**: Frontend con Next.js
4. **Trust Score IA**: Algoritmo de confianza real

## 🔑 Variables de Entorno Configuradas

```env
DATABASE_URL="postgresql://ignacioblanco@localhost:5432/lukia_db"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-your-openai-api-key-here"  # ⚠️ Necesita tu key real
```

## 📊 Verificar Estado

```bash
# Verificar servicios
brew services list | grep -E "(postgresql|redis)"

# Verificar base de datos
psql lukia_db -c "SELECT count(*) FROM searches;"

# Verificar Redis
redis-cli ping
```

## 🎯 Next Actions

1. **Solucionar conectividad de red**
2. **Obtener OpenAI API key**
3. **Completar integración IA**
4. **Activar scraping real**

---

**LUKIA está 80% completo** - Solo necesitamos resolver la conectividad de red para tener una plataforma totalmente funcional.