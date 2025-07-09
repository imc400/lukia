import { NextRequest, NextResponse } from 'next/server'
import { Platform } from '@prisma/client'
import { getRateLimiter } from '@/services/rate-limiting/intelligent-limiter'
import { getRateLimitedScraper } from '@/services/rate-limiting/scraping-wrapper'

export async function GET(request: NextRequest) {
  try {
    const rateLimiter = getRateLimiter()
    const scraper = getRateLimitedScraper()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'status'
    const platform = searchParams.get('platform') as Platform

    switch (type) {
      case 'status':
        const status = scraper.getStatus()
        return NextResponse.json({
          success: true,
          data: status,
          timestamp: new Date().toISOString()
        })

      case 'stats':
        const stats = rateLimiter.getStats()
        const statsData = Object.fromEntries(
          Array.from(stats.entries()).map(([platform, data]) => [platform, data])
        )
        return NextResponse.json({
          success: true,
          data: statsData,
          timestamp: new Date().toISOString()
        })

      case 'config':
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'Platform parameter required for config' },
            { status: 400 }
          )
        }
        const config = rateLimiter.getCurrentConfig(platform)
        return NextResponse.json({
          success: true,
          data: config,
          timestamp: new Date().toISOString()
        })

      case 'queue':
        const queueStats = scraper.getQueueStats()
        return NextResponse.json({
          success: true,
          data: {
            queueSize: queueStats.queueSize,
            activeRequests: Object.fromEntries(queueStats.activeRequests),
            oldestRequest: queueStats.oldestRequest,
            rateLimitStats: Object.fromEntries(queueStats.rateLimitStats)
          },
          timestamp: new Date().toISOString()
        })

      case 'check':
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'Platform parameter required for check' },
            { status: 400 }
          )
        }
        const checkResult = await rateLimiter.checkRateLimit(platform)
        return NextResponse.json({
          success: true,
          data: checkResult,
          timestamp: new Date().toISOString()
        })

      case 'wait-time':
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'Platform parameter required for wait-time' },
            { status: 400 }
          )
        }
        const waitTime = await scraper.getEstimatedWaitTime(platform)
        return NextResponse.json({
          success: true,
          data: { waitTime, platform },
          timestamp: new Date().toISOString()
        })

      case 'health':
        const allStats = rateLimiter.getStats()
        const scrapingStatus = scraper.getStatus()
        
        let overallHealth = 'healthy'
        let issues = []
        
        // Verificar si hay muchas requests bloqueadas
        Array.from(allStats.entries()).forEach(([platform, stats]) => {
          const blockRate = stats.totalRequests > 0 ? 
            (stats.blockedRequests / stats.totalRequests) * 100 : 0
          
          if (blockRate > 50) {
            overallHealth = 'unhealthy'
            issues.push(`High block rate for ${platform}: ${blockRate.toFixed(1)}%`)
          } else if (blockRate > 20) {
            overallHealth = 'degraded'
            issues.push(`Elevated block rate for ${platform}: ${blockRate.toFixed(1)}%`)
          }
        })
        
        // Verificar tamaño de cola
        if (scrapingStatus.queueSize > 100) {
          overallHealth = 'unhealthy'
          issues.push(`Large queue size: ${scrapingStatus.queueSize}`)
        } else if (scrapingStatus.queueSize > 50) {
          overallHealth = 'degraded'
          issues.push(`Growing queue size: ${scrapingStatus.queueSize}`)
        }
        
        return NextResponse.json({
          success: true,
          data: {
            status: overallHealth,
            issues,
            stats: Object.fromEntries(allStats),
            scrapingStatus
          },
          timestamp: new Date().toISOString()
        })

      case 'detailed':
        const detailedData = {
          status: scraper.getStatus(),
          stats: Object.fromEntries(rateLimiter.getStats()),
          queue: scraper.getQueueStats(),
          configs: Object.fromEntries(
            [Platform.ALIEXPRESS, Platform.SHEIN, Platform.TEMU, Platform.ALIBABA]
              .map(p => [p, rateLimiter.getCurrentConfig(p)])
              .filter(([_, config]) => config !== undefined)
          )
        }
        
        return NextResponse.json({
          success: true,
          data: detailedData,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid type parameter',
            validTypes: ['status', 'stats', 'config', 'queue', 'check', 'wait-time', 'health', 'detailed']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Rate Limit API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimiter = getRateLimiter()
    const scraper = getRateLimitedScraper()
    const body = await request.json()
    const { action, platform, config } = body

    switch (action) {
      case 'update_config':
        if (!platform || !config) {
          return NextResponse.json(
            { success: false, error: 'Platform and config parameters required' },
            { status: 400 }
          )
        }
        
        rateLimiter.updateConfig(platform, config)
        return NextResponse.json({
          success: true,
          message: `Configuration updated for ${platform}`,
          data: rateLimiter.getCurrentConfig(platform)
        })

      case 'cleanup_queue':
        scraper.cleanupQueue()
        return NextResponse.json({
          success: true,
          message: 'Queue cleaned up',
          data: scraper.getQueueStats()
        })

      case 'report_failure':
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'Platform parameter required' },
            { status: 400 }
          )
        }
        
        const errorType = body.errorType || 'other'
        await rateLimiter.reportFailure(platform, errorType)
        return NextResponse.json({
          success: true,
          message: `Failure reported for ${platform}`,
          data: rateLimiter.getStats().get(platform)
        })

      case 'report_success':
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'Platform parameter required' },
            { status: 400 }
          )
        }
        
        const responseTime = body.responseTime || 1000
        await rateLimiter.reportSuccess(platform, responseTime)
        return NextResponse.json({
          success: true,
          message: `Success reported for ${platform}`,
          data: rateLimiter.getStats().get(platform)
        })

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action',
            validActions: ['update_config', 'cleanup_queue', 'report_failure', 'report_success']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Rate Limit API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}