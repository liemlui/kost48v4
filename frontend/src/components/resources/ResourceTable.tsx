import { Alert, Button, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../common/CurrencyDisplay';
import PaginationControls from '../common/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';
import StatusBadge from '../common/StatusBadge';
import {
  canDeleteResourceItem,
  canEditResourceItem,
  ResourceConfig,
} from '../../config/resources';
import { formatDateSafe, formatPeriod, formatValue, getCountdownStatus } from '../../pages/resources/simpleCrudHelpers';
import { getReferenceLabel, ReferenceOption } from '../../pages/resources/resourceRelations';


function movementTypeLabel(value: unknown) {
  switch (String(value ?? '')) {
    case 'IN': return 'Barang Masuk';
    case 'OUT': return 'Barang Keluar';
    case 'ASSIGN_TO_ROOM': return 'Pasang ke Kamar';
    case 'RETURN_FROM_ROOM': return 'Kembali dari Kamar';
    default: return formatValue(value);
  }
}

interface ResourceTableProps {
  items: Array<Record<string, unknown>>;
  filteredItems: Array<Record<string, unknown>>;
  config: ResourceConfig;
  currentUserRole?: string;
  openEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
  isError: boolean;
  showActiveOnly?: boolean;
  setShowActiveOnly?: (value: boolean) => void;
  searchTerm?: string;
  setSearchTerm?: (value: string) => void;
  referenceMaps: Record<string, Map<string, ReferenceOption>>;
  meta?: { totalItems: number; totalPages: number; page: number; limit: number };
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onRowOpen?: (item: Record<string, unknown>) => void;
}

export default function ResourceTable({
  items,
  filteredItems,
  config,
  currentUserRole,
  openEdit,
  onDelete,
  isLoading,
  isError,
  showActiveOnly,
  setShowActiveOnly,
  searchTerm,
  setSearchTerm,
  referenceMaps,
  meta,
  currentPage,
  onPageChange,
  onRowOpen,
}: ResourceTableProps) {
  const navigate = useNavigate();

  const renderReferenceCell = (fieldName: string, value: unknown) => {
    const reference = getReferenceLabel(config.path, fieldName, value, referenceMaps);
    if (!reference) return formatValue(value);

    return (
      <div>
        <div className="fw-semibold">{reference.label}</div>
        <div className="small text-muted">{reference.caption ? `${reference.caption} · ` : ''}ID {reference.value}</div>
      </div>
    );
  };

  const renderCell = (item: Record<string, unknown>, column: { key: string; label: string }) => {
    const value = item[column.key];

    if (['tenantId', 'roomId', 'itemId', 'invoiceId', 'stayId'].includes(column.key)) {
      return renderReferenceCell(column.key, value);
    }

    if (column.key === 'isActive') {
      return <StatusBadge status={value === true ? 'ACTIVE' : 'INACTIVE'} />;
    }

    if (column.key === 'status') {
      return <StatusBadge status={String(value || 'SECONDARY')} />;
    }

    if (column.key === 'monthlyRateRupiah' || column.key === 'amountRupiah' || column.key === 'soldPriceRupiah') {
      return <CurrencyDisplay amount={typeof value === 'number' ? value : Number(value ?? 0)} />;
    }

    if (config.path === '/users' && column.key === 'role') {
      const roleVal = String(value ?? '');
      const ROLE_LABELS: Record<string, string> = {
        OWNER: 'Owner',
        ADMIN: 'Admin',
        STAFF: 'Staf',
        TENANT: 'Penghuni',
      };
      const ROLE_BADGE: Record<string, string> = {
        OWNER: 'danger',
        ADMIN: 'primary',
        STAFF: 'success',
        TENANT: 'secondary',
      };
      const label = ROLE_LABELS[roleVal] ?? roleVal;
      const bg = ROLE_BADGE[roleVal] ?? 'light';
      return <span className={`badge bg-${bg}`}>{label}</span>;
    }

    if (config.path === '/users' && column.key === 'tenantId') {
      if (item.role !== 'TENANT') return <span className="text-muted">Tidak terkait</span>;
      const tenantName = (item.tenant as { fullName?: string } | undefined)?.fullName;
      if (tenantName) {
        return (
          <div>
            <div className="fw-semibold">{tenantName}</div>
            <div className="small text-muted">ID {String(value ?? '-')}</div>
          </div>
        );
      }
      return renderReferenceCell(column.key, value);
    }

    if (config.path === '/tenants') {
      if (column.key === 'fullName') {
        const currentStay = item.currentStay as { room?: { code?: string }; id?: number } | undefined;
        const hasActiveStay = Boolean(item.activeStayId || currentStay);
        const roomCode = currentStay?.room?.code;
        return (
          <div>
            <div className="fw-semibold">{formatValue(value)}</div>
            {hasActiveStay ? (
              <div className="small">
                <span className="text-muted">{roomCode ? `Kamar: ${roomCode}` : 'Sedang menempati'}</span>
                <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.75em' }}>Aktif</span>
              </div>
            ) : (
              <div className="small text-muted">Tidak sedang menempati</div>
            )}
          </div>
        );
      }

      if (column.key === 'portalAccess') {
        const portalUserSummary = item.portalUserSummary as { portalIsActive?: boolean; portalEmail?: string } | null | undefined;
        if (!portalUserSummary) {
          return (
            <div>
              <StatusBadge status="INACTIVE" customLabel="Belum ada akun" />
              <div className="small text-muted mt-1">Tenant belum bisa login portal.</div>
            </div>
          );
        }

        return (
          <div>
            <StatusBadge
              status={portalUserSummary.portalIsActive ? 'ACTIVE' : 'INACTIVE'}
              customLabel={portalUserSummary.portalIsActive ? 'Portal aktif' : 'Portal nonaktif'}
            />
            <div className="small text-muted mt-1">{portalUserSummary.portalEmail ?? '-'}</div>
          </div>
        );
      }
    }

    if (config.path === '/rooms') {
      if (column.key === 'code') {
        const currentStay = item.currentStay as { tenant?: { fullName?: string } } | undefined;
        const occupant = currentStay?.tenant?.fullName;
        return (
          <div>
            <div className="fw-semibold">{formatValue(value)}{item.name ? ` - ${formatValue(item.name)}` : ''}</div>
            <div className="small">
              {occupant
                ? (String(item.status || '') === 'RESERVED' ? `Pemesan: ${occupant}` : `Penghuni: ${occupant}`)
                : 'Kosong'
              }
            </div>
          </div>
        );
      }

      if (column.key === 'category') {
        const labels: Record<string, string> = { ECONOMY: 'Ekonomi', STANDARD: 'Standar', DELUXE: 'Deluxe' };
        return labels[String(value ?? '')] ?? formatValue(value);
      }

      if (column.key === 'roomSize') {
        const labels: Record<string, string> = { STANDARD: 'Standar', LARGE: 'Besar' };
        return labels[String(value ?? '')] ?? formatValue(value);
      }

      if (column.key === 'status') {
        const status = String(value || 'AVAILABLE');
        const isActive = item.isActive === true;
        return (
          <div>
            <StatusBadge status={status} />
            <div className="small text-muted mt-1">Master data: {isActive ? 'Aktif' : 'Nonaktif'}</div>
          </div>
        );
      }
    }


    if (config.path === '/inventory-items') {
      if (column.key === 'positionSummary') {
        const text = formatValue(value);
        return <span className="small fw-semibold">{text === '-' ? 'Tidak ada stok aktif' : text}</span>;
      }
      if (column.key === 'qtyOnHand') {
        const qty = Number(value ?? 0);
        const min = Number(item.minQty ?? 0);
        return (
          <div>
            <div className="fw-semibold">{formatValue(value)}</div>
            {min > 0 && qty <= min ? <div className="small text-warning">Stok perlu dicek</div> : null}
          </div>
        );
      }
    }

    if (config.path === '/stays') {
      if (column.key === 'id') {
        const tenantName = (item.tenant as { fullName?: string } | undefined)?.fullName;
        const roomCode = (item.room as { code?: string } | undefined)?.code;
        const status = String(item.status || 'SECONDARY');
        const dueDate = item.checkOutDate as string | undefined || item.nextInvoiceDueDate as string | undefined || item.dueDate as string | undefined;
        const checkInDate = item.checkInDate as string | undefined;
        const countdown = status === 'ACTIVE' ? getCountdownStatus(dueDate, checkInDate) : null;

        return (
          <div>
            <div className="fw-semibold">Masa sewa #{formatValue(value)}</div>
            <div className="small">
              <StatusBadge status={status} className="me-2" />
              {countdown && countdown.status !== 'COUNTDOWN_NODATE' ? (
                <StatusBadge status={countdown.status} customLabel={countdown.label} className="me-2" />
              ) : null}
              {tenantName ? `Tenant: ${tenantName}` : ''}
              {roomCode ? ` · Kamar: ${roomCode}` : ''}
            </div>
          </div>
        );
      }

      if (['checkInDate', 'plannedCheckOutDate', 'actualCheckOutDate'].includes(column.key)) {
        return formatDateSafe(value as string | Date | null | undefined);
      }
    }

    if (config.path === '/invoices') {
      if (column.key === 'periodStart' || column.key === 'periodEnd') {
        return formatPeriod(item.periodStart as string | undefined, item.periodEnd as string | undefined);
      }
      if (column.key === 'dueDate') {
        return formatDateSafe(value as string | Date | null | undefined);
      }
      if (column.key === 'totalAmountRupiah' || column.key === 'paidAmountRupiah') {
        return <CurrencyDisplay amount={typeof value === 'number' ? value : Number(value ?? 0)} />;
      }
    }

    if (['readingAt', 'paymentDate', 'movementDate', 'expenseDate', 'saleDate', 'createdAt', 'updatedAt'].includes(column.key)) {
      return formatDateSafe(value as string | Date | null | undefined);
    }

    return formatValue(value);
  };

  const renderQuickActions = (item: Record<string, unknown>) => {
    if (config.path === '/tenants') {
      const hasActiveStay = Boolean(item.activeStayId || item.currentStay);
      if (!hasActiveStay) {
        return (
          <Button size="sm" variant="outline-success" onClick={() => navigate(`/stays/check-in?tenantId=${item.id}`)}>
            Check-in
          </Button>
        );
      }
      const currentStay = item.currentStay as { id?: number } | undefined;
      if (currentStay?.id) {
        return (
          <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/stays/${currentStay.id}`)}>
            Lihat masa sewa
          </Button>
        );
      }
    }


    if (config.path === '/inventory-items') {
      const qty = Number(item.qtyOnHand ?? 0);
      return (
        <>
          {qty > 0 ? (
            <Button size="sm" variant="outline-primary" onClick={() => navigate(`/inventory/mutasi?movementType=ASSIGN_TO_ROOM&itemId=${item.id}&qty=1`)}>
              Pasang ke Kamar
            </Button>
          ) : null}
          {qty > 0 ? (
            <Button size="sm" variant="outline-danger" onClick={() => navigate(`/inventory/mutasi?movementType=OUT&itemId=${item.id}&qty=1`)}>
              Catat Keluar
            </Button>
          ) : null}
        </>
      );
    }

    if (config.path === '/room-items') {
      return (
        <>
          {item.roomId ? (
            <Button size="sm" variant="outline-primary" onClick={() => navigate(`/rooms/${item.roomId}`)}>
              Detail kamar
            </Button>
          ) : null}
          {item.itemId && item.roomId ? (
            <Button size="sm" variant="outline-primary" onClick={() => navigate(`/inventory/mutasi?movementType=RETURN_FROM_ROOM&itemId=${item.itemId}&roomId=${item.roomId}&qty=${item.qty ?? 1}`)}>
              Kembalikan ke Gudang
            </Button>
          ) : null}
        </>
      );
    }

    return null;
  };

  const visibleColumns = currentUserRole === 'STAFF' && config.path === '/rooms'
    ? config.columns.filter((column) => !['monthlyRateRupiah', 'dailyRateRupiah', 'weeklyRateRupiah', 'defaultDepositRupiah'].includes(column.key))
    : config.columns;

  const serverPagination = Boolean(meta && onPageChange);
  const clientPagination = useClientPagination(
    filteredItems,
    [config.path, filteredItems.length, searchTerm, showActiveOnly],
    10,
  );
  const tableItems = serverPagination
    ? filteredItems.slice(0, meta?.limit ?? 10)
    : clientPagination.pagedItems;

  return (
    <>
      {isLoading ? <div className="py-5 text-center"><Spinner /></div> : null}
      {isError ? <Alert variant="danger">Gagal mengambil data.</Alert> : null}
      {!isLoading && !items.length ? <Alert variant="secondary">{config.emptyMessage ?? 'Belum ada data.'}</Alert> : null}
      {!isLoading && items.length > 0 && !filteredItems.length ? <Alert variant="warning">Tidak ada data untuk filter ini.</Alert> : null}
      {!!filteredItems.length ? (
        <Table hover responsive className="compact-data-table responsive-data-table">
          <thead>
            <tr>
              {visibleColumns.map((column) => <th key={column.key}>{column.label}</th>)}
              <th style={{ width: 160 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.map((item) => {
              const editGuard = canEditResourceItem(config, currentUserRole, item);
              const deleteGuard = canDeleteResourceItem(config, currentUserRole, item);
              const quickAction = renderQuickActions(item);

              return (
                <tr
                  key={String(item.id)}
                  className={onRowOpen ? 'clickable-row' : undefined}
                  onClick={() => onRowOpen?.(item)}
                  tabIndex={onRowOpen ? 0 : undefined}
                  onKeyDown={onRowOpen ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowOpen(item);
                    }
                  } : undefined}
                >
                  {visibleColumns.map((column) => (
                    <td key={column.key} data-label={column.label}>{renderCell(item, column)}</td>
                  ))}
                  <td data-label="Aksi" onClick={(event) => event.stopPropagation()}>
                    <div className="d-flex gap-2 flex-wrap align-items-center">
                      {quickAction}
                      {editGuard.allowed ? (
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                      ) : null}
                      {config.allowDelete && deleteGuard.allowed ? (
                        <Button size="sm" variant="outline-danger" onClick={() => onDelete(Number(item.id))}>
                          Hapus
                        </Button>
                      ) : null}
                      {onRowOpen ? <span className="row-arrow-cell">›</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : null}
      {!serverPagination && clientPagination.hasPagination ? (
        <div className="mt-3 table-pagination-shell">
          <PaginationControls
            currentPage={clientPagination.page}
            totalPages={clientPagination.totalPages}
            totalItems={clientPagination.totalItems}
            pageSize={clientPagination.pageSize}
            onPageChange={clientPagination.setPage}
            isLoading={isLoading}
          />
        </div>
      ) : null}

      {meta && onPageChange && (currentPage ?? 1) > 0 ? (
        <div className="mt-3 table-pagination-shell">
          <PaginationControls
            currentPage={currentPage ?? 1}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            pageSize={meta.limit}
            onPageChange={onPageChange}
            isLoading={isLoading}
          />
        </div>
      ) : null}
    </>
  );
}
