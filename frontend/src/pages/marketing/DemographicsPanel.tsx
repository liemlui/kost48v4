import { Alert, Card, Col, ProgressBar, Row, Spinner } from 'react-bootstrap';
import type { UseQueryResult } from '@tanstack/react-query';
import EmptyState from '../../components/common/EmptyState';
import type { CustomerDemographics, DemographicsBucket } from '../../api/marketAnalysis';

const GENDER_LABELS: Record<string, string> = { MALE: 'Laki-laki', FEMALE: 'Perempuan', OTHER: 'Lainnya', 'Tidak diketahui': 'Tidak diketahui' };

function BucketBars({ title, icon, buckets, total, labelMap }: { title: string; icon: string; buckets: DemographicsBucket[]; total: number; labelMap?: Record<string, string> }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const shown = buckets.filter((b) => b.count > 0);
  return (
    <Card className="content-card border-0 shadow-sm h-100">
      <Card.Body>
        <div className="fw-semibold mb-3">{icon} {title}</div>
        {shown.length ? (
          shown.map((b) => {
            const label = labelMap?.[b.label] ?? b.label;
            const pct = total ? Math.round((b.count / total) * 100) : 0;
            return (
              <div key={b.label} className="mb-2">
                <div className="d-flex justify-content-between small mb-1">
                  <span>{label}</span>
                  <span className="text-muted">{b.count} ({pct}%)</span>
                </div>
                <ProgressBar now={(b.count / max) * 100} style={{ height: 8 }} />
              </div>
            );
          })
        ) : (
          <div className="text-muted small">Belum ada data.</div>
        )}
      </Card.Body>
    </Card>
  );
}

export default function DemographicsPanel({ query }: { query: UseQueryResult<CustomerDemographics> }) {
  if (query.isLoading) {
    return <div className="text-center py-5"><Spinner /> <span className="ms-2 text-muted">Memuat demografi…</span></div>;
  }
  if (query.isError || !query.data) {
    return <Alert variant="danger" className="mt-3">Gagal memuat demografi customer.</Alert>;
  }
  const d = query.data;
  if (!d.totalTenants) {
    return <EmptyState icon="👥" title="Belum ada data penghuni" description="Demografi muncul setelah ada penghuni terdaftar." />;
  }

  const coverPct = (n: number) => (d.totalTenants ? Math.round((n / d.totalTenants) * 100) : 0);

  return (
    <div className="mt-3">
      <Alert variant="light" className="border small mb-3">
        📊 Agregat <strong>teranonim</strong> dari <strong>{d.totalTenants}</strong> penghuni — tanpa NIK, nama, atau alamat lengkap (sesuai UU PDP).
        Kelengkapan data: gender {coverPct(d.coverage.gender)}%, tgl lahir {coverPct(d.coverage.birthDate)}%, provinsi {coverPct(d.coverage.originProvince)}%, kota asal {coverPct(d.coverage.originCity)}%, pekerjaan {coverPct(d.coverage.occupation)}%.
      </Alert>
      <Row className="g-3">
        <Col md={6}><BucketBars title="Rentang Usia" icon="🎂" buckets={d.ageRanges} total={d.totalTenants} /></Col>
        <Col md={6}><BucketBars title="Gender" icon="⚧" buckets={d.genders} total={d.totalTenants} labelMap={GENDER_LABELS} /></Col>
        <Col md={6}><BucketBars title="Provinsi Asal (Top 10)" icon="🗺️" buckets={d.topOriginProvinces} total={d.totalTenants} /></Col>
        <Col md={6}><BucketBars title="Kota Asal (Top 10)" icon="📍" buckets={d.topOriginCities} total={d.totalTenants} /></Col>
        <Col md={6}><BucketBars title="Pekerjaan (Top 10)" icon="💼" buckets={d.topOccupations} total={d.totalTenants} /></Col>
      </Row>
    </div>
  );
}
