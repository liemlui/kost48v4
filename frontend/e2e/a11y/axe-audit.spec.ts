import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// N-06: baseline axe audit — rule critical/serious. Diperbaiki bertahap; target ≤ 5 violation.
// Halaman yang butuh login di-skip karena test ini tidak melakukan autentikasi.

const PUBLIC_PAGES = [
  { name: 'Beranda publik', path: '/' },
  { name: 'Katalog kamar', path: '/rooms' },
];

for (const page of PUBLIC_PAGES) {
  test(`a11y: ${page.name} — ≤5 critical/serious`, async ({ page: pwPage }) => {
    await pwPage.goto(page.path);
    await pwPage.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: pwPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

    if (critical.length > 0) {
      console.log(`[${page.name}] ${critical.length} critical/serious violation:`);
      critical.forEach((v) => console.log(`  - [${v.impact}] ${v.id}: ${v.description}`));
    }

    expect(critical.length, `${page.name} punya ${critical.length} critical/serious violation`).toBeLessThanOrEqual(5);
  });
}
