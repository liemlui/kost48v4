import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { PublicBookingResult } from '../../types';
import { formatDate } from './guestBookingUtils';

interface GuestBookingSuccessProps {
  result: PublicBookingResult;
}

export default function GuestBookingSuccess({ result }: GuestBookingSuccessProps) {
  const [showPassword, setShowPassword] = useState(false);
  const tempPwd = result.portalAccess.temporaryPassword;

  return (
    <div className="public-page-shell">
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <Card className="content-card border-0">
          <Card.Body>
            <div className="text-center mb-4">
              <div className="fs-1 mb-2">&#x2705;</div>
              <h4>Booking berhasil dibuat</h4>
              <p className="text-muted">{result.message}</p>
            </div>

            <div className="border rounded-4 p-3 mb-3 bg-light-subtle">
              <div className="row g-2">
                <div className="col-6">
                  <div className="small text-muted">Kode Kamar</div>
                  <div className="fw-semibold">{result.booking.roomCode}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Status</div>
                  <StatusBadge status={result.booking.status} customLabel="Menunggu Approval" />
                </div>
                <div className="col-6">
                  <div className="small text-muted">Check-in</div>
                  <div className="fw-semibold">{formatDate(result.booking.checkInDate)}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Term</div>
                  <div className="fw-semibold">{getStatusLabel(result.booking.pricingTerm)}</div>
                </div>
                {result.booking.expiresAt ? (
                  <div className="col-12">
                    <div className="small text-muted">Booking berlaku hingga</div>
                    <div className="fw-semibold">{formatDate(result.booking.expiresAt)}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {tempPwd ? (
              <Alert variant="warning" className="small">
                <strong>Password portal sementara Anda:</strong>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <code className="fs-5 bg-white px-2 py-1 rounded">{showPassword ? tempPwd : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</code>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                </div>
                <div className="mt-2">
                  <strong>Simpan password ini.</strong> Password sementara hanya ditampilkan di halaman ini dan tidak akan dikirim melalui email atau SMS.
                </div>
              </Alert>
            ) : (
              <Alert variant="info" className="small">
                Gunakan akun portal yang sudah pernah dibuat untuk login. Email: <strong>{result.portalAccess.email}</strong>
              </Alert>
            )}

            <Alert variant="light" className="small mb-0">
              {result.portalAccess.instructions}
            </Alert>

            <div className="d-flex gap-2 justify-content-center mt-4 flex-wrap">
              <Link to="/rooms" className="btn btn-outline-secondary">Lihat Kamar Lain</Link>
              <Link to="/login" className="btn btn-primary">Masuk ke Portal</Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}