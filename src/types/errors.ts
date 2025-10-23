export type ErrorType = 
  | 'syntax_error'          // HTML/CSS/JS syntax issues
  | 'runtime_error'         // JavaScript runtime errors
  | 'render_error'          // Failed to render in iframe
  | 'missing_dependency'    // External libraries not loading
  | 'layout_broken'         // CSS layout issues
  | 'incomplete_code'       // LLM didn't finish generating
  | 'llm_generation_error'; // Model failed to generate

export interface DetectedError {
  type: ErrorType;
  message: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: number;
}

export interface FixAttempt {
  attemptNumber: number;
  strategy: FixStrategy;
  prompt: string;
  result?: string;
  success: boolean;
  errors?: DetectedError[];
  timestamp: number;
}

export type FixStrategy =
  | 'explain_and_fix'      // Ask LLM to explain error and fix
  | 'simplify'             // Remove complex features
  | 'add_error_handling'   // Wrap code in try-catch
  | 'use_alternatives'     // Use different approach
  | 'rebuild_from_scratch' // Start over with simpler version
  | 'add_fallbacks';       // Add polyfills/fallbacks

