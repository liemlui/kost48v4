import { Button, Card } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';

const WHATSAPP_NUMBER = '6285648887628';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function WifiOrderPage() {
  return (
    <div>
      <PageHeader eyebrow="Portal Penghuni" title="Pesan WiFi" description="Pesan atau tanya paket WiFi lewat WhatsApp." />
      <Card className="content-card border-0">
        <Card.Body>
          <div className="mb-3 small text-uppercase text-muted fw-semibold">Cara pesan WiFi</div>
          <h4 className="mb-2">WiFi tambahan</h4>
          <p className="text-muted mb-3">
            Untuk saat ini pemesanan WiFi diproses lewat WhatsApp agar paket dan harga bisa dikonfirmasi langsung.
          </p>
          <div className="tenant-wifi-steps mb-3">
            <span><strong>1</strong> Chat pengelola</span>
            <span><strong>2</strong> Pilih paket</span>
            <span><strong>3</strong> Ikuti instruksi bayar</span>
          </div>
          <div className="alert alert-info small mb-3">
            <strong>Kontak WiFi:</strong> 085648887628
          </div>
          <Button as="a" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Hubungi via WhatsApp
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
