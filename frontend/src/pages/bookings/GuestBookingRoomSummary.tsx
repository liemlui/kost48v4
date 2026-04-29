import { Alert, Card } from 'react-bootstrap';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { PublicRoom } from '../../types';
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm } from '../../utils/pricing';
import type { GuestBookingFormState } from './guestBookingUtils';

interface GuestBookingRoomSummaryProps {
  room: PublicRoom;
  form: GuestBookingFormState;
  selectedRate: string | null;
  initialTotal: number;
}

export default function GuestBookingRoomSummary({ room, form, selectedRate, initialTotal }: GuestBookingRoomSummaryProps) {
  const availableTerms = room.availablePricingTerms?.length ? room.availablePricingTerms : ['MONTHLY'];

  return (
    <Card className="content-card border-0 h-100">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <div className="fw-semibold fs-4">{room.code}</div>
            <div className="text-muted">{room.name || 'Nama kamar belum tersedia'}</div>
          </div>
          <StatusBadge status="RESERVED" customLabel="Siap Dibooking" />
        </div>

        <div className="border rounded-4 p-3 mb-3 bg-light-subtle">
          <div className="small text-muted mb-1">Tarif yang dipilih</div>
          <div className="fs-4 fw-bold"><CurrencyDisplay amount={selectedRate} /></div>
          <div className="small text-muted mt-1">Deposit booking <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></div>
          <div className="small text-muted mt-1">Total awal booking <strong><CurrencyDisplay amount={initialTotal} showZero={false} /></strong></div>
        </div>

        <div className="d-grid gap-3">
          <div>
            <div className="card-title-soft mb-1">Lantai</div>
            <div className="fw-semibold">{room.floor || '-'}</div>
          </div>
          <div>
            <div className="card-title-soft mb-1">Pilihan term</div>
            <div className="d-flex flex-wrap gap-2">
              {availableTerms.map((term) => <StatusBadge key={term} status={term} />)}
            </div>
          </div>
          <div>
            <div className="card-title-soft mb-1">Utilitas</div>
            {isUtilitiesIncludedForPricingTerm(form.pricingTerm) ? (
              <div className="app-caption text-success fw-medium">Listrik & air sudah termasuk dalam tarif {getStatusLabel(form.pricingTerm).toLowerCase()} (flat)</div>
            ) : (
              <div className="app-caption">Listrik <CurrencyDisplay amount={room.electricityTariffPerKwhRupiah} /> / kWh &middot; Air <CurrencyDisplay amount={room.waterTariffPerM3Rupiah} /> / m&sup3; (meteran terpisah)</div>
            )}
          </div>
          {room.notes ? (
            <Alert variant="light" className="mb-0">
              <strong>Catatan kamar:</strong> {room.notes}
            </Alert>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
}