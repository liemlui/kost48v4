import { Button } from 'react-bootstrap';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  void pageSize;

  if (totalPages <= 1) return null;

  return (
    <div className="d-flex gap-2 align-items-center flex-wrap">
      <Button
        size="sm"
        variant="outline-secondary"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
      >
        ‹ Sebelumnya
      </Button>

      <div className="small text-muted">
        Halaman {currentPage} dari {totalPages} · {totalItems} data
      </div>

      <Button
        size="sm"
        variant="outline-secondary"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
      >
        Selanjutnya ›
      </Button>
    </div>
  );
}
