import type { DetectedError, FixAttempt, FixStrategy } from '../types/errors'
import { invoke } from '@tauri-apps/api/core'

export class SelfHealingEngine {
  private maxAttempts = 5
  private attemptHistory: FixAttempt[] = []
  
  async healCode(
    originalPrompt: string,
    brokenCode: string,
    errors: DetectedError[],
    attemptNumber: number = 1
  ): Promise<string> {
    
    if (attemptNumber > this.maxAttempts) {
      throw new Error('Max healing attempts reached. Code could not be fixed.')
    }
    
    // Choose strategy based on attempt number and error type
    const strategy = this.selectStrategy(errors, attemptNumber)
    
    // Generate fix prompt
    const fixPrompt = this.buildFixPrompt(
      originalPrompt,
      brokenCode,
      errors,
      strategy,
      attemptNumber
    )
    
    // Call LLM to fix
    const fixedCode = await this.requestFix(fixPrompt)
    
    // Log attempt
    this.attemptHistory.push({
      attemptNumber,
      strategy,
      prompt: fixPrompt,
      result: fixedCode,
      success: false, // Will be updated after validation
      errors,
      timestamp: Date.now()
    })
    
    return fixedCode
  }
  
  private selectStrategy(_errors: DetectedError[], attemptNumber: number): FixStrategy {
    // const errorTypes = errors.map(e => e.type)
    
    // Attempt 1: Try to explain and fix directly
    if (attemptNumber === 1) {
      return 'explain_and_fix'
    }
    
    // Attempt 2: Add error handling
    if (attemptNumber === 2) {
      return 'add_error_handling'
    }
    
    // Attempt 3: Simplify approach
    if (attemptNumber === 3) {
      return 'simplify'
    }
    
    // Attempt 4: Try alternative approach
    if (attemptNumber === 4) {
      return 'use_alternatives'
    }
    
    // Attempt 5: Rebuild from scratch (simpler)
    return 'rebuild_from_scratch'
  }
  
  private buildFixPrompt(
    originalPrompt: string,
    brokenCode: string,
    errors: DetectedError[],
    strategy: FixStrategy,
    attemptNumber: number
  ): string {
    
    const errorSummary = errors
      .map(e => `- ${e.type}: ${e.message}`)
      .join('\n')
    
    const strategyInstructions = this.getStrategyInstructions(strategy)
    
    return `
🔧 CODE FIXING ATTEMPT #${attemptNumber}

ORIGINAL REQUEST:
${originalPrompt}

PREVIOUS CODE (WITH ERRORS):
\`\`\`html
${brokenCode}
\`\`\`

DETECTED ERRORS:
${errorSummary}

FIX STRATEGY: ${strategy}
${strategyInstructions}

CRITICAL REQUIREMENTS:
1. Output COMPLETE, WORKING HTML (must include <!DOCTYPE html>, <html>, <head>, <body>, closing tags)
2. All syntax must be valid (check braces, quotes, tags)
3. Test your code mentally before responding
4. Make it work - no placeholders or TODOs
5. If external resources might fail, use fallbacks or inline everything

Now provide the FIXED, COMPLETE code:
`.trim()
  }
  
  private getStrategyInstructions(strategy: FixStrategy): string {
    const instructions: Record<FixStrategy, string> = {
      explain_and_fix: `
- Analyze each error carefully
- Fix the specific issues
- Ensure all syntax is correct
- Return complete, working code`,
      
      add_error_handling: `
- Wrap JavaScript in try-catch blocks
- Add defensive checks (if element exists before using it)
- Provide user-friendly error messages
- Make the app resilient to failures`,
      
      simplify: `
- Remove complex features that might be causing issues
- Use simpler HTML/CSS/JS patterns
- Focus on core functionality
- Reduce dependencies`,
      
      use_alternatives: `
- Try a different technical approach
- Use vanilla JS instead of complex patterns
- Avoid features that caused previous errors
- Find simpler ways to achieve the same result`,
      
      rebuild_from_scratch: `
- Start fresh with a simpler version
- Focus on getting SOMETHING working first
- Use the most basic, reliable patterns
- Prioritize functionality over features
- Make it bulletproof`,
      
      add_fallbacks: `
- Add polyfills for missing features
- Provide fallback content for failed loads
- Use defensive programming
- Ensure graceful degradation`
    }
    
    return instructions[strategy]
  }
  
  private async requestFix(fixPrompt: string): Promise<string> {
    try {
      // Call the LLM with healing-specific parameters
      const response = await invoke<string>('generate_vibe_with_healing', {
        prompt: fixPrompt,
        is_fix_attempt: true,
        attempt_number: this.getAttemptCount() + 1
      })
      
      // Extract code from response
      const codeMatch = response.match(/```html\n([\s\S]*?)```/)
      return codeMatch ? codeMatch[1] : response
    } catch (error) {
      console.error('Failed to request fix from LLM:', error)
      throw new Error(`LLM fix request failed: ${error}`)
    }
  }
  
  getAttemptHistory(): FixAttempt[] {
    return this.attemptHistory
  }
  
  clearHistory(): void {
    this.attemptHistory = []
  }
  
  // Mark the last attempt as successful
  markLastAttemptSuccess(): void {
    if (this.attemptHistory.length > 0) {
      this.attemptHistory[this.attemptHistory.length - 1].success = true
    }
  }
  
  // Get the number of attempts made
  getAttemptCount(): number {
    return this.attemptHistory.length
  }
  
  // Check if we've reached max attempts
  hasReachedMaxAttempts(): boolean {
    return this.attemptHistory.length >= this.maxAttempts
  }
}
