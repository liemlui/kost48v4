import { useNavigate } from 'react-router-dom';
import { usePaymentUrgency } from '../../hooks/usePaymentUrgency';
import type { PaymentUrgencyVariant } from '../../hooks/usePaymentUrgency';

const variantClassMap: Record<PaymentUrgencyVariant, string> = {
  danger: 'payment-urgency-chip-danger',
  warning: 'payment-urgency-chip-warning',
  info: 'payment-urgency-chip-info',
};

export default function PaymentUrgencyChip() {
  const navigate = useNavigate();
  const { urgency } = usePaymentUrgency();

  if (!urgency) return null;

  const variantClass = variantClassMap[urgency.variant] ?? '';

  return (
    <button
      type="button"
      className={`payment-urgency-chip ${variantClass}`}
      onClick={() => navigate(urgency.to)}
      aria-label={`Pengingat pembayaran: ${urgency.label}`}
      title={urgency.detail ? `${urgency.label} · ${urgency.detail}` : urgency.label}
    >
      <span className="payment-urgency-chip-icon" aria-hidden="true">
        {urgency.variant === 'danger' ? '⚠' : urgency.variant === 'warning' ? '⏳' : '📅'}
      </span>
      <span className="payment-urgency-chip-label">{urgency.label}</span>
    </button>
  );
}