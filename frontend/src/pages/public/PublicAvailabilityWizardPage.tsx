import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Container, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  getPublicAvailabilitySetup,
  savePublicAvailabilitySetup,
  type PublicAvailabilitySetup,
  type PublicAvailabilityStatus,
} from '../../api/publicAvailability';

type WizardStep = 'pin' | 'edit' | 'review';

const STATUS_OPTIONS: Array<{ value: PublicAvailabilityStatus; label: string; helper: string; variant: string }> = [
  { value: 'AVAILABLE', label: 'Tersedia', helper: 'Tampil hijau; calon penghuni diarahkan ke WhatsApp.', variant: 'success' },
  { value: 'FULL', label: 'Penuh', helper: 'Tampil penuh/terisi; tetap dapat ditanyakan lewat WhatsApp.', variant: 'secondary' },
  { value: 'HIDDEN', label: 'Sembunyikan', helper: 'Tidak tampil di beranda maupun katalog publik.', variant: 'outline-secondary' },
];

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return 'Tidak dapat menghubungi server. Coba lagi.';
}

export default function PublicAvailabilityWizardPage() {
  const [step, setStep] = useState<WizardStep>('pin');
  const [pin, setPin] = useState('');
  const [setup, setSetup] = useState<PublicAvailabilitySetup | null>(null);
  const [draft, setDraft] = useState<Record<number, PublicAvailabilityStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const counts = useMemo(() => {
    const values = Object.values(draft);
    return {
      available: values.filter((status) => status === 'AVAILABLE').length,
      full: values.filter((status) => status === 'FULL').length,
      hidden: values.filter((status) => status === 'HIDDEN').length,
    };
  }, [draft]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.trim()) return;
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const data = await getPublicAvailabilitySetup(pin);
      setSetup(data);
      setDraft(Object.fromEntries(data.rooms.map((room) => [room.id, room.publicStatus])));
      setStep('edit');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  const save = async () => {
    if (!setup) return;
    setIsSaving(true);
    setError(null);
    try {
      const data = await savePublicAvailabilitySetup(
        pin,
        dataToSave(setup, draft),
      );
      setSetup(data);
      setDraft(Object.fromEntries(data.rooms.map((room) => [room.id, room.publicStatus])));
      setSaved(true);
      setStep('edit');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const applyStatusToAll = (status: PublicAvailabilityStatus) => {
    if (!setup) return;
    setDraft(Object.fromEntries(setup.rooms.map((room) => [room.id, status])));
    setSaved(false);
  };

  return (
    <main className="public-page-shell">
      <Container className="py-4 py-lg-5" style={{ maxWidth: 920 }}>
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
          <div>
            <div className="page-eyebrow">Pengaturan pemilik</div>
            <h1 className="mb-1">Wizard ketersediaan kamar</h1>
            <p className="text-muted mb-0">Atur tampilan katalog tanpa mengubah status hunian, tagihan, atau meter kamar.</p>
          </div>
          <Link to="/" className="btn btn-outline-secondary">Kembali ke beranda</Link>
        </div>

        <div className="d-flex gap-2 mb-4 small">
          {(['pin', 'edit', 'review'] as WizardStep[]).map((item, index) => (
            <span key={item} className={`badge ${step === item ? 'text-bg-primary' : 'text-bg-light border text-secondary'}`}>
              {index + 1}. {item === 'pin' ? 'PIN' : item === 'edit' ? 'Atur kamar' : 'Periksa'}
            </span>
          ))}
        </div>

        {error ? <Alert variant="danger">{error}</Alert> : null}
        {saved ? <Alert variant="success">Ketersediaan publik sudah diperbarui. Beranda dan katalog akan memakai status baru saat dimuat ulang.</Alert> : null}

        {step === 'pin' ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4" style={{ maxWidth: 520 }}>
              <h2 className="h5">Masukkan PIN owner</h2>
              <p className="text-muted small">PIN tidak disimpan di browser dan tidak perlu akun admin.</p>
              <Form onSubmit={unlock}>
                <Form.Group className="mb-3" controlId="availability-owner-pin">
                  <Form.Label>PIN owner</Form.Label>
                  <Form.Control type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} disabled={isLoading} />
                </Form.Group>
                <Button type="submit" disabled={isLoading || !pin.trim()}>
                  {isLoading ? <><Spinner size="sm" className="me-2" />Memeriksa…</> : 'Lanjutkan'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        ) : null}

        {step === 'edit' && setup ? (
          <>
            {!setup.onlineBookingEnabled ? <Alert variant="info">Booking online sedang nonaktif. Kamar yang tersedia akan mengarahkan calon penghuni ke WhatsApp.</Alert> : null}
            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              <span className="small text-muted me-1">Set semua status publik:</span>
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={`outline-${option.variant === 'outline-secondary' ? 'secondary' : option.variant}`}
                  onClick={() => applyStatusToAll(option.value)}
                  title={`Terapkan ${option.label.toLowerCase()} ke semua kamar. Perubahan baru berlaku setelah disimpan.`}
                >
                  Semua {option.label.toLowerCase()}
                </Button>
              ))}
            </div>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                {setup.rooms.map((room) => (
                  <div key={room.id} className="p-3 border-bottom d-md-flex align-items-center justify-content-between gap-3">
                    <div className="mb-2 mb-md-0">
                      <strong>{room.code}</strong>{room.name ? ` — ${room.name}` : ''}
                      {room.floor ? <div className="small text-muted">{room.floor}</div> : null}
                    </div>
                    <div className="btn-group" role="group" aria-label={`Status publik ${room.code}`}>
                      {STATUS_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          size="sm"
                          variant={draft[room.id] === option.value ? option.variant : 'outline-secondary'}
                          onClick={() => { setDraft((current) => ({ ...current, [room.id]: option.value })); setSaved(false); }}
                          title={option.helper}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
            <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mt-4">
              <span className="text-muted small">{counts.available} tersedia · {counts.full} penuh · {counts.hidden} disembunyikan</span>
              <Button onClick={() => { setStep('review'); setSaved(false); }}>Periksa sebelum simpan</Button>
            </div>
          </>
        ) : null}

        {step === 'review' && setup ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h2 className="h5">Periksa perubahan</h2>
              <p className="text-muted">Beranda dan katalog akan menampilkan {counts.available} kamar tersedia, {counts.full} kamar penuh, dan menyembunyikan {counts.hidden} kamar.</p>
              <Alert variant="warning" className="small">Ini hanya mengubah tampilan publik. Data penghuni, billing, meter, dan status operasional kamar tidak berubah.</Alert>
              <div className="d-flex gap-2 flex-wrap">
                <Button variant="outline-secondary" onClick={() => setStep('edit')} disabled={isSaving}>Kembali</Button>
                <Button onClick={save} disabled={isSaving}>
                  {isSaving ? <><Spinner size="sm" className="me-2" />Menyimpan…</> : 'Simpan ketersediaan'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        ) : null}
      </Container>
    </main>
  );
}

function dataToSave(setup: PublicAvailabilitySetup, draft: Record<number, PublicAvailabilityStatus>) {
  return setup.rooms.map((room) => ({
    roomId: room.id,
    status: draft[room.id] ?? room.publicStatus,
  }));
}
