import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Container, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  getPublicAvailabilitySetup,
  savePublicAvailabilitySetup,
  type PublicAvailabilityRoom,
  type PublicAvailabilityStatus,
} from '../../api/publicAvailability';

/**
 * /okupansi — halaman ringkas untuk mengubah ketersediaan kamar dari HP.
 *
 * Beda dengan /update-kamar (wizard bertahap lengkap), halaman ini menampilkan
 * SEMUA kamar sekaligus dan menyimpan perubahan segera setelah tombol ditekan.
 * Memakai endpoint publik yang sama dengan wizard (PIN owner + X-Availability-Pin),
 * jadi tidak ada kontrak API baru.
 *
 * Aman dari tabrakan: sebelum menyimpan, status terkini diambil ulang dari server
 * dan hanya kamar yang benar-benar berubah yang dikirim.
 */

const STATUS_META: Array<{ value: PublicAvailabilityStatus; label: string; short: string; variant: string }> = [
  { value: 'AVAILABLE', label: 'Tersedia', short: 'Kosong', variant: 'success' },
  { value: 'FULL', label: 'Penuh', short: 'Terisi', variant: 'secondary' },
  { value: 'HIDDEN', label: 'Sembunyikan', short: 'Disembunyikan', variant: 'outline-secondary' },
];

function statusMeta(status: PublicAvailabilityStatus) {
  return STATUS_META.find((option) => option.value === status) ?? STATUS_META[1];
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return 'Tidak dapat menghubungi server. Coba lagi.';
}

export default function OkupansiPage() {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [rooms, setRooms] = useState<PublicAvailabilityRoom[]>([]);
  const [draft, setDraft] = useState<Record<number, PublicAvailabilityStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [busyRoomId, setBusyRoomId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (activePin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicAvailabilitySetup(activePin);
      setRooms(data.rooms);
      setDraft(Object.fromEntries(data.rooms.map((room) => [room.id, room.publicStatus])));
      return data;
    } catch (requestError) {
      setError(errorMessage(requestError));
      setRooms([]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!savedPin) return;
    void load(savedPin);
  }, [savedPin, load]);

  const counts = useMemo(() => {
    const values = Object.values(draft);
    return {
      available: values.filter((status) => status === 'AVAILABLE').length,
      full: values.filter((status) => status === 'FULL').length,
      hidden: values.filter((status) => status === 'HIDDEN').length,
    };
  }, [draft]);

  const unlock = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = pin.trim();
    if (!trimmed) return;
    setNotice(null);
    setSavedPin(trimmed);
  };

  const changeStatus = async (room: PublicAvailabilityRoom, next: PublicAvailabilityStatus) => {
    if (!savedPin || busyRoomId !== null) return;
    const current = draft[room.id];
    if (current === next) return;

    setBusyRoomId(room.id);
    setError(null);
    setNotice(null);
    try {
      // Ambil status terbaru dulu supaya tidak menimpa perubahan dari tab/perangkat lain.
      const latest = await getPublicAvailabilitySetup(savedPin);
      const latestDraft = Object.fromEntries(latest.rooms.map((item) => [item.id, item.publicStatus])) as Record<
        number,
        PublicAvailabilityStatus
      >;
      const latestRoom = latest.rooms.find((item) => item.id === room.id);
      if (latestRoom && latestRoom.publicStatus !== current) {
        setRooms(latest.rooms);
        setDraft(latestDraft);
        setError(
          `Status kamar ${room.code} sudah berubah di server (kini "${statusMeta(latestRoom.publicStatus).label}"). Halaman dimuat ulang — silakan tekan lagi.`,
        );
        return;
      }

      await savePublicAvailabilitySetup(savedPin, [{ roomId: room.id, status: next }]);
      setRooms(latest.rooms.map((item) => (item.id === room.id ? { ...item, publicStatus: next } : item)));
      setDraft({ ...latestDraft, [room.id]: next });
      setNotice(`Kamar ${room.code} → ${statusMeta(next).label}. Tersimpan.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusyRoomId(null);
    }
  };

  if (!savedPin) {
    return (
      <Container className="py-4" style={{ maxWidth: 520 }}>
        <Card>
          <Card.Body>
            <h1 className="h5 mb-1">Ubah Ketersediaan Kamar</h1>
            <p className="text-muted small mb-3">
              Masukkan PIN owner untuk melihat dan mengubah status kamar di katalog publik.
            </p>
            {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
            <Form onSubmit={unlock}>
              <Form.Group className="mb-3" controlId="okupansi-pin">
                <Form.Label>PIN owner</Form.Label>
                <Form.Control
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder="PIN"
                />
              </Form.Group>
              <Button type="submit" variant="primary" className="w-100" disabled={!pin.trim() || isLoading}>
                {isLoading ? <Spinner size="sm" animation="border" /> : 'Buka'}
              </Button>
            </Form>
            <div className="text-center mt-3 small">
              <Link to="/cek">Lihat checklist go-live</Link>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-3" style={{ maxWidth: 720 }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div>
          <h1 className="h5 mb-0">Ketersediaan Kamar</h1>
          <div className="text-muted small">
            Tersedia <strong>{counts.available}</strong> · Penuh <strong>{counts.full}</strong> · Disembunyikan{' '}
            <strong>{counts.hidden}</strong>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-secondary" onClick={() => void load(savedPin)} disabled={isLoading}>
            {isLoading ? 'Memuat…' : 'Muat ulang'}
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => {
              setSavedPin(null);
              setPin('');
              setRooms([]);
              setDraft({});
              setNotice(null);
              setError(null);
            }}
          >
            Kunci
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
      {notice && <Alert variant="success" className="py-2 small">{notice}</Alert>}

      <div className="d-grid gap-2">
        {rooms.map((room) => {
          const current = draft[room.id];
          const meta = statusMeta(current);
          const isBusy = busyRoomId === room.id;
          return (
            <Card key={room.id} className={current === 'AVAILABLE' ? 'border-success' : undefined}>
              <Card.Body className="py-2">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <strong>Kamar {room.code}</strong>
                    {room.floor ? <span className="text-muted small ms-2">lantai {room.floor}</span> : null}
                  </div>
                  <Badge bg={current === 'AVAILABLE' ? 'success' : current === 'FULL' ? 'secondary' : 'light'} text={current === 'HIDDEN' ? 'dark' : undefined}>
                    {meta.label}
                  </Badge>
                </div>
                <div className="d-flex gap-2">
                  {STATUS_META.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      className="flex-fill"
                      variant={current === option.value ? option.variant : `outline-${option.variant.replace('outline-', '')}`}
                      disabled={isBusy || busyRoomId !== null}
                      onClick={() => void changeStatus(room, option.value)}
                      style={{ minHeight: 44 }}
                    >
                      {isBusy && current !== option.value ? '…' : option.short}
                    </Button>
                  ))}
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {!isLoading && rooms.length === 0 && !error && (
        <Alert variant="warning" className="small">Tidak ada kamar yang bisa ditampilkan.</Alert>
      )}

      <p className="text-muted small mt-3 mb-0">
        Perubahan langsung tampil di katalog publik. Status <em>Tersedia</em> tampil hijau dan mengarahkan calon penghuni
        ke WhatsApp; <em>Penuh</em> tetap bisa ditanyakan; <em>Sembunyikan</em> menghilangkan kamar dari beranda dan
        katalog.
      </p>
      <div className="text-center mt-3 small">
        <Link to="/cek">Checklist go-live</Link>
      </div>
    </Container>
  );
}
