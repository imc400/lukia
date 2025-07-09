import { NextRequest, NextResponse } from 'next/server'
import { getScrapingMonitor } from '@/services/monitoring/scraping-monitor'

export async function GET(request: NextRequest) {
  try {
    const monitor = getScrapingMonitor()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'

    switch (type) {
      case 'summary':
        const summary = monitor.getPerformanceSummary()
        return NextResponse.json({
          success: true,
          data: summary,
          timestamp: new Date().toISOString()
        })

      case 'metrics':
        const metrics = monitor.getMetrics()
        const metricsData = Object.fromEntries(
          Array.from(metrics.entries()).map(([platform, data]) => [platform, data])
        )
        return NextResponse.json({
          success: true,
          data: metricsData,
          timestamp: new Date().toISOString()
        })

      case 'health':
        const health = await monitor.getSystemHealth()
        return NextResponse.json({
          success: true,
          data: health,
          timestamp: new Date().toISOString()
        })

      case 'alerts':
        const activeOnly = searchParams.get('active') === 'true'
        const alerts = activeOnly ? monitor.getActiveAlerts() : monitor.getAllAlerts()
        return NextResponse.json({
          success: true,
          data: alerts,
          timestamp: new Date().toISOString()
        })

      case 'detailed':
        const detailedData = {
          summary: monitor.getPerformanceSummary(),
          metrics: Object.fromEntries(
            Array.from(monitor.getMetrics().entries()).map(([platform, data]) => [platform, data])
          ),
          health: await monitor.getSystemHealth(),
          alerts: monitor.getActiveAlerts()
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
            validTypes: ['summary', 'metrics', 'health', 'alerts', 'detailed']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Monitoring API error:', error)
    
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
    const monitor = getScrapingMonitor()
    const body = await request.json()
    const { action, alertId } = body

    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json(
            { success: false, error: 'Alert ID is required' },
            { status: 400 }
          )
        }
        monitor.resolveAlert(alertId)
        return NextResponse.json({
          success: true,
          message: 'Alert resolved successfully'
        })

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action',
            validActions: ['resolve_alert']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Monitoring API error:', error)
    
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