import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Audit E-1: menandai endpoint/controller yang sengaja terbuka tanpa JWT.
 * Dipakai bersama APP_GUARD global (JwtAuthGuard) — endpoint TANPA decorator
 * ini otomatis butuh token, sehingga controller baru yang lupa @UseGuards
 * tidak lagi bocor jadi publik.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
