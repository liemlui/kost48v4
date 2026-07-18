import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaymentUrgency } from '../../hooks/usePaymentUrgency';
import type { PaymentUrgencyVariant } from '../../hooks/usePaymentUrgency';

const variantClassMap: Record<PaymentUrgencyVariant, string> = {
  danger: 'payment-urgency-chip-danger',
  warning: 'payment-urgency-chip-warning',
  info: 'payment-urgency-chip-info',
};

/**
 * Enhanced PaymentUrgencyChip with countdown progress bar.
 * When urgency type is INVOICE_DUE_SOON, shows a depleting progress bar
 * indicating time remaining until deadline (red → yellow → green zones).
 */
export default function PaymentUrgencyChip() {
  const navigate = useNavigate();
  const { urgency } = usePaymentUrgency();
  const [now, setNow] = useState(Date.now());

  // Update every 60 seconds to refresh countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const countdownPct = useMemo(() => {
    if (!urgency || urgency.type !== 'INVOICE_DUE_SOON') return null;
    // Estimate: 3 days = 72 hours window max
    // Try to extract hours remaining from label (e.g. "3 jam lagi", "H-3")
    // For now, use a simple heuristic based on label text
    const label = urgency.label || '';
    if (label.includes('hari ini') || label.includes('segera')) return 5;
    if (label.includes('H-1') || label.includes('24 jam')) return 33;
    if (label.includes('H-2')) return 50;
    if (label.includes('H-3')) return 67;
    if (label.includes('jam')) {
      const hrs = parseInt(label) || 1;
      return Math.max(1, Math.min(100, (hrs / 72) * 100));
    }
    return null;
  }, [urgency]);

  if (!urgency) return null;

  const variantClass = variantClassMap[urgency.variant] ?? '';
  const showCountdown = countdownPct != null;

  return (
    <button
      type="button"
      className={`payment-urgency-chip ${variantClass} ${showCountdown ? 'has-countdown' : ''}`}
      onClick={() => navigate(urgency.to)}
      aria-label={`Pengingat tenant: ${urgency.label}`}
      title={urgency.detail ? `${urgency.label} · ${urgency.detail}` : urgency.label}
    >
      <span className="payment-urgency-chip-icon" aria-hidden="true">
        {urgency.type === 'PAYMENT_UNDER_REVIEW' ? '🔎' : urgency.variant === 'danger' ? '⚠' : urgency.variant === 'warning' ? '⏳' : '📅'}
      </span>
      <span className="payment-urgency-chip-body">
        <span className="payment-urgency-chip-text">
          <span className="payment-urgency-chip-label">{urgency.label}</span>
          {urgency.detail ? <span className="payment-urgency-chip-detail">{urgency.detail}</span> : null}
        </span>
        {showCountdown ? (
          <span className="payment-urgency-countdown-track">
            <span
              className="payment-urgency-countdown-fill"
              style={{ width: `${countdownPct}%` }}
            />
          </span>
        ) : null}
      </span>
    </button>
  );
}
