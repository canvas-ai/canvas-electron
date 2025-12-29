/**
 * Extracts the most detailed error message from various error structures
 * @param err - The error object, can be Error instance or any other object
 * @param defaultMessage - Default message if no specific error message is found
 * @returns The extracted error message
 */
export function extractErrorMessage(err: any, defaultMessage: string = 'An error occurred'): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null) {
    // Try to extract from various possible error structures
    return err.message ||
           err.error ||
           err.payload?.message ||
           err.payload?.error ||
           err.statusText ||
           defaultMessage;
  }

  return defaultMessage;
}

/**
 * Logs the error and extracts a user-friendly error message
 * @param err - The error object
 * @param context - Context string for debugging (e.g., 'Context creation error')
 * @param defaultMessage - Default message if no specific error message is found
 * @returns The extracted error message
 */
export function logAndExtractError(err: any, context: string, defaultMessage: string = 'An error occurred'): string {
  console.error(context, err);
  return extractErrorMessage(err, defaultMessage);
}
