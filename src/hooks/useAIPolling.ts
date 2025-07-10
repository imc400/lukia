import { useState, useEffect, useCallback } from 'react'

interface AIAnalysisResult {
  success: boolean
  status: 'processing' | 'completed'
  query: string
  data?: {
    products: any[]
    completedAt: string
    totalAnalyzed: number
    processingTime: number
    statistics: {
      highTrustProducts: number
      lowRiskProducts: number
      averageTrustScore: number
    }
  }
  message?: string
}

interface UseAIPollingOptions {
  query: string
  enabled: boolean
  interval?: number
  maxAttempts?: number
}

export function useAIPolling({ 
  query, 
  enabled, 
  interval = 3000, 
  maxAttempts = 20 
}: UseAIPollingOptions) {
  const [aiResult, setAIResult] = useState<AIAnalysisResult | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const checkAIStatus = useCallback(async () => {
    if (!enabled || !query) return

    try {
      setError(null)
      const response = await fetch('/api/search/ai-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()
      setAIResult(data)

      if (data.status === 'completed') {
        setIsPolling(false)
        console.log('[AI Polling] Analysis completed:', data.data?.statistics)
      } else if (attempts >= maxAttempts) {
        setIsPolling(false)
        setError('AI analysis timeout - taking longer than expected')
      }

    } catch (err) {
      console.error('[AI Polling] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to check AI status')
    }
  }, [enabled, query, attempts, maxAttempts])

  useEffect(() => {
    if (!enabled) {
      setIsPolling(false)
      setAIResult(null)
      setAttempts(0)
      return
    }

    // Start polling
    setIsPolling(true)
    setAttempts(0)
    
    // Initial check
    checkAIStatus()

    // Set up interval
    const intervalId = setInterval(() => {
      if (isPolling && attempts < maxAttempts) {
        setAttempts(prev => prev + 1)
        checkAIStatus()
      }
    }, interval)

    return () => {
      clearInterval(intervalId)
      setIsPolling(false)
    }
  }, [enabled, query])

  const retryPolling = useCallback(() => {
    setAttempts(0)
    setError(null)
    setIsPolling(true)
    checkAIStatus()
  }, [checkAIStatus])

  return {
    aiResult,
    isPolling,
    error,
    attempts,
    maxAttempts,
    retryPolling,
    progressPercentage: Math.min((attempts / maxAttempts) * 100, 100)
  }
}