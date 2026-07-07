import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveGuestSurvey } from '../../api/bookings';
import RoomCard from '../rooms/RoomCard';
import type { PublicRoom } from '../../types';
import { isPublicRoomBookable } from '../../utils/publicRoomDisplay';

// ── Pricing simulator formula ───────────────────────────────────────────────
const BASE = 800_000;
function calcEstimate(opts: { bathroom: string; cooling: string; size: string; type: string }): number {
  let p = BASE;
  if (opts.bathroom === 'inside')    p += 500_000;
  if (opts.cooling  === 'ac')        p += 300_000;
  if (opts.type     === 'mezzanine') p += 150_000;
  if (opts.size     === 'large')     p += 200_000;
  return p;
}

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

// ── Match rooms against wizard answers ─────────────────────────────────────
function matchRooms(
  rooms: PublicRoom[],
  opts: { bathroom: string; cooling: string; size: string; type: string },
): { exact: PublicRoom[]; near: PublicRoom[] } {
  const score = (r: PublicRoom) => {
    const cat  = String(r.category  ?? '').toUpperCase();
    const rt   = String(r.roomType  ?? '').toUpperCase();
    const rs   = String(r.roomSize  ?? '').toUpperCase();

    const wantsKmDalam   = opts.bathroom === 'inside';
    const wantsAc        = opts.cooling  === 'ac';
    const wantsMezzanine = opts.type     === 'mezzanine';
    const wantsLarge     = opts.size     === 'large';

    const hasKmDalam   = cat !== 'ECONOMY';
    const hasAc        = cat === 'DELUXE';
    const hasMezzanine = rt  === 'MEZZANINE';
    const isLarge      = rs  === 'LARGE';

    let s = 0;
    if (wantsKmDalam   === hasKmDalam)   s++;
    if (wantsAc        === hasAc)        s++;
    if (wantsMezzanine === hasMezzanine) s++;
    if (wantsLarge     === isLarge)      s++;
    return s;
  };

  const scored = rooms.map((r) => ({ r, s: score(r) })).sort((a, b) => b.s - a.s);
  const exact  = scored.filter(({ s }) => s === 4).map(({ r }) => r);
  const near   = scored.filter(({ s }) => s >= 2 && s < 4).map(({ r }) => r).slice(0, 3);
  return { exact, near };
}

// ── Steps definition (marketing copy improved) ─────────────────────────────
const STEPS = [
  {
    key: 'bathroom',
    question: 'Pilih kamar mandi impianmu',
    sub: 'Kamar mandi dalam = lebih privat, tidak perlu antri. Kamar mandi luar = lebih hemat, cocok untuk kamu yang lebih sering di luar.',
    options: [
      { value: 'inside',  label: 'Kamar Mandi Dalam',  icon: '🚿', note: 'Privat di dalam kamar · Favorit penghuni' },
      { value: 'outside', label: 'Kamar Mandi Luar',   icon: '🚪', note: 'Berbagi, harga lebih hemat · Ramah di kantong' },
    ],
  },
  {
    key: 'cooling',
    question: 'Mau tidur nyaman sepanjang malam?',
    sub: 'AC bikin kamar sejuk 24 jam — cocok untuk kamu yang work-from-kost. Kipas lebih hemat listrik dan terasa natural.',
    options: [
      { value: 'ac',  label: 'AC',         icon: '❄️', note: 'Sejuk 24 jam · Work-from-kost friendly' },
      { value: 'fan', label: 'Kipas Angin', icon: '💨', note: 'Hemat listrik · Sirkulasi natural' },
    ],
  },
  {
    key: 'size',
    question: 'Butuh ruang gerak ekstra?',
    sub: 'Standar (7,5 m²) — efisien, maks 2 orang. Besar (10,5 m²) — lega, muat untuk kamu yang bawa banyak barang atau suka terima tamu.',
    options: [
      { value: 'standard', label: 'Standar', icon: '📦', note: '7,5 m² · Efisien · Maks 2 orang' },
      { value: 'large',    label: 'Besar',   icon: '🏠', note: '10,5 m² · Lega · Maks 4 orang' },
    ],
  },
  {
    key: 'type',
    question: 'Pengalaman kost yang beda?',
    sub: 'Mezzanine punya area tidur di lantai atas — cocok buat kamu yang suka konsep unik dan ingin ruang lebih terasa luas. Kamar biasa lebih simpel dan tradisional.',
    options: [
      { value: 'regular',   label: 'Kamar Biasa',  icon: '🛏️', note: 'Satu level · Simpel · Harga standar' },
      { value: 'mezzanine', label: 'Mezzanine',    icon: '🪜', note: 'Dua level · Unik · Ruang lebih lega' },
    ],
  },
] as const;

type StepKey = 'bathroom' | 'cooling' | 'size' | 'type';
type Answers = Record<StepKey, string>;

interface Props {
  rooms: PublicRoom[];
  roomsLoading?: boolean;
  onDone: (filters: { bathroom?: string; cooling?: string; size?: string; type?: string }) => void;
  onSkip: () => void;
}

export default function GuestPreferenceWizard({ rooms, roomsLoading = false, onDone, onSkip }: Props) {
  const [step, setStep] = useState<number>(0); // 0-3 = questions, 4 = result
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [saving, setSaving] = useState(false);
  const sessionId = useRef(Math.random().toString(36).slice(2));
  // Animasi direction: track apakah maju (true) atau mundur (false)
  const [animForward, setAnimForward] = useState(true);
  const prevStep = useRef(step);

  useEffect(() => {
    setAnimForward(step > prevStep.current);
    prevStep.current = step;
  }, [step]);

  const currentStep = STEPS[step];
  const totalSteps  = STEPS.length;

  const handleAnswer = useCallback((value: string) => {
    const key = currentStep.key as StepKey;
    const next = { ...answers, [key]: value };
    setAnswers(next);

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      // All answered → show result
      const estimate = calcEstimate({
        bathroom: next.bathroom ?? 'any',
        cooling:  next.cooling  ?? 'any',
        size:     next.size     ?? 'any',
        type:     next.type     ?? 'any',
      });
      setStep(totalSteps); // result screen
      setSaving(true);
      saveGuestSurvey({
        bathroom:             next.bathroom,
        cooling:              next.cooling,
        roomSize:             next.size,
        roomType:             next.type,
        estimatedPriceRupiah: estimate,
        skipped:              false,
        sessionId:            sessionId.current,
      }).finally(() => setSaving(false));
    }
  }, [answers, currentStep, step, totalSteps]);

  const handleSkip = useCallback(() => {
    // C01-07: skip tidak perlu kirim survey — hanya lanjut ke katalog
    onSkip();
  }, [onSkip]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Result screen data
  const estimate = useMemo(() => calcEstimate({
    bathroom: answers.bathroom ?? 'any',
    cooling:  answers.cooling  ?? 'any',
    size:     answers.size     ?? 'any',
    type:     answers.type     ?? 'any',
  }), [answers]);

  const { exact, near } = useMemo(() => matchRooms(rooms, {
    bathroom: answers.bathroom ?? 'any',
    cooling:  answers.cooling  ?? 'any',
    size:     answers.size     ?? 'any',
    type:     answers.type     ?? 'any',
  }), [rooms, answers]);

  // Hanya kamar yang bisa dibooking (AVAILABLE atau MAINTENANCE dengan allowBookingWhileCleaning)
  const availableExact = exact.filter((r) => isPublicRoomBookable(r));
  const availableNear  = near.filter((r) => isPublicRoomBookable(r));
  const occupiedExact  = exact.filter((r) => !availableExact.includes(r));

  const handleApplyFilters = useCallback(() => {
    onDone({
      bathroom: answers.bathroom,
      cooling:  answers.cooling,
      size:     answers.size,
      type:     answers.type,
    });
  }, [answers, onDone]);

  // ── Result screen ─────────────────────────────────────────────────────────
  if (step >= totalSteps) {
    // Tentukan card yang mau ditampilkan (max 6)
    const displayCards = [...availableExact, ...availableNear].slice(0, 6);
    const hasMore = availableExact.length + availableNear.length > 6;

    return (
      <div className="gpw-result">
        {/* ── Header ── */}
        <div key="result-head" className="gpw-result-head">
          <span className="gpw-result-icon">🎯</span>
          <div>
            <h3>Tarif spesial untuk preferensimu</h3>
            <p className="gpw-result-sub">
              {answers.bathroom === 'inside' ? 'KM Dalam' : 'KM Luar'} ·{' '}
              {answers.cooling  === 'ac'     ? 'AC'       : 'Kipas'}  ·{' '}
              {answers.size     === 'large'  ? 'Uk Besar' : 'Uk Standar'} ·{' '}
              {answers.type     === 'mezzanine' ? 'Mezzanine' : 'Kamar Biasa'}
            </p>
          </div>
        </div>

        {/* ── Estimasi ── */}
        <div key="result-estimate" className="gpw-estimate-box">
          <span className="gpw-estimate-label">Estimasi sewa per bulan</span>
          <strong className="gpw-estimate-price">Rp {fmt(estimate)} / bulan</strong>
        </div>

        {/* ── Loading ── */}
        {roomsLoading && (
          <div key="result-loading" className="gpw-loading-rooms">
            <span className="gpw-loading-dot" />
            <span className="gpw-loading-dot" />
            <span className="gpw-loading-dot" />
            <span className="gpw-loading-label">Memeriksa kamar yang tersedia…</span>
          </div>
        )}

        {/* ── Skeleton saat loading ── */}
        {roomsLoading && (
          <div key="result-skeleton" className="gpw-room-grid" style={{ opacity: 0.5 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="gpw-skeleton-card">
                <div className="gpw-skeleton-img" />
                <div className="gpw-skeleton-body">
                  <div className="gpw-skeleton-line" />
                  <div className="gpw-skeleton-line" />
                  <div className="gpw-skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Kamar cocok + tersedia → RoomCard grid ── */}
        {!roomsLoading && displayCards.length > 0 && (
          <div key="result-rooms">
            {/* Urgency line */}
            {availableExact.length > 0 && (
              <div className="gpw-urgency-line">
                <span /> 🔥 {availableExact.length} kamar dengan spesifikasi ini tersedia — cek sekarang!
              </div>
            )}

            <div className="gpw-room-grid">
              {displayCards.map((r) => (
                <div key={r.id} className="gpw-room-in-result">
                  <RoomCard
                    room={r}
                    showCompare={false}
                  />
                </div>
              ))}
            </div>

            {hasMore && (
              <p className="gpw-urgency-muted">
                +{availableExact.length + availableNear.length - 6} kamar lainnya sesuai preferensi
              </p>
            )}
          </div>
        )}

        {/* ── Kamar exact match tapi penuh ── */}
        {!roomsLoading && displayCards.length === 0 && occupiedExact.length > 0 && (
          <div key="result-occupied" className="gpw-match-section">
            <h4 className="gpw-match-title">⏳ Kamar sesuai — saat ini penuh</h4>
            <p className="gpw-match-note">
              Kamar dengan spesifikasi persis yang kamu minta sedang terisi. Tenang saja, kamu bisa hubungi admin untuk waitlist atau lihat kamar terdekat lainnya.
            </p>
            <div className="gpw-match-chips">
              {occupiedExact.map((r) => (
                <span key={r.id} className="gpw-room-chip gpw-room-chip--full">
                  <strong>Kamar {r.code}</strong>
                  <span>Rp {fmt(r.pricing?.monthlyRateRupiah ?? 0)}/bln · Terisi</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Tidak ada kamar sama sekali ── */}
        {!roomsLoading && displayCards.length === 0 && occupiedExact.length === 0 && (
          <div key="result-none" className="gpw-no-match">
            <p>Saat ini belum ada kamar yang sesuai dengan preferensimu. Kamu bisa coba ubah preferensi atau lihat semua kamar yang tersedia.</p>
          </div>
        )}

        {/* ── Navigasi — cukup Ubah Preferensi + link katalog ── */}
        <div key="result-nav" className="gpw-result-nav">
          <button type="button" className="gpw-btn-secondary" onClick={() => setStep(0)}>
            ← Ubah Preferensi
          </button>
          <button type="button" className="gpw-btn-ghost" onClick={handleApplyFilters}>
            Lihat semua kamar di katalog →
          </button>
        </div>
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────────────────
  const animClass = animForward ? 'gpw-fade-in-right' : 'gpw-fade-in-left';

  return (
    <div className="gpw-wizard">
      {/* ── Header: progress + skip ── */}
      <div className="gpw-header">
        <div className="gpw-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`gpw-progress-dot${i < step ? ' done' : i === step ? ' active' : ''}`} />
          ))}
        </div>
        <button type="button" className="gpw-skip" onClick={handleSkip}>
          Lewati wizard →
        </button>
      </div>

      {/* ── Question + options (key=step untuk animasi mount/unmount) ── */}
      <div key={`q-${step}`} className={animClass}>
        <div className="gpw-question">
          <p className="gpw-step-label">Langkah {step + 1} dari {totalSteps}</p>
          <h3 className="gpw-question-text">{currentStep.question}</h3>
          <p className="gpw-question-sub">{currentStep.sub}</p>
        </div>

        <div className="gpw-options">
          {currentStep.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="gpw-option"
              onClick={() => handleAnswer(opt.value)}
            >
              <span className="gpw-option-icon">{opt.icon}</span>
              <strong className="gpw-option-label">{opt.label}</strong>
              <span className="gpw-option-note">{opt.note}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer: back button (jika bukan step 0) ── */}
      {step > 0 && (
        <div className="gpw-footer">
          <button type="button" className="gpw-back" onClick={handleBack}>
            ← Kembali
          </button>
        </div>
      )}
    </div>
  );
}
