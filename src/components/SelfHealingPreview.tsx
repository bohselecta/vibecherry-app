import { useState, useEffect, useRef } from 'react'
import { ErrorDetector } from '../utils/errorDetector'
import { SelfHealingEngine } from '../utils/selfHealing'
import type { DetectedError, FixAttempt } from '../types/errors'

interface SelfHealingPreviewProps {
  initialCode: string
  originalPrompt: string
  onFixComplete: (fixedCode: string, attempts: FixAttempt[]) => void
}

export function SelfHealingPreview({
  initialCode,
  originalPrompt,
  onFixComplete
}: SelfHealingPreviewProps) {
  const [currentCode, setCurrentCode] = useState(initialCode)
  const [isHealing, setIsHealing] = useState(false)
  const [healingStatus, setHealingStatus] = useState('')
  const [errors, setErrors] = useState<DetectedError[]>([])
  const [fixAttempts, setFixAttempts] = useState<FixAttempt[]>([])
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const errorDetector = useRef(new ErrorDetector())
  const healingEngine = useRef(new SelfHealingEngine())
  const attemptCount = useRef(0)
  
  // Main self-healing loop
  useEffect(() => {
    validateAndHeal(currentCode)
  }, [currentCode])
  
  async function validateAndHeal(code: string) {
    setHealingStatus('🔍 Checking code...')
    
    // Check if code is malformed or incomplete
    if (!code || code.length < 50) {
      setErrors([{
        type: 'incomplete_code',
        message: 'Code appears to be incomplete or malformed',
        timestamp: Date.now()
      }])
      await attemptFix(code, [{
        type: 'incomplete_code',
        message: 'Code appears to be incomplete or malformed',
        timestamp: Date.now()
      }])
      return
    }
    
    // Stage 1: Static analysis
    const syntaxErrors = errorDetector.current.detectSyntaxErrors(code)
    
    if (syntaxErrors.length > 0) {
      setErrors(syntaxErrors)
      await attemptFix(code, syntaxErrors)
      return
    }
    
    setHealingStatus('✅ Syntax looks good, rendering...')
    
    // Stage 2: Wait for render and check runtime
    setTimeout(async () => {
      if (!iframeRef.current) return
      
      const runtimeErrors = errorDetector.current.getErrors()
      const renderErrors = await errorDetector.current.analyzeRenderedOutput()
      
      const allErrors = [...runtimeErrors, ...renderErrors]
      
      if (allErrors.length > 0) {
        setErrors(allErrors)
        setHealingStatus('⚠️ Errors detected, fixing...')
        await attemptFix(code, allErrors)
      } else {
        setHealingStatus('✨ Code is working perfectly!')
        setIsHealing(false)
        healingEngine.current.markLastAttemptSuccess()
        onFixComplete(code, healingEngine.current.getAttemptHistory())
      }
    }, 1000) // Wait for render
  }
  
  async function attemptFix(brokenCode: string, detectedErrors: DetectedError[]) {
    attemptCount.current += 1
    setIsHealing(true)
    
    setHealingStatus(`🔧 Fix attempt ${attemptCount.current}/5...`)
    
    try {
      const fixedCode = await healingEngine.current.healCode(
        originalPrompt,
        brokenCode,
        detectedErrors,
        attemptCount.current
      )
      
      setFixAttempts(healingEngine.current.getAttemptHistory())
      
      // Clear errors and try the fixed code
      errorDetector.current.clearErrors()
      setCurrentCode(fixedCode)
      
    } catch (error) {
      setHealingStatus(`❌ Could not fix after ${attemptCount.current} attempts`)
      setIsHealing(false)
      
      // Show what we tried
      setFixAttempts(healingEngine.current.getAttemptHistory())
    }
  }
  
  // Monitor iframe for errors
  useEffect(() => {
    if (iframeRef.current) {
      errorDetector.current.monitorIframe(iframeRef.current)
    }
  }, [])
  
  return (
    <div className="flex flex-col h-full">
      {/* Healing Status Bar */}
      {isHealing && (
        <div className="bg-purple-900/50 backdrop-blur px-4 py-2 text-white text-sm flex items-center gap-2">
          <div className="animate-spin">🔄</div>
          <span>{healingStatus}</span>
          {attemptCount.current > 0 && (
            <span className="ml-auto text-purple-300">
              Attempt {attemptCount.current}/5
            </span>
          )}
        </div>
      )}
      
      {/* Error Display (if any) */}
      {errors.length > 0 && !isHealing && (
        <div className="bg-red-900/30 backdrop-blur px-4 py-2 text-red-200 text-sm">
          <div className="font-bold mb-1">⚠️ Issues detected:</div>
          {errors.map((err, idx) => (
            <div key={idx} className="ml-4">• {err.message}</div>
          ))}
        </div>
      )}
      
      {/* Fix Attempt History */}
      {fixAttempts.length > 0 && (
        <details className="bg-black/20 backdrop-blur px-4 py-2 text-white text-xs">
          <summary className="cursor-pointer hover:text-purple-300">
            📋 View {fixAttempts.length} fix attempt{fixAttempts.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {fixAttempts.map((attempt, idx) => (
              <div key={idx} className="border-l-2 border-purple-500 pl-2">
                <div className="font-bold">
                  Attempt {attempt.attemptNumber}: {attempt.strategy}
                </div>
                <div className="text-gray-400">
                  {attempt.errors?.map(e => e.message).join(', ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(attempt.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
      
      {/* Preview Iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={currentCode}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin"
        title="Self-Healing Preview"
      />
    </div>
  )
}
