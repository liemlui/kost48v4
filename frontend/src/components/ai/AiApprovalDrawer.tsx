import type { ReactNode } from 'react';
import { Button, Offcanvas } from 'react-bootstrap';

type Props = {
  show: boolean;
  onHide: () => void;
  title?: string;
  onApprove?: () => void;
  onReject?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  children: ReactNode;
};

/** Drawer untuk review & approval hasil AI sebelum aksi final. */
export default function AiApprovalDrawer({
  show,
  onHide,
  title = 'Review Draft AI',
  onApprove,
  onReject,
  approveLabel = 'Setujui dan Simpan',
  rejectLabel = 'Abaikan',
  children,
}: Props) {
  return (
    <Offcanvas show={show} onHide={onHide} placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className="h6">{title}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="small">
        {children}
        <div className="d-flex gap-2 mt-3">
          {onReject ? (
            <Button variant="outline-secondary" size="sm" onClick={onReject}>
              {rejectLabel}
            </Button>
          ) : null}
          {onApprove ? (
            <Button variant="primary" size="sm" onClick={onApprove}>
              {approveLabel}
            </Button>
          ) : null}
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
