import { Badge } from 'react-bootstrap';
import { getStatusLabel, getStatusVariant } from '../../utils/statusLabels';

export type StatusType =
  | 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED'
  | 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'UNAVAILABLE'
  | 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'SECONDARY'
  | 'OVERDUE' | 'PAID' | 'PARTIAL' | 'ISSUED' | 'DRAFT'
  | 'GOOD' | 'DAMAGED' | 'MISSING'
  | 'HELD' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FORFEITED'
  | 'COUNTDOWN_7PLUS' | 'COUNTDOWN_3_6' | 'COUNTDOWN_1_2' | 'COUNTDOWN_0' | 'COUNTDOWN_OVERDUE' | 'COUNTDOWN_NODATE'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showLabel?: boolean;
  customLabel?: string;
}

export { getStatusLabel };

export default function StatusBadge({ status, className = '', showLabel = true, customLabel }: StatusBadgeProps) {
  const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : status;
  const label = getStatusLabel(normalizedStatus, customLabel);
  const variant = getStatusVariant(normalizedStatus);

  return (
    <Badge bg={variant} className={`status-badge ${className}`.trim()}>
      {showLabel ? label : null}
    </Badge>
  );
}
