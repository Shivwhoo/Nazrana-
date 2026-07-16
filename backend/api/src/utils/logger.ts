/**
 * Concise logger for API errors.
 * Prints a single-line summary instead of full stack traces.
 */
export function logError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[ERROR] ${context}: ${error.message}`);
  } else {
    console.error(`[ERROR] ${context}: ${String(error)}`);
  }
}

export function logInfo(context: string, message: string): void {
  console.log(`[INFO] ${context}: ${message}`);
}
