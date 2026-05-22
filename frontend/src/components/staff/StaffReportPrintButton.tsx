import { Button } from 'react-bootstrap';

type Props = {
  disabled?: boolean;
};

export default function StaffReportPrintButton({ disabled = false }: Props) {
  return (
    <Button type="button" variant="primary" className="staff-report-print-button no-print" disabled={disabled} onClick={() => window.print()}>
      Simpan / Cetak PDF
    </Button>
  );
}
