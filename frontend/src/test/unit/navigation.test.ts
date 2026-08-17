import { describe, it, expect } from 'vitest';
import {
  getNavigationSections,
  getNavigationLinks,
  getDefaultRoute,
} from '../../config/navigation';

describe('Y-M4 — navigation (menu builder per role)', () => {
  describe('getNavigationSections', () => {
    it('OWNER → grup "Keputusan Owner" + "Lainnya"', () => {
      const s = getNavigationSections('OWNER');
      expect(s.map((x) => x.title)).toEqual(['Keputusan Owner', 'Lainnya']);
    });
    it('role tak dikenal / undefined → fallback ke adminSections', () => {
      expect(getNavigationSections(undefined)[0].title).toBe('Huni & Uang');
      expect(getNavigationSections('WHATEVER')[0].title).toBe('Huni & Uang');
    });
  });

  describe('getNavigationLinks', () => {
    it('ADMIN memuat dashboard & stays', () => {
      const links = getNavigationLinks('ADMIN').map((l) => l.to);
      expect(links).toContain('/dashboard');
      expect(links).toContain('/stays');
    });
    it('TENANT stage browsing hanya menu pilih kamar', () => {
      const links = getNavigationLinks('TENANT', 'browsing').map((l) => l.to);
      expect(links).toEqual(['/rooms']);
    });
    it('TENANT occupied + loyalty aktif menambah menu Poin & Reward', () => {
      const without = getNavigationLinks('TENANT', 'occupied').map((l) => l.to);
      const withLoyalty = getNavigationLinks('TENANT', 'occupied', { loyaltyEnabled: true }).map((l) => l.to);
      expect(without).not.toContain('/portal/loyalty');
      expect(withLoyalty).toContain('/portal/loyalty');
    });
  });

  describe('getDefaultRoute', () => {
    it('per role', () => {
      expect(getDefaultRoute('OWNER')).toBe('/owner-dashboard');
      expect(getDefaultRoute('ADMIN')).toBe('/dashboard');
      expect(getDefaultRoute('STAFF')).toBe('/dashboard');
      expect(getDefaultRoute(undefined)).toBe('/rooms');
    });
    it('TENANT tergantung stage', () => {
      expect(getDefaultRoute('TENANT', 'browsing')).toBe('/rooms');
      expect(getDefaultRoute('TENANT', 'booking')).toBe('/portal/bookings');
      expect(getDefaultRoute('TENANT', 'occupied')).toBe('/portal/stay');
    });
  });
});
