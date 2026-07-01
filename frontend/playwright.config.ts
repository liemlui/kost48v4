import { defineConfig } from '@playwright/test';
const PORT = process.env.VITE_PORT || '5176';
const BASE = `http://localhost:${PORT}`;
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: { baseURL: BASE, headless: true },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: true,
  },
});
