import { Button, Card } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';

const WHATSAPP_NUMBER = '6285648887628';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function WifiOrderPage() {
  return (
    <div>
      <PageHeader title="Pesan WiFi" description="Dummy flow sementara untuk pembelian paket WiFi tenant." />
      <Card className="content-card border-0">
        <Card.Body>
          <div className="mb-3 small text-uppercase text-muted fw-semibold">Prosedur sementara</div>
          <h4 className="mb-3">Hubungi WhatsApp pengelola untuk pesan WiFi</h4>
          <p className="text-muted mb-4">
            Untuk sementara, proses pembelian paket WiFi belum dibuat penuh di sistem. Silakan hubungi WhatsApp berikut untuk memesan paket atau menanyakan harga terbaru.
          </p>
          <div className="alert alert-info small mb-4">
            <strong>Kontak WiFi:</strong> 085648887628<br />
            Banner harga dan proses pemesanan penuh akan disambungkan pada iterasi berikutnya.
          </div>
          <Button as="a" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Hubungi via WhatsApp
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
