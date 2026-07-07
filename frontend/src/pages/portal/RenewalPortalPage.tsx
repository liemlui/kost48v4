import '../../styles/tenant-area';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';

/**
 * R-13 — Stub halaman /portal/renewal.
 * Fitur perpanjangan kontrak ada di halaman "Panduan Kos Saya" (MyStayPage).
 * Halaman ini menginformasikan lokasi yang benar dan mengalihkan setelah sebentar.
 */
export default function RenewalPortalPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/portal/stay', { replace: true }), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Perpanjangan Kontrak"
        description="Ajukan perpanjangan masa sewa dari halaman Panduan Kos Saya."
      />
      <Card className="content-card border-0">
        <Card.Body className="text-center py-5">
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <h5 className="mb-2">Fitur Perpanjangan Kontrak ada di Panduan Kos Saya</h5>
          <p className="text-muted mb-4">
            Untuk mengajukan perpanjangan masa sewa, buka halaman <strong>Panduan Kos Saya</strong> lalu
            klik tombol <strong>&quot;Ajukan Perpanjangan Masa Sewa&quot;</strong>.
          </p>
          <Alert variant="info" className="text-start mb-4">
            Syarat perpanjangan: tidak ada tagihan aktif. Selesaikan semua tagihan terlebih
            dahulu, baru ajukan perpanjangan.
          </Alert>
          <Button variant="primary" onClick={() => navigate('/portal/stay', { replace: true })}>
            Buka Panduan Kos Saya
          </Button>
          <p className="text-muted small mt-3">Akan diarahkan otomatis dalam 5 detik...</p>
        </Card.Body>
      </Card>
    </div>
  );
}
