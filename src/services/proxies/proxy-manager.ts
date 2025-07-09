import { Platform } from '@prisma/client'
import { CacheService } from '@/lib/redis'

export interface ProxyConfig {
  host: string
  port: number
  username?: string
  password?: string
  protocol: 'http' | 'https' | 'socks5'
  country?: string
  provider: 'bright-data' | 'oxylabs' | 'local' | 'free'
  successRate: number
  lastUsed: number
  failureCount: number
  isActive: boolean
}

export interface ProxyStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastFailure?: Date
  platform: Platform
}

export class ProxyManager {
  private proxies: Map<string, ProxyConfig> = new Map()
  private stats: Map<string, ProxyStats> = new Map()
  private cache: CacheService
  private currentProxy: string | null = null
  private rotationInterval: number = 5 * 60 * 1000 // 5 minutos
  private maxFailures: number = 3
  private cooldownPeriod: number = 30 * 60 * 1000 // 30 minutos

  constructor() {
    this.cache = CacheService.getInstance()
    this.initializeProxies()
  }

  /**
   * Inicializar lista de proxies
   */
  private initializeProxies(): void {
    // Proxies premium (requieren suscripción)
    if (process.env.BRIGHT_DATA_PROXY_HOST) {
      this.addProxy({
        host: process.env.BRIGHT_DATA_PROXY_HOST,
        port: parseInt(process.env.BRIGHT_DATA_PROXY_PORT || '8080'),
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD,
        protocol: 'http',
        country: 'US',
        provider: 'bright-data',
        successRate: 95,
        lastUsed: 0,
        failureCount: 0,
        isActive: true
      })
    }

    if (process.env.OXYLABS_PROXY_HOST) {
      this.addProxy({
        host: process.env.OXYLABS_PROXY_HOST,
        port: parseInt(process.env.OXYLABS_PROXY_PORT || '8001'),
        username: process.env.OXYLABS_USERNAME,
        password: process.env.OXYLABS_PASSWORD,
        protocol: 'http',
        country: 'US',
        provider: 'oxylabs',
        successRate: 93,
        lastUsed: 0,
        failureCount: 0,
        isActive: true
      })
    }

    // Proxies gratuitos (fallback)
    this.addFreeProxies()
  }

  /**
   * Agregar proxies gratuitos como fallback
   */
  private addFreeProxies(): void {
    const freeProxies = [
      { host: '213.230.121.74', port: 3128, country: 'DE' },
      { host: '46.4.96.137', port: 8080, country: 'DE' },
      { host: '185.162.231.106', port: 80, country: 'NL' },
      { host: '20.111.54.16', port: 8123, country: 'US' },
      { host: '103.127.1.130', port: 80, country: 'BD' }
    ]

    freeProxies.forEach(proxy => {
      this.addProxy({
        host: proxy.host,
        port: proxy.port,
        protocol: 'http',
        country: proxy.country,
        provider: 'free',
        successRate: 60,
        lastUsed: 0,
        failureCount: 0,
        isActive: true
      })
    })
  }

  /**
   * Agregar proxy a la lista
   */
  private addProxy(config: ProxyConfig): void {
    const key = `${config.host}:${config.port}`
    this.proxies.set(key, config)
    this.stats.set(key, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      platform: Platform.ALIEXPRESS
    })
  }

  /**
   * Obtener el mejor proxy disponible para una plataforma
   */
  async getBestProxy(platform: Platform): Promise<ProxyConfig | null> {
    const availableProxies = Array.from(this.proxies.values())
      .filter(proxy => proxy.isActive)
      .filter(proxy => proxy.failureCount < this.maxFailures)
      .filter(proxy => Date.now() - proxy.lastUsed > this.rotationInterval)

    if (availableProxies.length === 0) {
      console.log('[Proxy] No available proxies, using direct connection')
      return null
    }

    // Ordenar por success rate y tiempo de uso
    availableProxies.sort((a, b) => {
      const scoreA = a.successRate - (a.failureCount * 10) - (Date.now() - a.lastUsed) / 1000
      const scoreB = b.successRate - (b.failureCount * 10) - (Date.now() - b.lastUsed) / 1000
      return scoreB - scoreA
    })

    const bestProxy = availableProxies[0]
    const key = `${bestProxy.host}:${bestProxy.port}`
    
    // Actualizar tiempo de uso
    bestProxy.lastUsed = Date.now()
    this.proxies.set(key, bestProxy)
    this.currentProxy = key

    console.log(`[Proxy] Selected proxy: ${key} (${bestProxy.provider}, success rate: ${bestProxy.successRate}%)`)
    return bestProxy
  }

  /**
   * Rotar proxy después de un número de requests
   */
  async rotateProxy(platform: Platform): Promise<ProxyConfig | null> {
    if (this.currentProxy) {
      const current = this.proxies.get(this.currentProxy)
      if (current) {
        current.lastUsed = Date.now()
        this.proxies.set(this.currentProxy, current)
      }
    }

    return this.getBestProxy(platform)
  }

  /**
   * Reportar éxito de proxy
   */
  async reportSuccess(proxy: ProxyConfig, responseTime: number): Promise<void> {
    const key = `${proxy.host}:${proxy.port}`
    const stats = this.stats.get(key)
    const config = this.proxies.get(key)

    if (stats && config) {
      stats.totalRequests++
      stats.successfulRequests++
      stats.averageResponseTime = (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests
      
      // Mejorar success rate
      config.successRate = Math.min(99, config.successRate + 0.1)
      config.failureCount = Math.max(0, config.failureCount - 1)
      
      this.stats.set(key, stats)
      this.proxies.set(key, config)
    }
  }

  /**
   * Reportar fallo de proxy
   */
  async reportFailure(proxy: ProxyConfig, error: string): Promise<void> {
    const key = `${proxy.host}:${proxy.port}`
    const stats = this.stats.get(key)
    const config = this.proxies.get(key)

    if (stats && config) {
      stats.totalRequests++
      stats.failedRequests++
      stats.lastFailure = new Date()
      
      // Degradar success rate
      config.successRate = Math.max(0, config.successRate - 5)
      config.failureCount++
      
      // Desactivar proxy si falla mucho
      if (config.failureCount >= this.maxFailures) {
        config.isActive = false
        console.log(`[Proxy] Deactivated proxy ${key} due to excessive failures`)
        
        // Reactivar después del cooldown
        setTimeout(() => {
          config.isActive = true
          config.failureCount = 0
          this.proxies.set(key, config)
          console.log(`[Proxy] Reactivated proxy ${key} after cooldown`)
        }, this.cooldownPeriod)
      }
      
      this.stats.set(key, stats)
      this.proxies.set(key, config)
    }

    console.log(`[Proxy] Failure reported for ${key}: ${error}`)
  }

  /**
   * Obtener estadísticas de proxies
   */
  getStats(): { proxy: string, stats: ProxyStats, config: ProxyConfig }[] {
    return Array.from(this.proxies.entries()).map(([key, config]) => ({
      proxy: key,
      stats: this.stats.get(key) || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        platform: Platform.ALIEXPRESS
      },
      config
    }))
  }

  /**
   * Limpiar proxies inactivos
   */
  async cleanup(): Promise<void> {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, config] of this.proxies.entries()) {
      if (!config.isActive && now - config.lastUsed > this.cooldownPeriod * 2) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => {
      this.proxies.delete(key)
      this.stats.delete(key)
    })

    if (keysToRemove.length > 0) {
      console.log(`[Proxy] Cleaned up ${keysToRemove.length} inactive proxies`)
    }
  }

  /**
   * Verificar salud de proxies
   */
  async healthCheck(): Promise<{ healthy: number, total: number }> {
    const total = this.proxies.size
    const healthy = Array.from(this.proxies.values())
      .filter(proxy => proxy.isActive && proxy.failureCount < this.maxFailures)
      .length

    return { healthy, total }
  }
}

// Singleton
let proxyManager: ProxyManager | null = null

export function getProxyManager(): ProxyManager {
  if (!proxyManager) {
    proxyManager = new ProxyManager()
  }
  return proxyManager
}