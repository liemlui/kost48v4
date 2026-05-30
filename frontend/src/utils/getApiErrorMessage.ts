/**
 * Centralized extraction of a human-readable message from an API/axios error.
 *
 * The backend wraps responses in an envelope and, for validation failures
 * (class-validator), `message` can be a `string[]`. This helper normalizes both
 * shapes and always returns a single display string, falling back to a provided
 * default. Use this instead of re-implementing `err?.response?.data?.message`
 * inline in every catch block.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.',
): string {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } } | undefined
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).join(', ');
    return joined || fallback;
  }

  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  const errorMessage = (error as { message?: string } | undefined)?.message;
  if (typeof errorMessage === 'string' && errorMessage.trim().length > 0) {
    return errorMessage;
  }

  return fallback;
}
