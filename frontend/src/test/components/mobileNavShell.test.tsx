// W-OWN-010 — penjaga regresi shell Normal: markup navigasi bawah mobile harus
// IDENTIK dengan baseline yang direkam sebelum konsolidasi.
//
// FASE B (setelah konsolidasi): test merender `RoleMobileBottomNav` + `config/mobileNav`
// yang kini dipakai AppLayout; baseline TIDAK diubah sehingga lolos = 0 diff markup.
//
// Test ini murni struktural: tanpa aset, tanpa API, tanpa login.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleMobileBottomNav from '../../components/layout/RoleMobileBottomNav';
import { ADMIN_MOBILE_TABS, STAFF_MOBILE_TABS, tenantMobileTabs } from '../../config/mobileNav';

const BASELINE_FILE = path.resolve(process.cwd(), 'src/test/fixtures/mobileNavBaseline.json');

function openMore(container: HTMLElement) {
  const more = [...container.querySelectorAll('button')].find((b) => /Lainnya/.test(b.textContent ?? ''));
  if (more) fireEvent.click(more);
}

function captureAll() {
  const tenant = render(
    <MemoryRouter>
      <RoleMobileBottomNav {...tenantMobileTabs('occupied')} ariaLabel="Navigasi bawah tenant" />
    </MemoryRouter>,
  );
  const tenantBase = tenant.container.innerHTML;
  openMore(tenant.container);
  const tenantMore = tenant.container.innerHTML;
  tenant.unmount();

  const staff = render(
    <MemoryRouter>
      <RoleMobileBottomNav
        mainTabs={STAFF_MOBILE_TABS.mainTabs}
        moreTabs={STAFF_MOBILE_TABS.moreTabs}
        ariaLabel="Navigasi bawah staff"
      />
    </MemoryRouter>,
  );
  const staffBase = staff.container.innerHTML;
  openMore(staff.container);
  const staffMore = staff.container.innerHTML;
  staff.unmount();

  let adminMoreClicks = 0;
  const admin = render(
    <MemoryRouter>
      <RoleMobileBottomNav
        mainTabs={ADMIN_MOBILE_TABS}
        onMoreClick={() => { adminMoreClicks += 1; }}
        ariaLabel="Navigasi cepat admin"
      />
    </MemoryRouter>,
  );
  const adminBase = admin.container.innerHTML;
  openMore(admin.container);
  const adminAfterMore = admin.container.innerHTML;
  admin.unmount();

  return {
    tenant: tenantBase,
    tenantMoreMenu: tenantMore,
    staff: staffBase,
    staffMoreMenu: staffMore,
    admin: adminBase,
    adminAfterMore,
    adminMoreClickCount: adminMoreClicks > 0 ? 1 : 0,
  };
}

describe('W-OWN-010 — markup navigasi bawah mobile per role', () => {
  const actual = captureAll();

  it('identik dengan baseline shell Normal (0 diff)', () => {
    if (!fs.existsSync(BASELINE_FILE)) {
      fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
      fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(actual, null, 1)}\n`, 'utf8');
      throw new Error('baseline dibuat dari kode saat ini — jalankan test sekali lagi');
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    expect(actual).toEqual(baseline);
  });
});
