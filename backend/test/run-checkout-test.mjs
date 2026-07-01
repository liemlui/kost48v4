// Helper script to run just the checkout test
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testFile = resolve(__dirname, 'integration/checkout-flow.integration.test.js');

try {
  execSync(`node --test "${testFile}"`, {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro?schema=public',
    },
  });
} catch (e) {
  process.exit(1);
}
