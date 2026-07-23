import { Logger } from '@nestjs/common';

/**
 * Helper standar untuk error handling di seluruh backend.
 * Gunakan `catchError` untuk menangkap + log + re-throw error dengan konteks.
 *
 * Pola pemakaian:
 * ```
 * try { ... } catch (err) { catchError(this.logger, err, 'StaysService.createStay'); }
 * ```
 *
 * Untuk promise chain:
 * ```
 * somePromise.catch((err) => catchError(this.logger, err, 'StaysService.processDeposit'));
 * ```
 */
export function catchError(logger: Logger, error: unknown, context: string): never {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`[${context}] ${message}`, error instanceof Error ? error.stack : undefined);
  throw error;
}

/**
 * Log error tanpa re-throw — untuk fire-and-forget operation.
 * ```
 * cleanupPromise.catch((err) => logError(this.logger, err, 'cleanupKtp'));
 * ```
 */
export function logError(logger: Logger, error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`[${context}] ${message}`, error instanceof Error ? error.stack : undefined);
}
