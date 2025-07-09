import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined
}

// Configurar Redis con fallback silencioso si no está disponible
let redisInstance: Redis | null = null

try {
  redisInstance = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    connectTimeout: 1000,
    lazyConnect: true,
    maxRetriesPerRequest: 1
  })
  
  // Silenciar errores de conexión para desarrollo
  redisInstance.on('error', (err) => {
    console.log('[Redis] Connection unavailable, using memory fallback')
  })
} catch (error) {
  console.log('[Redis] Not available, using memory fallback')
  redisInstance = null
}

export const redis = globalForRedis.redis ?? redisInstance

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Utilidades de caché
export class CacheService {
  private static instance: CacheService
  private redis: Redis | null
  private memoryCache: Map<string, { value: any, expires: number }> = new Map()

  private constructor() {
    this.redis = redis
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value))
      } else {
        // Fallback a memoria
        const expires = Date.now() + (ttl * 1000)
        this.memoryCache.set(key, { value, expires })
      }
    } catch (error) {
      console.log('[Cache] Using memory fallback for set:', key)
      const expires = Date.now() + (ttl * 1000)
      this.memoryCache.set(key, { value, expires })
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get(key)
        return value ? JSON.parse(value) : null
      } else {
        // Fallback a memoria
        const cached = this.memoryCache.get(key)
        if (cached && cached.expires > Date.now()) {
          return cached.value
        }
        if (cached) this.memoryCache.delete(key) // Expirado
        return null
      }
    } catch (error) {
      console.log('[Cache] Using memory fallback for get:', key)
      const cached = this.memoryCache.get(key)
      if (cached && cached.expires > Date.now()) {
        return cached.value
      }
      if (cached) this.memoryCache.delete(key)
      return null
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key)
      }
      this.memoryCache.delete(key)
    } catch (error) {
      console.log('[Cache] Using memory fallback for del:', key)
      this.memoryCache.delete(key)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        const result = await this.redis.exists(key)
        return result === 1
      } else {
        const cached = this.memoryCache.get(key)
        return cached ? cached.expires > Date.now() : false
      }
    } catch (error) {
      console.log('[Cache] Using memory fallback for exists:', key)
      const cached = this.memoryCache.get(key)
      return cached ? cached.expires > Date.now() : false
    }
  }

  // Caché específico para productos
  async cacheSearchResults(query: string, platform: string, results: any, ttl: number = 1800): Promise<void> {
    const key = `search:${query}:${platform}`
    await this.set(key, results, ttl)
  }

  async getCachedSearchResults(query: string, platform: string): Promise<any | null> {
    const key = `search:${query}:${platform}`
    return await this.get(key)
  }

  // Caché para análisis de IA
  async cacheAIAnalysis(content: string, analysis: any, ttl: number = 86400): Promise<void> {
    const key = `ai:${Buffer.from(content).toString('base64').substring(0, 32)}`
    await this.set(key, analysis, ttl)
  }

  async getCachedAIAnalysis(content: string): Promise<any | null> {
    const key = `ai:${Buffer.from(content).toString('base64').substring(0, 32)}`
    return await this.get(key)
  }

  // Caché para Trust Score
  async cacheTrustScore(vendorId: string, score: any, ttl: number = 3600): Promise<void> {
    const key = `trust:${vendorId}`
    await this.set(key, score, ttl)
  }

  async getCachedTrustScore(vendorId: string): Promise<any | null> {
    const key = `trust:${vendorId}`
    return await this.get(key)
  }
}