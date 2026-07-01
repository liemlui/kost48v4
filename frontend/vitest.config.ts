import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Konfigurasi test terpisah dari vite.config.ts agar tidak mengganggu `npm run build`.
// Fase Y-M..Y-P: unit + component + page-integration test (vitest + RTL + jsdom).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
