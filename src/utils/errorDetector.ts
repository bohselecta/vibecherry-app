import type { DetectedError } from '../types/errors'

export class ErrorDetector {
  private errorLog: DetectedError[] = []
  private iframe: HTMLIFrameElement | null = null

  // Stage 1: Static Analysis - Before rendering
  detectSyntaxErrors(code: string): DetectedError[] {
    const errors: DetectedError[] = []
    
    // Check for basic HTML structure
    if (!code.includes('<!DOCTYPE html>')) {
      errors.push({
        type: 'syntax_error',
        message: 'Missing DOCTYPE declaration',
        timestamp: Date.now()
      })
    }
    
    if (!code.includes('<html')) {
      errors.push({
        type: 'syntax_error',
        message: 'Missing <html> tag',
        timestamp: Date.now()
      })
    }
    
    if (!code.includes('</html>')) {
      errors.push({
        type: 'incomplete_code',
        message: 'Missing closing </html> tag',
        timestamp: Date.now()
      })
    }
    
    // Check for unclosed tags
    const tagPattern = /<([a-z][a-z0-9]*)\b[^>]*>/gi
    const openTags: string[] = []
    let match
    
    while ((match = tagPattern.exec(code)) !== null) {
      const tag = match[1].toLowerCase()
      if (!['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tag)) {
        openTags.push(tag)
      }
    }
    
    // Check for unclosed closing tags
    const closingPattern = /<\/([a-z][a-z0-9]*)>/gi
    while ((match = closingPattern.exec(code)) !== null) {
      const tag = match[1].toLowerCase()
      const lastOpen = openTags.lastIndexOf(tag)
      if (lastOpen === -1) {
        errors.push({
          type: 'syntax_error',
          message: `Unexpected closing tag: </${tag}>`,
          timestamp: Date.now()
        })
      } else {
        openTags.splice(lastOpen, 1)
      }
    }
    
    if (openTags.length > 0) {
      errors.push({
        type: 'syntax_error',
        message: `Unclosed tags: ${openTags.join(', ')}`,
        timestamp: Date.now()
      })
    }
    
    // Check for basic JavaScript syntax issues
    const scriptMatches = code.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        const jsCode = script.replace(/<script[^>]*>|<\/script>/gi, '')
        
        // Check for common syntax errors
        if (jsCode.includes('function (') && !jsCode.includes(')')) {
          errors.push({
            type: 'syntax_error',
            message: 'Incomplete function declaration',
            timestamp: Date.now()
          })
        }
        
        // Check for unmatched braces
        const openBraces = (jsCode.match(/{/g) || []).length
        const closeBraces = (jsCode.match(/}/g) || []).length
        if (openBraces !== closeBraces) {
          errors.push({
            type: 'syntax_error',
            message: `Unmatched braces: ${openBraces} open, ${closeBraces} close`,
            timestamp: Date.now()
          })
        }
        
        // Check for unmatched parentheses
        const openParens = (jsCode.match(/\(/g) || []).length
        const closeParens = (jsCode.match(/\)/g) || []).length
        if (openParens !== closeParens) {
          errors.push({
            type: 'syntax_error',
            message: `Unmatched parentheses: ${openParens} open, ${closeParens} close`,
            timestamp: Date.now()
          })
        }
      })
    }
    
    // Check if code is complete
    if (!code.includes('</html>')) {
      errors.push({
        type: 'incomplete_code',
        message: 'HTML document appears incomplete (missing </html>)',
        timestamp: Date.now()
      })
    }
    
    // Check for missing DOCTYPE
    if (!code.includes('<!DOCTYPE html>')) {
      errors.push({
        type: 'syntax_error',
        message: 'Missing DOCTYPE declaration',
        timestamp: Date.now()
      })
    }
    
    // Check for basic HTML structure
    if (!code.includes('<html')) {
      errors.push({
        type: 'syntax_error',
        message: 'Missing <html> tag',
        timestamp: Date.now()
      })
    }
    
    if (!code.includes('<body')) {
      errors.push({
        type: 'syntax_error',
        message: 'Missing <body> tag',
        timestamp: Date.now()
      })
    }
    
    return errors
  }
  
  // Stage 2: Runtime Monitoring - After rendering
  monitorIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe
    
    // Inject error listener into iframe
    iframe.addEventListener('load', () => {
      try {
        const iframeWindow = iframe.contentWindow
        if (!iframeWindow) return
        
        // Capture console errors
        const originalError = (iframeWindow as any).console.error
        ;(iframeWindow as any).console.error = (...args: any[]) => {
          this.errorLog.push({
            type: 'runtime_error',
            message: args.join(' '),
            timestamp: Date.now()
          })
          originalError.apply((iframeWindow as any).console, args)
        }
        
        // Capture JavaScript errors
        iframeWindow.addEventListener('error', (event: ErrorEvent) => {
          this.errorLog.push({
            type: 'runtime_error',
            message: event.message,
            line: event.lineno,
            column: event.colno,
            stack: event.error?.stack,
            timestamp: Date.now()
          })
        })
        
        // Capture unhandled promise rejections
        iframeWindow.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
          this.errorLog.push({
            type: 'runtime_error',
            message: `Unhandled Promise Rejection: ${event.reason}`,
            timestamp: Date.now()
          })
        })
        
      } catch (error) {
        // Cross-origin issues - can't monitor
        console.warn('Cannot monitor iframe due to CORS:', error)
      }
    })
  }
  
  // Stage 3: Visual Inspection - Check if render looks broken
  async analyzeRenderedOutput(): Promise<DetectedError[]> {
    const errors: DetectedError[] = []
    
    if (!this.iframe?.contentWindow?.document) {
      errors.push({
        type: 'render_error',
        message: 'Failed to render content in iframe',
        timestamp: Date.now()
      })
      return errors
    }
    
    const doc = this.iframe.contentWindow.document
    
    // Check if body is empty
    if (!doc.body || doc.body.innerHTML.trim().length === 0) {
      errors.push({
        type: 'render_error',
        message: 'Document body is empty - nothing rendered',
        timestamp: Date.now()
      })
    }
    
    // Check for excessive error text on page
    const bodyText = doc.body.innerText.toLowerCase()
    if (bodyText.includes('uncaught') || bodyText.includes('syntaxerror')) {
      errors.push({
        type: 'runtime_error',
        message: 'Error messages visible in rendered output',
        timestamp: Date.now()
      })
    }
    
    // Check if external resources failed to load
    const images = doc.querySelectorAll('img')
    const failedImages = Array.from(images).filter(img => 
      !img.complete || img.naturalWidth === 0
    )
    
    if (failedImages.length > 0) {
      errors.push({
        type: 'missing_dependency',
        message: `${failedImages.length} image(s) failed to load`,
        timestamp: Date.now()
      })
    }
    
    // Check for broken CSS (elements with no styling)
    const styledElements = doc.querySelectorAll('*')
    const unstyledElements = Array.from(styledElements).filter(el => {
      const computedStyle = doc.defaultView?.getComputedStyle(el)
      return computedStyle && 
             computedStyle.display === 'inline' && 
             computedStyle.width === 'auto' && 
             computedStyle.height === 'auto' &&
             !el.textContent?.trim()
    })
    
    if (unstyledElements.length > styledElements.length * 0.5) {
      errors.push({
        type: 'layout_broken',
        message: 'Many elements appear unstyled - possible CSS issues',
        timestamp: Date.now()
      })
    }
    
    return errors
  }
  
  // Get all detected errors
  getErrors(): DetectedError[] {
    return this.errorLog
  }
  
  // Clear error log
  clearErrors(): void {
    this.errorLog = []
  }
  
  // Check if there are any critical errors that prevent rendering
  hasCriticalErrors(): boolean {
    return this.errorLog.some(error => 
      error.type === 'syntax_error' || 
      error.type === 'incomplete_code' ||
      error.type === 'render_error'
    )
  }
}
