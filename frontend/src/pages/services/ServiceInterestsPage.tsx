import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  listServiceInterests,
  updateServiceInterest,
  type ServiceInterest,
  type ServiceInterestStatus,
} from '../../api/additionalServices';
import '../../styles/admin-area';

const STATUS_META: Record<ServiceInterestStatus, { label: string; bg: string }> = {
  PENDING: { label: 'Baru', bg: 'warning' },
  CONTACTED: { label: 'Dihubungi', bg: 'info' },
  DONE: { label: 'Selesai', bg: 'success' },
  CANCELLED: { label: 'Dibatalkan', bg: 'secondary' },
};

const TABS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'Baru' },
  { key: 'CONTACTED', label: 'Dihubungi' },
  { key: 'DONE', label: 'Selesai' },
  { key: '', label: 'Semua' },
];

export default function ServiceInterestsPage() {
  useDocumentTitle('Minat Layanan');
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('PENDING');

  const query = useQuery({
    queryKey: ['service-interests', tab],
    queryFn: () => listServiceInterests(tab || undefined),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ServiceInterestStatus }) =>
      updateServiceInterest(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-interests'] }),
  });

  const items = (query.data?.items ?? []) as ServiceInterest[];

  return (
    <FeatureErrorBoundary>
      <div>
        <PageHeader eyebrow="Layanan Tambahan" title="Minat Penghuni" description="Penghuni yang menyatakan minat atas layanan tambahan. Hubungi lalu tandai selesai." />

      <div className="d-flex flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <Button key={t.key} size="sm" variant={tab === t.key ? 'primary' : 'outline-primary'} onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="p-4"><TableSkeleton rows={4} cols={4} /></div>
      ) : items.length === 0 ? (
        <EmptyState icon="🛎️" title="Belum ada minat" description="Belum ada penghuni yang menyatakan minat pada kategori ini." />
      ) : (
        <div className="d-grid gap-2">
          {items.map((it) => {
            const meta = STATUS_META[it.status] ?? STATUS_META.PENDING;
            return (
              <Card key={it.id} className="border-0 shadow-sm">
                <Card.Body className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <strong>{it.service?.name ?? 'Layanan'}</strong>
                      <StatusBadge status={it.status === 'PENDING' ? 'WARNING' : it.status === 'CONTACTED' ? 'INFO' : it.status === 'DONE' ? 'SUCCESS' : 'SECONDARY'} customLabel={meta.label} />
                    </div>
                    <div className="small text-muted">
                      {it.tenant?.fullName ?? 'Penghuni'}{it.tenant?.phone ? ` · ${it.tenant.phone}` : ''}
                    </div>
                    {it.service ? (
                      <div className="small">
                        Tarif: <CurrencyDisplay amount={it.service.priceRupiah} />{it.service.unit ? ` ${it.service.unit}` : ''}
                      </div>
                    ) : null}
                    {it.note ? <div className="small fst-italic">"{it.note}"</div> : null}
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {it.status === 'PENDING' ? (
                      <Button size="sm" variant="outline-info" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: it.id, status: 'CONTACTED' })}>Tandai Dihubungi</Button>
                    ) : null}
                    {it.status !== 'DONE' && it.status !== 'CANCELLED' ? (
                      <Button size="sm" variant="outline-success" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: it.id, status: 'DONE' })}>Selesai</Button>
                    ) : null}
                    {it.status !== 'CANCELLED' && it.status !== 'DONE' ? (
                      <Button size="sm" variant="outline-secondary" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: it.id, status: 'CANCELLED' })}>Batalkan</Button>
                    ) : null}
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </FeatureErrorBoundary>
  );
}
