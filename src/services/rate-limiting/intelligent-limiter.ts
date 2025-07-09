import { Platform } from '@prisma/client'
import { CacheService } from '@/lib/redis'
import { getScrapingMonitor } from '../monitoring/scraping-monitor'

export interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  burstLimit: number
  cooldownPeriod: number
  adaptiveScaling: boolean
  platform: Platform
}

export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
  retryAfter?: number
  reason?: string
}

export interface RateLimitStats {
  currentRequests: number
  totalRequests: number
  blockedRequests: number
  successRate: number
  averageWaitTime: number
  platform: Platform
}

export class IntelligentRateLimiter {
  private cache: CacheService
  private monitor = getScrapingMonitor()
  private configs: Map<Platform, RateLimitConfig> = new Map()
  private stats: Map<Platform, RateLimitStats> = new Map()
  
  constructor() {
    this.cache = CacheService.getInstance()
    this.initializeConfigs()
    this.startAdaptiveScaling()
  }

  /**
   * Inicializar configuraciones por plataforma
   */
  private initializeConfigs(): void {
    // Configuración conservadora para AliExpress
    this.configs.set(Platform.ALIEXPRESS, {
      requestsPerMinute: 10,
      requestsPerHour: 300,
      requestsPerDay: 5000,
      burstLimit: 3,
      cooldownPeriod: 60000, // 1 minuto
      adaptiveScaling: true,
      platform: Platform.ALIEXPRESS
    })

    // Configuración para SHEIN API
    this.configs.set(Platform.SHEIN, {
      requestsPerMinute: 20,
      requestsPerHour: 500,
      requestsPerDay: 10000,
      burstLimit: 5,
      cooldownPeriod: 30000, // 30 segundos
      adaptiveScaling: true,
      platform: Platform.SHEIN
    })

    // Configuración para Temu
    this.configs.set(Platform.TEMU, {
      requestsPerMinute: 8,
      requestsPerHour: 200,
      requestsPerDay: 3000,
      burstLimit: 2,
      cooldownPeriod: 90000, // 1.5 minutos
      adaptiveScaling: true,
      platform: Platform.TEMU
    })

    // Configuración para Alibaba
    this.configs.set(Platform.ALIBABA, {
      requestsPerMinute: 5,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstLimit: 2,
      cooldownPeriod: 120000, // 2 minutos
      adaptiveScaling: true,
      platform: Platform.ALIBABA
    })

    // Inicializar stats
    this.configs.forEach((config, platform) => {
      this.stats.set(platform, {
        currentRequests: 0,
        totalRequests: 0,
        blockedRequests: 0,
        successRate: 100,
        averageWaitTime: 0,
        platform
      })
    })
  }

  /**
   * Verificar si se permite una request
   */
  async checkRateLimit(platform: Platform): Promise<RateLimitResult> {
    const config = this.configs.get(platform)
    if (!config) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + 60000,
        reason: 'Platform not configured'
      }
    }

    const now = Date.now()
    const stats = this.stats.get(platform)!

    // Verificar límites en diferentes ventanas de tiempo
    const minuteCheck = await this.checkTimeWindow(platform, 'minute', config.requestsPerMinute)
    const hourCheck = await this.checkTimeWindow(platform, 'hour', config.requestsPerHour)
    const dayCheck = await this.checkTimeWindow(platform, 'day', config.requestsPerDay)
    const burstCheck = await this.checkBurstLimit(platform, config.burstLimit)

    // Verificar período de cooldown
    const cooldownCheck = await this.checkCooldown(platform, config.cooldownPeriod)

    // Determinar si la request está permitida
    const allowed = minuteCheck.allowed && hourCheck.allowed && dayCheck.allowed && 
                   burstCheck.allowed && cooldownCheck.allowed

    if (!allowed) {
      stats.blockedRequests++
      this.stats.set(platform, stats)
      
      // Encontrar el tiempo de reset más cercano
      const resetTimes = [minuteCheck, hourCheck, dayCheck, burstCheck, cooldownCheck]
        .filter(check => !check.allowed)
        .map(check => check.resetTime)
      
      const nearestReset = Math.min(...resetTimes)
      const retryAfter = nearestReset - now

      return {
        allowed: false,
        remainingRequests: Math.min(
          minuteCheck.remainingRequests,
          hourCheck.remainingRequests,
          dayCheck.remainingRequests,
          burstCheck.remainingRequests
        ),
        resetTime: nearestReset,
        retryAfter: Math.max(0, retryAfter),
        reason: this.getBlockReason(minuteCheck, hourCheck, dayCheck, burstCheck, cooldownCheck)
      }
    }

    // Incrementar contadores
    await this.incrementCounters(platform)
    stats.currentRequests++
    stats.totalRequests++
    this.stats.set(platform, stats)

    return {
      allowed: true,
      remainingRequests: Math.min(
        minuteCheck.remainingRequests - 1,
        hourCheck.remainingRequests - 1,
        dayCheck.remainingRequests - 1
      ),
      resetTime: Math.max(minuteCheck.resetTime, hourCheck.resetTime, dayCheck.resetTime)
    }
  }

  /**
   * Verificar ventana de tiempo específica
   */
  private async checkTimeWindow(platform: Platform, window: 'minute' | 'hour' | 'day', limit: number): Promise<{
    allowed: boolean
    remainingRequests: number
    resetTime: number
  }> {
    const now = Date.now()
    const windowMs = window === 'minute' ? 60000 : window === 'hour' ? 3600000 : 86400000
    const windowStart = Math.floor(now / windowMs) * windowMs
    const cacheKey = `rate_limit:${platform}:${window}:${windowStart}`

    const currentCount = await this.cache.get<number>(cacheKey) || 0
    const allowed = currentCount < limit
    const remainingRequests = Math.max(0, limit - currentCount)
    const resetTime = windowStart + windowMs

    return {
      allowed,
      remainingRequests,
      resetTime
    }
  }

  /**
   * Verificar límite de burst
   */
  private async checkBurstLimit(platform: Platform, limit: number): Promise<{
    allowed: boolean
    remainingRequests: number
    resetTime: number
  }> {
    const now = Date.now()
    const burstWindow = 10000 // 10 segundos
    const windowStart = Math.floor(now / burstWindow) * burstWindow
    const cacheKey = `burst_limit:${platform}:${windowStart}`

    const currentCount = await this.cache.get<number>(cacheKey) || 0
    const allowed = currentCount < limit
    const remainingRequests = Math.max(0, limit - currentCount)
    const resetTime = windowStart + burstWindow

    return {
      allowed,
      remainingRequests,
      resetTime
    }
  }

  /**
   * Verificar período de cooldown
   */
  private async checkCooldown(platform: Platform, cooldownPeriod: number): Promise<{
    allowed: boolean
    remainingRequests: number
    resetTime: number
  }> {
    const cacheKey = `cooldown:${platform}`
    const lastFailure = await this.cache.get<number>(cacheKey)

    if (lastFailure) {
      const timeSinceFailure = Date.now() - lastFailure
      const allowed = timeSinceFailure > cooldownPeriod
      return {
        allowed,
        remainingRequests: allowed ? 1 : 0,
        resetTime: lastFailure + cooldownPeriod
      }
    }

    return {
      allowed: true,
      remainingRequests: 1,
      resetTime: Date.now() + cooldownPeriod
    }
  }

  /**
   * Incrementar contadores
   */
  private async incrementCounters(platform: Platform): Promise<void> {
    const now = Date.now()
    
    // Incrementar contador por minuto
    const minuteStart = Math.floor(now / 60000) * 60000
    const minuteKey = `rate_limit:${platform}:minute:${minuteStart}`
    await this.cache.increment(minuteKey, 60)
    
    // Incrementar contador por hora
    const hourStart = Math.floor(now / 3600000) * 3600000
    const hourKey = `rate_limit:${platform}:hour:${hourStart}`
    await this.cache.increment(hourKey, 3600)
    
    // Incrementar contador por día
    const dayStart = Math.floor(now / 86400000) * 86400000
    const dayKey = `rate_limit:${platform}:day:${dayStart}`
    await this.cache.increment(dayKey, 86400)
    
    // Incrementar contador de burst
    const burstStart = Math.floor(now / 10000) * 10000
    const burstKey = `burst_limit:${platform}:${burstStart}`
    await this.cache.increment(burstKey, 10)
  }

  /**
   * Obtener razón del bloqueo
   */
  private getBlockReason(
    minuteCheck: any,
    hourCheck: any,
    dayCheck: any,
    burstCheck: any,
    cooldownCheck: any
  ): string {
    if (!minuteCheck.allowed) return 'Minute limit exceeded'
    if (!hourCheck.allowed) return 'Hour limit exceeded'
    if (!dayCheck.allowed) return 'Day limit exceeded'
    if (!burstCheck.allowed) return 'Burst limit exceeded'
    if (!cooldownCheck.allowed) return 'Cooldown period active'
    return 'Unknown reason'
  }

  /**
   * Reportar fallo (activa cooldown)
   */
  async reportFailure(platform: Platform, errorType: 'blocked' | 'rate_limited' | 'timeout' | 'other'): Promise<void> {
    const config = this.configs.get(platform)
    if (!config) return

    const stats = this.stats.get(platform)!
    stats.blockedRequests++
    stats.successRate = (stats.successRate * 0.9) + (0 * 0.1) // Decay success rate
    
    // Activar cooldown según tipo de error
    let cooldownPeriod = config.cooldownPeriod
    if (errorType === 'blocked' || errorType === 'rate_limited') {
      cooldownPeriod *= 2 // Doblar cooldown para bloqueos
    }

    const cacheKey = `cooldown:${platform}`
    await this.cache.set(cacheKey, Date.now(), cooldownPeriod / 1000)
    
    console.log(`[Rate Limiter] Cooldown activated for ${platform}: ${cooldownPeriod}ms`)
    
    // Ajustar límites adaptativamente
    if (config.adaptiveScaling) {
      await this.adjustLimits(platform, 'decrease')
    }
  }

  /**
   * Reportar éxito
   */
  async reportSuccess(platform: Platform, responseTime: number): Promise<void> {
    const stats = this.stats.get(platform)!
    stats.currentRequests = Math.max(0, stats.currentRequests - 1)
    stats.successRate = (stats.successRate * 0.9) + (100 * 0.1) // Improve success rate
    stats.averageWaitTime = (stats.averageWaitTime * 0.9) + (responseTime * 0.1)

    const config = this.configs.get(platform)!
    
    // Ajustar límites adaptativamente si va bien
    if (config.adaptiveScaling && stats.successRate > 90) {
      await this.adjustLimits(platform, 'increase')
    }
  }

  /**
   * Ajustar límites adaptativamente
   */
  private async adjustLimits(platform: Platform, direction: 'increase' | 'decrease'): Promise<void> {
    const config = this.configs.get(platform)!
    const factor = direction === 'increase' ? 1.1 : 0.8
    
    const newConfig = {
      ...config,
      requestsPerMinute: Math.max(1, Math.round(config.requestsPerMinute * factor)),
      requestsPerHour: Math.max(10, Math.round(config.requestsPerHour * factor)),
      requestsPerDay: Math.max(100, Math.round(config.requestsPerDay * factor))
    }
    
    this.configs.set(platform, newConfig)
    
    console.log(`[Rate Limiter] Adjusted limits for ${platform}: ${direction}`, {
      requestsPerMinute: newConfig.requestsPerMinute,
      requestsPerHour: newConfig.requestsPerHour
    })
  }

  /**
   * Obtener estadísticas
   */
  getStats(): Map<Platform, RateLimitStats> {
    return new Map(this.stats)
  }

  /**
   * Obtener configuración actual
   */
  getCurrentConfig(platform: Platform): RateLimitConfig | undefined {
    return this.configs.get(platform)
  }

  /**
   * Actualizar configuración
   */
  updateConfig(platform: Platform, config: Partial<RateLimitConfig>): void {
    const currentConfig = this.configs.get(platform)
    if (currentConfig) {
      this.configs.set(platform, { ...currentConfig, ...config })
    }
  }

  /**
   * Iniciar escalado adaptativo
   */
  private startAdaptiveScaling(): void {
    setInterval(() => {
      this.performAdaptiveScaling()
    }, 5 * 60 * 1000) // Cada 5 minutos
  }

  /**
   * Realizar escalado adaptativo
   */
  private async performAdaptiveScaling(): Promise<void> {
    for (const [platform, config] of this.configs.entries()) {
      if (!config.adaptiveScaling) continue

      const stats = this.stats.get(platform)!
      const health = await this.monitor.getSystemHealth()

      // Ajustar según salud del sistema
      if (health.status === 'unhealthy') {
        await this.adjustLimits(platform, 'decrease')
      } else if (health.status === 'healthy' && stats.successRate > 95) {
        await this.adjustLimits(platform, 'increase')
      }
    }
  }

  /**
   * Esperar hasta que se permita la próxima request
   */
  async waitForNextRequest(platform: Platform): Promise<void> {
    const result = await this.checkRateLimit(platform)
    
    if (!result.allowed && result.retryAfter) {
      console.log(`[Rate Limiter] Waiting ${result.retryAfter}ms for ${platform}`)
      await new Promise(resolve => setTimeout(resolve, result.retryAfter))
    }
  }

  /**
   * Obtener tiempo estimado de espera
   */
  async getEstimatedWaitTime(platform: Platform): Promise<number> {
    const result = await this.checkRateLimit(platform)
    return result.retryAfter || 0
  }
}

// Singleton
let rateLimiter: IntelligentRateLimiter | null = null

export function getRateLimiter(): IntelligentRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new IntelligentRateLimiter()
  }
  return rateLimiter
}