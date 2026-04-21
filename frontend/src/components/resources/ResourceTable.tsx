import { Alert, Button, Col, Form, FormCheck, InputGroup, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../common/CurrencyDisplay';
import PaginationControls from '../common/PaginationControls';
import StatusBadge from '../common/StatusBadge';
import {
  canDeleteResourceItem,
  canEditResourceItem,
  ResourceConfig,
} from '../../config/resources';
import { formatDateSafe, formatPeriod, formatValue, getCountdownStatus } from '../../pages/resources/simpleCrudHelpers';
import { getReferenceLabel, ReferenceOption } from '../../pages/resources/resourceRelations';

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
                <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.7em' }}>Aktif</span>
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
            <div className="small">{occupant ? `Penghuni: ${occupant}` : 'Kosong'}</div>
          </div>
        );
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
            <div className="fw-semibold">Stay #{formatValue(value)}</div>
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
            Lihat Stay
          </Button>
        );
      }
    }

    if (config.path === '/rooms') {
      return (
        <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/rooms/${item.id}`)}>
          Detail
        </Button>
      );
    }

    return null;
  };

  const hasActiveField = config.fields.some((field) => field.name === 'isActive');

  return (
    <>
      {searchTerm !== undefined && setSearchTerm ? (
        <div className="mb-4">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            {hasActiveField && showActiveOnly !== undefined && setShowActiveOnly ? (
              <FormCheck
                type="switch"
                id={`${config.path.replace(/[^a-z0-9]/gi, '-')}-active-only-switch`}
                label="Aktif saja"
                checked={showActiveOnly}
                onChange={(event) => setShowActiveOnly(event.target.checked)}
              />
            ) : null}
            <InputGroup>
              <Form.Control
                type="text"
                placeholder={`Cari ${config.title}...`}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              {searchTerm ? (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                  Reset
                </Button>
              ) : null}
            </InputGroup>
          </div>
          <div className="mt-2 text-muted small">Menampilkan {filteredItems.length} dari {meta?.totalItems ?? items.length} data</div>
        </div>
      ) : null}

      {isLoading ? <div className="py-5 text-center"><Spinner /></div> : null}
      {isError ? <Alert variant="danger">Gagal mengambil data.</Alert> : null}
      {!isLoading && !items.length ? <Alert variant="secondary">Belum ada data.</Alert> : null}
      {!isLoading && items.length > 0 && !filteredItems.length ? <Alert variant="warning">Tidak ada data yang sesuai dengan filter pencarian.</Alert> : null}
      {!!filteredItems.length ? (
        <Table hover responsive>
          <thead>
            <tr>
              {config.columns.map((column) => <th key={column.key}>{column.label}</th>)}
              <th style={{ width: 260 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const editGuard = canEditResourceItem(config, currentUserRole, item);
              const deleteGuard = canDeleteResourceItem(config, currentUserRole, item);
              const quickAction = renderQuickActions(item);

              return (
                <tr key={String(item.id)}>
                  {config.columns.map((column) => (
                    <td key={column.key}>{renderCell(item, column)}</td>
                  ))}
                  <td>
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
                      {!editGuard.allowed || (!deleteGuard.allowed && config.allowDelete) ? (
                        <span className="small text-muted">{editGuard.reason || deleteGuard.reason}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : null}

      {meta && onPageChange && (currentPage ?? 1) > 0 ? (
        <div className="mt-3">
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
