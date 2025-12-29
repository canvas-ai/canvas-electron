// Global error handler for API errors
type ErrorHandler = (error: Error, context?: string) => void;

let globalErrorHandler: ErrorHandler | null = null;

// Register a global error handler (should be called from app initialization)
export function setGlobalErrorHandler(handler: ErrorHandler) {
  globalErrorHandler = handler;
}

// Handle API errors globally
export function handleApiError(error: Error, context?: string) {
  // Only handle non-socket.io errors
  if (error.message.includes('socket.io') || error.message.includes('websocket')) {
    return;
  }

  // Log the error
  console.error('API Error:', error, context);

  // If a global error handler is registered, use it
  if (globalErrorHandler) {
    globalErrorHandler(error, context);
  }
}

// Export types for use in other modules
export type { ErrorHandler };
