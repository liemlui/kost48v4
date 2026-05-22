import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import type { StaffPerformanceSummary } from '../../api/staffPerformance';
import type { InventoryItem } from '../../types';
import { getInventoryHealth } from '../../utils/inventoryHealth';

type Props = { performance?: StaffPerformanceSummary | null; compact?: boolean };
type FocusItem = { title: string; copy: string; tone: 'good' | 'warn' | 'danger' | 'info' };

function buildFocus(performance?: StaffPerformanceSummary | null, inventoryItems: InventoryItem[] = []) {
  const items: FocusItem[] = [];
  const healthRows = inventoryItems
    .filter((item) => item.isActive !== false && String(item.category ?? '').toUpperCase() !== 'BARANG_KAMAR')
    .map((item) => ({ item, health: getInventoryHealth(item) }));
  const outOfStock = healthRows.filter((row) => row.health.status === 'OUT_OF_STOCK');
  const lowStock = healthRows.filter((row) => row.health.status === 'LOW_STOCK');

  if (outOfStock.length) {
    items.push({
      title: `${outOfStock.length} barang gudang habis`,
      copy: `${outOfStock.slice(0, 2).map((row) => row.item.name).join(', ')}${outOfStock.length > 2 ? ', ...' : ''}. Sistem menghitung ini otomatis dari stok 0; staff tidak perlu lapor status habis manual.`,
      tone: 'danger',
    });
  }

  if (lowStock.length) {
    items.push({
      title: `${lowStock.length} stok menipis`,
      copy: `${lowStock.slice(0, 2).map((row) => row.item.name).join(', ')}${lowStock.length > 2 ? ', ...' : ''}. Pertimbangkan restock sebelum menghambat perbaikan kamar.`,
      tone: 'warn',
    });
  }

  if (!performance) return items;
  const kpi = performance.monthlyKpi;
  const score = performance.score;
  if ((score.negativeValue ?? 0) > 0) items.push({ title: 'Lengkapi bukti kerja', copy: `${score.negativeValue} catatan perbaikan terdeteksi. Utamakan foto/catatan untuk pekerjaan yang perlu dicek.`, tone: 'warn' });
  if ((kpi.proofCompletionRate ?? 100) < 80) items.push({ title: 'Bukti foto belum kuat', copy: `Bukti foto lengkap baru ${kpi.proofCompletionRate}%. Foto membuat laporan kerja lebih dipercaya.`, tone: 'warn' });
  if ((kpi.meterCount ?? 0) === 0) items.push({ title: 'Catat meter listrik/air', copy: 'Belum ada catatan meter bulan ini. Catat meter saat jadwal cek kamar atau akhir bulan.', tone: 'info' });
  if ((performance.tenantReviews.count ?? 0) === 0) items.push({ title: 'Review tenant belum masuk', copy: 'Setelah tugas selesai, review tenant akan membantu membuktikan kualitas kerja.', tone: 'info' });
  if ((kpi.auditFailed ?? 0) > 0) items.unshift({ title: 'Ada audit perlu ulang', copy: 'Cek pekerjaan yang belum sesuai dan kerjakan ulang dengan bukti yang jelas.', tone: 'danger' });
  if (!items.length) items.push({ title: 'Pertahankan ritme kerja', copy: 'Data hari ini stabil. Sistem akan otomatis mengangkat stok menipis, ticket tertahan, dan pekerjaan yang perlu bukti.', tone: 'good' });
  return items.slice(0, 4);
}

export default function StaffIntelligencePanel({ performance, compact = false }: Props) {
  const inventoryQuery = useQuery({
    queryKey: ['staff-assistant-inventory-health'],
    queryFn: () => listResource<InventoryItem>('/inventory-items', { limit: 200, isActive: 'true' }),
    staleTime: 60_000,
  });
  const focus = useMemo(() => buildFocus(performance, inventoryQuery.data?.items ?? []), [performance, inventoryQuery.data?.items]);
  const firstFocus = focus[0];

  if (compact) {
    return (
      <Card className="staff-coach-strip border-0">
        <Card.Body>
          <span className="staff-hero-pill">Asisten KOST48</span>
          <div>
            <strong>{firstFocus?.title ?? performance?.assistant?.title ?? 'Arahan hari ini'}</strong>
            <small>{firstFocus?.copy ?? performance?.assistant?.summary ?? 'Kerjakan tugas dari yang paling atas. Sistem otomatis mengangkat stok dan ticket yang perlu perhatian.'}</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="content-card staff-intelligence-panel border-0">
      <Card.Body>
        <div className="smart-panel-header slim">
          <div>
            <span className="staff-hero-pill">Asisten KOST48</span>
            <h3>Prioritas Operasional</h3>
            <p>Ringkasan otomatis dari checklist, tugas, meter, stok, pengecekan admin, dan review tenant.</p>
          </div>
          <div className="smart-audit-scorebox small">
            <strong>{performance?.score.final ?? '-'}</strong>
            <small>/100</small>
          </div>
        </div>
        {performance?.assistant ? (
          <div className="smart-brief-box staff-coach-summary">
            <strong>{performance.assistant.title}</strong>
            <span>{performance.assistant.summary}</span>
          </div>
        ) : null}
        <div className="staff-coach-focus-grid">
          {focus.slice(0, 3).map((item) => (
            <article key={item.title} className={`staff-coach-focus tone-${item.tone}`}>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </article>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
