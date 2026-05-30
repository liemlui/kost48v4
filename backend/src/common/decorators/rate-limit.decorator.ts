import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by {@link RateLimitGuard} to resolve the rate-limit bucket
 * config explicitly, instead of relying on the handler method name.
 */
export const RATE_LIMIT_KEY = 'rateLimitKey';

/**
 * Attach an explicit rate-limit bucket name to a route handler.
 *
 * The bucket name must exist in `RateLimitGuard.configs`, otherwise the request
 * is allowed through (no limit). Using an explicit key avoids brittle coupling
 * to the handler method name (e.g. a generic `create` handler).
 *
 * @example
 *   @RateLimit('publicBooking')
 *   @Post()
 *   create() { ... }
 */
export const RateLimit = (bucket: string) => SetMetadata(RATE_LIMIT_KEY, bucket);
