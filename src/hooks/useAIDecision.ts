import { useState, useEffect, useCallback } from 'react'

interface AIDecisionResult {
  success: boolean
  status: 'processing' | 'completed'
  data?: {
    bestChoice: {
      bestProduct: any
      reasons: string[]
      alternatives: any[]
      marketInsights: any
      vendorAnalysis?: any
    }
    totalAnalyzed: number
    completedAt: string
    processingTime: number
  }
  message?: string
}

interface UseAIDecisionOptions {
  query: string
  enabled: boolean
  interval?: number
  maxAttempts?: number
}

export function useAIDecision({ 
  query, 
  enabled, 
  interval = 3000, 
  maxAttempts = 20 
}: UseAIDecisionOptions) {
  const [decisionResult, setDecisionResult] = useState<AIDecisionResult | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const checkAIDecision = useCallback(async () => {
    if (!enabled || !query) return

    try {
      setError(null)
      console.log(`[AI Decision Polling] Checking decision for query: "${query}"`)
      
      const response = await fetch('/api/search/ai-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()
      setDecisionResult(data)

      if (data.status === 'completed' && data.data) {
        setIsPolling(false)
        console.log('[AI Decision Polling] Decision completed:', data.data.bestChoice.bestProduct.title)
      } else if (attempts >= maxAttempts) {
        setIsPolling(false)
        setError('AI decision analysis timeout - taking longer than expected')
      } else {
        console.log(`[AI Decision Polling] Still processing... attempt ${attempts}/${maxAttempts}`)
      }

    } catch (err) {
      console.error('[AI Decision Polling] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to check AI decision status')
    }
  }, [enabled, query, attempts, maxAttempts])

  useEffect(() => {
    if (!enabled) {
      setIsPolling(false)
      setDecisionResult(null)
      setAttempts(0)
      return
    }

    // Start polling
    setIsPolling(true)
    setAttempts(0)
    
    // Initial check
    checkAIDecision()

    // Set up interval
    const intervalId = setInterval(() => {
      if (isPolling && attempts < maxAttempts) {
        setAttempts(prev => prev + 1)
        checkAIDecision()
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
    checkAIDecision()
  }, [checkAIDecision])

  return {
    decisionResult,
    isPolling,
    error,
    attempts,
    maxAttempts,
    retryPolling,
    progressPercentage: Math.min((attempts / maxAttempts) * 100, 100)
  }
}