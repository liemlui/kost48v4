import { Alert, Card, Col, ProgressBar, Row, Spinner } from 'react-bootstrap';
import type { UseQueryResult } from '@tanstack/react-query';
import EmptyState from '../../components/common/EmptyState';
import type { CustomerDemographics, DemographicsBucket } from '../../api/marketAnalysis';
import type { DemographicsSummary } from '../../api/tenants';

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

function mapCountRecord(record?: Record<string, number>): DemographicsBucket[] {
  return Object.entries(record ?? {})
    .map(([label, count]) => ({ label, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default function DemographicsPanel({
  query,
  tenantSummaryQuery,
}: {
  query: UseQueryResult<CustomerDemographics>;
  tenantSummaryQuery?: UseQueryResult<DemographicsSummary>;
}) {
  if (query.isLoading) {
    return <div className="text-center py-5"><Spinner /> <span className="ms-2 text-muted">Memuat demografi...</span></div>;
  }
  if (query.isError || !query.data) {
    return <Alert variant="danger" className="mt-3">Gagal memuat demografi customer.</Alert>;
  }
  const d = query.data;
  const tenantSummary = tenantSummaryQuery?.data;
  if (!d.totalTenants) {
    return <EmptyState icon="People" title="Belum ada data penghuni" description="Demografi muncul setelah ada penghuni terdaftar." />;
  }

  const coverPct = (n: number) => (d.totalTenants ? Math.round((n / d.totalTenants) * 100) : 0);

  return (
    <div className="mt-3">
      <Alert variant="light" className="border small mb-3">
        Agregat <strong>teranonim</strong> dari <strong>{d.totalTenants}</strong> penghuni tanpa NIK, nama, atau alamat lengkap.
        Kelengkapan data: gender {coverPct(d.coverage.gender)}%, tgl lahir {coverPct(d.coverage.birthDate)}%, provinsi {coverPct(d.coverage.originProvince)}%, kota asal {coverPct(d.coverage.originCity)}%, pekerjaan {coverPct(d.coverage.occupation)}%.
      </Alert>
      <Row className="g-3">
        <Col md={6}><BucketBars title="Rentang Usia" icon="Usia" buckets={d.ageRanges} total={d.totalTenants} /></Col>
        <Col md={6}><BucketBars title="Gender" icon="Gender" buckets={d.genders} total={d.totalTenants} labelMap={GENDER_LABELS} /></Col>
        <Col md={6}><BucketBars title="Provinsi Asal (Top 10)" icon="Provinsi" buckets={d.topOriginProvinces} total={d.totalTenants} /></Col>
        <Col md={6}><BucketBars title="Kota Asal (Top 10)" icon="Kota" buckets={d.topOriginCities} total={d.totalTenants} /></Col>
        <Col md={6}><BucketBars title="Pekerjaan (Top 10)" icon="Kerja" buckets={d.topOccupations} total={d.totalTenants} /></Col>
        {tenantSummary ? (
          <>
            <Col md={6}><BucketBars title="Sumber Lead" icon="Lead" buckets={mapCountRecord(tenantSummary.leadSources)} total={tenantSummary.totalTenants} /></Col>
            <Col md={6}><BucketBars title="Status Pernikahan" icon="Status" buckets={mapCountRecord(tenantSummary.maritalStatus)} total={tenantSummary.totalTenants} /></Col>
            <Col md={6}><BucketBars title="Kepemilikan Kendaraan" icon="Kendaraan" buckets={mapCountRecord(tenantSummary.vehicleOwnership)} total={tenantSummary.totalTenants} /></Col>
          </>
        ) : null}
      </Row>
    </div>
  );
}
