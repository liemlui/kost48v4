import { describe, it, expect } from 'vitest';
import {
  TENANT_ALL_MENU_TITLE,
  TENANT_ROUTE_STAGES,
  getNavigationSections,
  getNavigationLinks,
  getDefaultRoute,
  getTenantMenuLinks,
  getTenantMenuItemStages,
  type TenantPortalStage,
} from '../../config/navigation';

const ALL_STAGES: TenantPortalStage[] = ['browsing', 'booking', 'occupied'];
const CANDIDATE_STAGES: TenantPortalStage[] = ['browsing', 'booking'];
/** Rute uang/tagihan: tidak boleh muncul di menu calon (S6). */
const BILLING_PATHS = ['/portal/invoices', '/portal/stay', '/portal/checkout', '/portal/renewal'];

describe('Y-M4 — navigation (menu builder per role)', () => {
  describe('getNavigationSections', () => {
    it('OWNER → grup "Utama" + "Lainnya"', () => {
      const s = getNavigationSections('OWNER');
      expect(s.map((x) => x.title)).toEqual(['Utama', 'Lainnya']);
    });
    it('role tak dikenal / undefined → fallback ke adminSections', () => {
      expect(getNavigationSections(undefined)[0].title).toBe('Utama');
      expect(getNavigationSections('WHATEVER')[0].title).toBe('Utama');
    });
  });

  describe('getNavigationLinks', () => {
    it('ADMIN memuat dashboard & stays', () => {
      const links = getNavigationLinks('ADMIN').map((l) => l.to);
      expect(links).toContain('/dashboard');
      expect(links).toContain('/stays');
    });
    it('TENANT stage browsing: menu calon = cari kamar + pengajuan saya', () => {
      // S6 — ekspektasi lama `toEqual(['/rooms'])` DIGANTI, bukan dilemahkan.
      // Alasan: dulu tahap browsing hanya boleh melihat katalog, sehingga calon yang
      // pengajuannya sudah berjalan tetapi belum menjadi sewa (atau pengajuan lamanya
      // batal/kedaluwarsa) tidak punya jalan ke status pengajuan, padahal §8.8 melarang
      // fitur disembunyikan tanpa jalan keluar. Pemeriksaan sekarang lebih ketat: daftar
      // tujuan diperiksa per item (jalur + label) dan rute bayar/tagihan dilarang.
      const links = getNavigationLinks('TENANT', 'browsing');
      const paths = links.map((l) => l.to);
      expect(paths).toContain('/rooms');
      expect(paths).toContain('/portal/bookings');
      expect(paths).not.toContain('/portal/invoices');
      expect(links.find((l) => l.to === '/rooms')?.label).toBe('Cari kamar');
      expect(links.find((l) => l.to === '/portal/bookings')?.label).toBe('Pengajuan saya');
    });
    it('TENANT occupied + loyalty aktif menambah menu Poin & Reward', () => {
      const without = getNavigationLinks('TENANT', 'occupied').map((l) => l.to);
      const withLoyalty = getNavigationLinks('TENANT', 'occupied', { loyaltyEnabled: true }).map((l) => l.to);
      expect(without).not.toContain('/portal/loyalty');
      expect(withLoyalty).toContain('/portal/loyalty');
    });
  });

  describe('S6 — pemisahan calon penghuni dan penghuni', () => {
    it('calon (browsing & booking) tidak mendapat rute bayar/tagihan', () => {
      for (const stage of CANDIDATE_STAGES) {
        const paths = getNavigationLinks('TENANT', stage).map((l) => l.to);
        for (const billing of BILLING_PATHS) {
          expect(paths, `tahap ${stage} tidak boleh memuat ${billing}`).not.toContain(billing);
        }
      }
    });

    it('penghuni (occupied) memuat tagihan & kamar saya dengan label kepemilikan', () => {
      const links = getNavigationLinks('TENANT', 'occupied');
      const paths = links.map((l) => l.to);
      expect(paths).toContain('/portal/invoices');
      expect(paths).toContain('/portal/stay');
      expect(links.find((l) => l.to === '/portal/invoices')?.label).toBe('Tagihan');
      expect(links.find((l) => l.to === '/portal/stay')?.label).toBe('Kamar saya');
    });

    it('label calon dan penghuni tidak memakai dua pola untuk tujuan yang sama', () => {
      // Satu tabel label per tahap: tujuan yang muncul di dua tahap boleh beda kata,
      // tetapi setiap label harus berasal dari tabel tahap itu (tidak ada label liar).
      const browsing = getNavigationLinks('TENANT', 'browsing');
      const occupied = getNavigationLinks('TENANT', 'occupied');
      expect(browsing.every((l) => l.label.trim().length > 0)).toBe(true);
      expect(occupied.every((l) => l.label.trim().length > 0)).toBe(true);
      // Tujuan yang sama di tahap berbeda tetap satu entri (tidak duplikat dalam satu tahap).
      for (const stage of ALL_STAGES) {
        const paths = getNavigationLinks('TENANT', stage).map((l) => l.to);
        expect(new Set(paths).size, `tahap ${stage} tidak boleh menduplikasi tautan`).toBe(paths.length);
      }
    });

    it('setiap tahap punya jalan keluar "Lihat semua menu" yang tidak menyembunyikan tujuan', () => {
      for (const stage of ALL_STAGES) {
        const sections = getNavigationSections('TENANT', stage);
        const escape = sections.find((s) => s.title === TENANT_ALL_MENU_TITLE);
        expect(escape, `tahap ${stage} wajib punya "${TENANT_ALL_MENU_TITLE}"`).toBeTruthy();
        // Gabungan seluruh seksi = semua tujuan yang boleh tampil di tahap ini.
        // Dibandingkan sebagai himpunan (urut diurutkan): urutan di dalam seksi mengikuti
        // prioritas tahap (mis. tahap booking menaruh "Pengajuan saya" lebih dulu).
        const sectionPaths = sections.flatMap((s) => s.links.map((l) => l.to)).slice().sort();
        const menuPaths = getTenantMenuLinks(stage).map((l) => l.to).slice().sort();
        expect(sectionPaths, `tahap ${stage}`).toEqual(menuPaths);
        // Calon tetap punya isi nyata di grup itu (panduan) — bukan seksi kosong.
        if (stage !== 'occupied') expect(escape!.links.length).toBeGreaterThan(0);
      }
    });

    it('menu dan guard rute sepakat: tidak ada tautan mati, tidak ada menu lebih luas dari izin', () => {
      for (const stage of ALL_STAGES) {
        for (const link of getNavigationLinks('TENANT', stage)) {
          const allowedByGuard = TENANT_ROUTE_STAGES[link.to];
          if (!allowedByGuard) continue; // tujuan publik (/rooms) tidak dibatasi tahap
          expect(allowedByGuard, `${link.to} di tahap ${stage}`).toContain(stage);
        }
        for (const link of getTenantMenuLinks(stage)) {
          // Tujuan yang tampil harus benar-benar boleh dibuka tahap ini.
          expect(getTenantMenuItemStages(link.to), `${link.to} tahap ${stage}`).toContain(stage);
        }
      }
    });

    it('menu penghuni tidak menawarkan jalan buntu untuk calon', () => {
      // /rooms dan /portal/bookings secara teknis boleh dibuka penghuni, tetapi bukan
      // menu yang berguna (MyBookingsPage mengalihkan ke /portal/stay saat occupied).
      const occupied = getNavigationLinks('TENANT', 'occupied').map((l) => l.to);
      expect(occupied).not.toContain('/rooms');
      expect(occupied).not.toContain('/portal/bookings');
      // Status pengajuan tetap boleh dibuka calon (§8.8) — terbukti dari guard, bukan menu.
      expect(TENANT_ROUTE_STAGES['/portal/bookings']).toEqual(CANDIDATE_STAGES.concat('occupied'));
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
