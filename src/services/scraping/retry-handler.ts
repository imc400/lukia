import { Platform } from '@prisma/client'
import { ProxyConfig, getProxyManager } from '../proxies/proxy-manager'
import { sleep } from '@/utils'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
  platform: Platform
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempt: number
  totalTime: number
  proxy?: ProxyConfig
}

export class RetryHandler {
  private proxyManager = getProxyManager()
  
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ERR_NETWORK',
      'ERR_TIMEOUT',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_RESET',
      'ERR_PROXY_CONNECTION_FAILED',
      'TimeoutError',
      'ProtocolError',
      'net::ERR_TIMED_OUT',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_PROXY_CONNECTION_FAILED'
    ],
    platform: Platform.ALIEXPRESS
  }

  /**
   * Ejecutar función con reintentos automáticos
   */
  async executeWithRetry<T>(
    fn: (proxy?: ProxyConfig) => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const startTime = Date.now()
    let lastError: Error | null = null
    let currentProxy: ProxyConfig | null = null

    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      try {
        // Obtener proxy para el intento
        if (attempt > 1 || currentProxy === null) {
          currentProxy = await this.proxyManager.getBestProxy(finalConfig.platform)
        }

        const attemptStartTime = Date.now()
        const result = await fn(currentProxy || undefined)
        const attemptTime = Date.now() - attemptStartTime

        // Reportar éxito
        if (currentProxy) {
          await this.proxyManager.reportSuccess(currentProxy, attemptTime)
        }

        return {
          success: true,
          data: result,
          attempt,
          totalTime: Date.now() - startTime,
          proxy: currentProxy || undefined
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const attemptTime = Date.now() - attemptStartTime

        // Reportar fallo del proxy
        if (currentProxy) {
          await this.proxyManager.reportFailure(currentProxy, lastError.message)
        }

        console.log(`[Retry] Attempt ${attempt} failed: ${lastError.message}`)

        // Verificar si el error es reintentable
        if (attempt <= finalConfig.maxRetries && this.isRetryableError(lastError, finalConfig)) {
          const delay = this.calculateDelay(attempt, finalConfig)
          console.log(`[Retry] Retrying in ${delay}ms...`)
          await sleep(delay)
          
          // Rotar proxy para el siguiente intento
          currentProxy = await this.proxyManager.rotateProxy(finalConfig.platform)
          continue
        }

        // Si no es reintentable o se agotaron los intentos
        break
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempt: finalConfig.maxRetries + 1,
      totalTime: Date.now() - startTime,
      proxy: currentProxy || undefined
    }
  }

  /**
   * Verificar si un error es reintentable
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''

    // Verificar errores específicos de red
    const networkErrors = [
      'timeout',
      'connection refused',
      'connection reset',
      'network error',
      'socket hang up',
      'econnreset',
      'econnrefused',
      'etimedout',
      'proxy',
      'captcha',
      'blocked',
      'rate limit',
      'too many requests'
    ]

    const hasNetworkError = networkErrors.some(pattern => 
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    )

    // Verificar errores configurados
    const hasConfiguredError = config.retryableErrors.some(pattern => 
      errorMessage.includes(pattern.toLowerCase()) || errorStack.includes(pattern.toLowerCase())
    )

    return hasNetworkError || hasConfiguredError
  }

  /**
   * Calcular delay con backoff exponencial
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay // 10% jitter
    return Math.min(exponentialDelay + jitter, config.maxDelay)
  }

  /**
   * Configuración específica para AliExpress
   */
  getAliExpressConfig(): Partial<RetryConfig> {
    return {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
      retryableErrors: [
        ...this.defaultConfig.retryableErrors,
        'Robot Check',
        'Access Denied',
        'Verification Required',
        'Please complete the security check',
        'slides.aliexpress.com'
      ],
      platform: Platform.ALIEXPRESS
    }
  }

  /**
   * Configuración específica para SHEIN
   */
  getSheinConfig(): Partial<RetryConfig> {
    return {
      maxRetries: 4,
      baseDelay: 1500,
      maxDelay: 45000,
      backoffMultiplier: 2,
      retryableErrors: [
        ...this.defaultConfig.retryableErrors,
        'Captcha',
        'Blocked',
        'Please verify'
      ],
      platform: Platform.SHEIN
    }
  }

  /**
   * Configuración específica para Temu
   */
  getTemuConfig(): Partial<RetryConfig> {
    return {
      maxRetries: 4,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2.5,
      retryableErrors: [
        ...this.defaultConfig.retryableErrors,
        'Security check',
        'Access denied',
        'Please wait'
      ],
      platform: Platform.TEMU
    }
  }

  /**
   * Configuración específica para Alibaba
   */
  getAlibabaConfig(): Partial<RetryConfig> {
    return {
      maxRetries: 3,
      baseDelay: 3000,
      maxDelay: 90000,
      backoffMultiplier: 2,
      retryableErrors: [
        ...this.defaultConfig.retryableErrors,
        'Robot verification',
        'Access restricted',
        'Please verify your identity'
      ],
      platform: Platform.ALIBABA
    }
  }
}

// Singleton
let retryHandler: RetryHandler | null = null

export function getRetryHandler(): RetryHandler {
  if (!retryHandler) {
    retryHandler = new RetryHandler()
  }
  return retryHandler
}