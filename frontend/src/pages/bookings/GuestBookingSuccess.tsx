import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { PublicBookingResult } from '../../types';
import { formatDate } from './guestBookingUtils';
import { formatRupiah } from '../../utils/formatCurrency';

interface GuestBookingSuccessProps {
  result: PublicBookingResult;
}

export default function GuestBookingSuccess({ result }: GuestBookingSuccessProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const tempPwd = result.portalAccess.temporaryPassword;

  const handleCopyPassword = async () => {
    if (!tempPwd) return;
    try {
      await navigator.clipboard.writeText(tempPwd);
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };


  return (
    <div className="public-page-shell">
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <Card className="content-card border-0">
          <Card.Body>
            <div className="text-center mb-4">
              <div className="fs-1 mb-2">&#x2705;</div>
              <h4>Booking dikirim, menunggu review admin</h4>
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
                  <StatusBadge status={result.booking.status} customLabel="Menunggu Review Admin" />
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
                    <div className="small text-muted">Batas tindak lanjut booking</div>
                    <div className="fw-semibold">{formatDate(result.booking.expiresAt)}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {tempPwd ? (
              <Alert variant="warning" className="small">
                <div className="text-danger fw-bold mb-2">⚠️ Password ini HANYA ditampilkan SEKALI. Salin dan simpan sekarang juga.</div>
                <strong>Password portal sementara Anda:</strong>
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  <code className="fs-5 bg-white px-2 py-1 rounded">{showPassword ? tempPwd : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</code>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                  <Button
                    variant={copied ? 'success' : 'outline-primary'}
                    size="sm"
                    onClick={handleCopyPassword}
                  >
                    {copied ? '\u2705 Disalin' : '\ud83d\udccb Salin'}
                  </Button>
                </div>
                {copyError ? (
                  <div className="text-danger small mt-2">
                    Browser tidak mengizinkan salin otomatis. Silakan salin password secara manual dari kolom di atas.
                  </div>
                ) : null}
                <div className="mt-2">
                  <strong>Simpan password ini.</strong> Password sementara hanya ditampilkan di halaman ini dan tidak akan dikirim melalui email atau SMS.
                </div>
              </Alert>
            ) : (
              <Alert variant="info" className="small">
                Gunakan akun portal yang sudah pernah dibuat untuk login. Email: <strong>{result.portalAccess.email}</strong>
              </Alert>
            )}

            {/* Info pembayaran */}
            {result.payment && (
              <div className="p-3 rounded mb-3" style={{ background: '#fefce8', border: '1px solid #fde047', fontSize: '0.875rem' }}>
                <div className="fw-semibold mb-2">
                  {result.payment.paymentChoice === 'FULL'
                    ? '🧾 LUNAS — Bayar penuh sekarang'
                    : '💰 DP 30% — Bayar sekarang untuk amankan kamar'}
                </div>
                <div className="d-flex justify-content-between">
                  <span>Yang harus dibayar sekarang</span>
                  <strong>
                    <CurrencyDisplay amount={
                      result.payment.paymentChoice === 'FULL'
                        ? result.payment.agreedRentAmountRupiah + result.payment.depositAmountRupiah
                        : result.payment.downPaymentAmountRupiah
                    } />
                  </strong>
                </div>
                {result.payment.paymentChoice === 'DP' && (
                  <div className="small text-muted mt-1">
                    Sisa sewa + deposit ({formatRupiah(result.payment.agreedRentAmountRupiah - result.payment.downPaymentAmountRupiah + result.payment.depositAmountRupiah)}) dilunasi sebelum check-in.
                  </div>
                )}
                {result.payment.hasPet && (
                  <div className="small mt-1" style={{ color: '#0369a1' }}>
                    🐾 Termasuk deposit hewan {formatRupiah(result.payment.depositBreakdown.petDepositRupiah)} (refundable).
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <h6 className="fw-semibold mb-3">🔐 Bagaimana kamar diamankan?</h6>
              <ol className="small mb-0" style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li className="mb-2">
                  <strong>Admin me-review booking Anda</strong> — biasanya dalam hitungan jam.
                </li>
                <li className="mb-2">
                  <strong>Invoice resmi terbit di portal</strong> — login dengan akun yang baru dibuat untuk melihat tagihan.
                </li>
                <li className="mb-2">
                  <strong>Bayar DP atau LUNAS sesuai pilihan Anda</strong> — begitu pembayaran disetujui admin,{' '}
                  <span className="text-success fw-semibold">kamar resmi menjadi milik Anda</span>.
                </li>
                <li className="mb-2">
                  <span className="text-danger">⚠️ Tanpa pembayaran, kamar bisa dipesan orang lain</span> — sistem kami menganut{' '}
                  <strong>first-paid-wins</strong>: siapa yang bayar duluan (termasuk DP), dialah yang dapat kamar.
                </li>
                <li className="mb-2">
                  <strong>Booking otomatis kedaluwarsa dalam 3 jam</strong> jika belum ada tindak lanjut pembayaran.
                </li>
              </ol>
            </div>

            <Alert variant="warning" className="small mb-0 mt-3">
              <strong>Jangan transfer sebelum tagihan resmi muncul di portal.</strong> Pantau status booking di portal penghuni.
            </Alert>

            <div className="d-flex gap-2 justify-content-center mt-4 flex-wrap">
              <Link to="/rooms" className="btn btn-outline-secondary">Lihat Kamar Lain</Link>
              <Link to="/login" className="btn btn-primary">Pantau Booking di Portal</Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
