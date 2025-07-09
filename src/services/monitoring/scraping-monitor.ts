import { Platform } from '@prisma/client'
import { CacheService } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { getProxyManager } from '../proxies/proxy-manager'

export interface ScrapingMetrics {
  platform: Platform
  timestamp: Date
  requestsPerMinute: number
  successRate: number
  averageResponseTime: number
  blockedRequests: number
  captchaEncountered: number
  proxiesUsed: number
  errorsCount: number
  totalProducts: number
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
  redisConnection: boolean
  databaseConnection: boolean
  proxyHealth: {
    healthy: number
    total: number
    successRate: number
  }
}

export interface Alert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: Date
  platform?: Platform
  resolved: boolean
  details?: any
}

export class ScrapingMonitor {
  private cache: CacheService
  private proxyManager = getProxyManager()
  private metrics: Map<Platform, ScrapingMetrics> = new Map()
  private alerts: Alert[] = []
  private startTime = Date.now()
  private isMonitoring = false

  constructor() {
    this.cache = CacheService.getInstance()
    this.initializeMetrics()
    this.startMonitoring()
  }

  /**
   * Inicializar métricas por plataforma
   */
  private initializeMetrics(): void {
    const platforms = [Platform.ALIEXPRESS, Platform.SHEIN, Platform.TEMU, Platform.ALIBABA]
    
    platforms.forEach(platform => {
      this.metrics.set(platform, {
        platform,
        timestamp: new Date(),
        requestsPerMinute: 0,
        successRate: 0,
        averageResponseTime: 0,
        blockedRequests: 0,
        captchaEncountered: 0,
        proxiesUsed: 0,
        errorsCount: 0,
        totalProducts: 0
      })
    })
  }

  /**
   * Iniciar monitoreo automático
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    // Recopilar métricas cada minuto
    setInterval(() => {
      this.collectMetrics()
    }, 60000)
    
    // Verificar salud del sistema cada 30 segundos
    setInterval(() => {
      this.checkSystemHealth()
    }, 30000)
    
    // Limpiar alertas antiguas cada hora
    setInterval(() => {
      this.cleanupAlerts()
    }, 3600000)
    
    console.log('[Monitor] Scraping monitoring started')
  }

  /**
   * Recopilar métricas de todas las plataformas
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Obtener métricas de base de datos
      const dbMetrics = await this.getDbMetrics()
      
      // Obtener métricas de proxy
      const proxyStats = this.proxyManager.getStats()
      
      // Actualizar métricas por plataforma
      for (const [platform, metrics] of this.metrics.entries()) {
        const platformMetrics = dbMetrics.find(m => m.platform === platform)
        if (platformMetrics) {
          metrics.requestsPerMinute = platformMetrics.requestsPerMinute
          metrics.successRate = platformMetrics.successRate
          metrics.averageResponseTime = platformMetrics.averageResponseTime
          metrics.errorsCount = platformMetrics.errorsCount
          metrics.totalProducts = platformMetrics.totalProducts
          metrics.timestamp = new Date()
        }
        
        // Métricas de proxy para esta plataforma
        const platformProxyStats = proxyStats.filter(s => s.stats.platform === platform)
        metrics.proxiesUsed = platformProxyStats.length
      }
      
      // Guardar métricas en cache
      await this.cache.set('scraping:metrics', Object.fromEntries(this.metrics), 300)
      
    } catch (error) {
      console.error('[Monitor] Error collecting metrics:', error)
      this.createAlert('error', 'Failed to collect scraping metrics', { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  /**
   * Obtener métricas de base de datos
   */
  private async getDbMetrics(): Promise<Array<{
    platform: Platform
    requestsPerMinute: number
    successRate: number
    averageResponseTime: number
    errorsCount: number
    totalProducts: number
  }>> {
    if (!prisma) return []
    
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      // Obtener logs de scraping de la última hora
      const logs = await prisma.scrapingLog.findMany({
        where: {
          createdAt: {
            gte: oneHourAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      // Agrupar por plataforma
      const platformGroups = logs.reduce((groups, log) => {
        if (!groups[log.platform]) {
          groups[log.platform] = []
        }
        groups[log.platform].push(log)
        return groups
      }, {} as Record<Platform, any[]>)
      
      // Calcular métricas por plataforma
      const result = Object.entries(platformGroups).map(([platform, logs]) => {
        const totalRequests = logs.length
        const successfulRequests = logs.filter(log => log.status === 'success').length
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
        
        const averageResponseTime = logs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalRequests
        const requestsPerMinute = totalRequests / 60 // Aproximación
        const errorsCount = logs.filter(log => log.status === 'failed').length
        
        return {
          platform: platform as Platform,
          requestsPerMinute,
          successRate,
          averageResponseTime,
          errorsCount,
          totalProducts: 0 // Se calcularía desde la tabla products
        }
      })
      
      return result
      
    } catch (error) {
      console.error('[Monitor] Error getting DB metrics:', error)
      return []
    }
  }

  /**
   * Verificar salud del sistema
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      const health = await this.getSystemHealth()
      
      // Verificar alertas basadas en salud
      if (health.status === 'unhealthy') {
        this.createAlert('error', 'System is unhealthy', health)
      } else if (health.status === 'degraded') {
        this.createAlert('warning', 'System performance is degraded', health)
      }
      
      // Verificar conexiones
      if (!health.redisConnection) {
        this.createAlert('error', 'Redis connection failed')
      }
      
      if (!health.databaseConnection) {
        this.createAlert('error', 'Database connection failed')
      }
      
      // Verificar proxy health
      if (health.proxyHealth.successRate < 50) {
        this.createAlert('warning', 'Proxy success rate is low', health.proxyHealth)
      }
      
    } catch (error) {
      console.error('[Monitor] Error checking system health:', error)
    }
  }

  /**
   * Obtener salud del sistema
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const uptime = Date.now() - this.startTime
    
    // Verificar conexión Redis
    let redisConnection = false
    try {
      await this.cache.set('health:check', 'ok', 60)
      redisConnection = true
    } catch (error) {
      redisConnection = false
    }
    
    // Verificar conexión base de datos
    let databaseConnection = false
    try {
      if (prisma) {
        await prisma.$queryRaw`SELECT 1`
        databaseConnection = true
      }
    } catch (error) {
      databaseConnection = false
    }
    
    // Obtener salud de proxies
    const proxyHealth = await this.proxyManager.healthCheck()
    const proxyStats = this.proxyManager.getStats()
    const totalProxyRequests = proxyStats.reduce((sum, stat) => sum + stat.stats.totalRequests, 0)
    const successfulProxyRequests = proxyStats.reduce((sum, stat) => sum + stat.stats.successfulRequests, 0)
    const proxySuccessRate = totalProxyRequests > 0 ? (successfulProxyRequests / totalProxyRequests) * 100 : 0
    
    // Métricas del sistema
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    // Determinar estado general
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (!redisConnection || !databaseConnection || proxyHealth.healthy === 0) {
      status = 'unhealthy'
    } else if (proxySuccessRate < 80 || proxyHealth.healthy < proxyHealth.total * 0.5) {
      status = 'degraded'
    }
    
    return {
      status,
      uptime,
      memoryUsage: memoryUsage.rss / 1024 / 1024, // MB
      cpuUsage: cpuUsage.user / 1000000, // seconds
      diskUsage: 0, // TODO: implementar si es necesario
      redisConnection,
      databaseConnection,
      proxyHealth: {
        healthy: proxyHealth.healthy,
        total: proxyHealth.total,
        successRate: proxySuccessRate
      }
    }
  }

  /**
   * Crear alerta
   */
  private createAlert(type: Alert['type'], message: string, details?: any, platform?: Platform): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      platform,
      resolved: false,
      details
    }
    
    this.alerts.push(alert)
    console.log(`[Monitor] Alert created: ${type.toUpperCase()} - ${message}`)
    
    // Mantener solo las últimas 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  /**
   * Limpiar alertas antiguas
   */
  private cleanupAlerts(): void {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() > twentyFourHoursAgo)
  }

  /**
   * Registrar evento de scraping
   */
  async recordScrapingEvent(
    platform: Platform,
    success: boolean,
    responseTime: number,
    productsCount: number,
    error?: string
  ): Promise<void> {
    const metrics = this.metrics.get(platform)
    if (metrics) {
      if (success) {
        metrics.totalProducts += productsCount
      } else {
        metrics.errorsCount++
        if (error?.includes('captcha') || error?.includes('robot')) {
          metrics.captchaEncountered++
        }
        if (error?.includes('blocked') || error?.includes('denied')) {
          metrics.blockedRequests++
        }
      }
      
      // Actualizar average response time
      metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2
      
      // Crear alerta si hay muchos errores
      if (metrics.errorsCount > 5) {
        this.createAlert('warning', `High error rate for ${platform}`, { 
          errorsCount: metrics.errorsCount,
          platform 
        }, platform)
      }
    }
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics(): Map<Platform, ScrapingMetrics> {
    return new Map(this.metrics)
  }

  /**
   * Obtener alertas activas
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Obtener todas las alertas
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts]
  }

  /**
   * Resolver alerta
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      console.log(`[Monitor] Alert resolved: ${alertId}`)
    }
  }

  /**
   * Obtener resumen de rendimiento
   */
  getPerformanceSummary(): {
    totalRequests: number
    overallSuccessRate: number
    averageResponseTime: number
    activeAlerts: number
    systemHealth: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const allMetrics = Array.from(this.metrics.values())
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requestsPerMinute, 0)
    const overallSuccessRate = allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length
    const averageResponseTime = allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length
    const activeAlerts = this.getActiveAlerts().length
    
    let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (activeAlerts > 3 || overallSuccessRate < 50) {
      systemHealth = 'unhealthy'
    } else if (activeAlerts > 1 || overallSuccessRate < 80) {
      systemHealth = 'degraded'
    }
    
    return {
      totalRequests,
      overallSuccessRate,
      averageResponseTime,
      activeAlerts,
      systemHealth
    }
  }
}

// Singleton
let scrapingMonitor: ScrapingMonitor | null = null

export function getScrapingMonitor(): ScrapingMonitor {
  if (!scrapingMonitor) {
    scrapingMonitor = new ScrapingMonitor()
  }
  return scrapingMonitor
}