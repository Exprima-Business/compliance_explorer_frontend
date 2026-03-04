/**
 * Centralised error message extraction.
 * Replaces the repeated inline pattern:
 *   typeof err === 'string' ? err : (err as any).message ?? 'fallback'
 */

export type ApiErrorLike = string | { message?: string; code?: string } | null | undefined;

/**
 * Extracts a human-readable message from any error-like value.
 * Handles strings, objects with a .message property, null, and undefined.
 */
export function extractErrorMessage(
  error: ApiErrorLike,
  fallback = 'An unexpected error occurred'
): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error.trim() || fallback;
  return error.message?.trim() || fallback;
}
