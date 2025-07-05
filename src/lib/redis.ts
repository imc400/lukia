import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Utilidades de caché
export class CacheService {
  private static instance: CacheService
  private redis: Redis

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
      await this.redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis del error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
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