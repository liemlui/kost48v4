import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastProvider';
import { Alert, Button, Card, Modal } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createResource, deleteResource, listResource, updateResource } from '../../api/resources';
import PageHeader from '../../components/common/PageHeader';
import { EntityBadgeFilterBar, StatusStrip } from '../../components/workspace';
import ResourceFormModal from '../../components/resources/ResourceFormModal';
import ResourceTable from '../../components/resources/ResourceTable';
import ResourceDetailModal from '../../components/resources/ResourceDetailModal';
import ExpenseReceiptUpload from '../../components/expenses/ExpenseReceiptUpload';
import {
  canCreateResourceItem,
  canDeleteResourceItem,
  canEditResourceItem,
  ResourceConfig,
} from '../../config/resources';
import { useAuth } from '../../context/AuthContext';
import {
  buildInitialState,
  formatDateForInput,
  normalizeFormDataForSubmit,
  asString,
  getNested,
  isLowStock,
  movementTypeLabel,
  movementEffectLabel,
  todayInputDate,
  automatedMovementNote,
  getResourceFilterDefinitions,
  applyResourceFilter,
  mapReferenceData,
} from './simpleCrudHelpers';
import {
  getFlowNote,
  getRequiredReferencePaths,
  type ReferenceOption,
} from './resourceRelations';

type PortalTenantUser = {
  id: number;
  fullName: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT';
  tenantId: number | null;
  isActive: boolean;
  lastLoginAt?: string | null;
};

type ResourceFilterId = string;

export default function SimpleCrudPage({ config, hideAreaMenu = false }: { config: ResourceConfig; hideAreaMenu?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>(buildInitialState(config));
  const [error, setError] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilterId>('ALL');
  const [stockMovementConfirm, setStockMovementConfirm] = useState<{ payload: Record<string, unknown>; isEdit: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const movementContext = searchParams.toString();


  useEffect(() => {
    setPage(1);
  }, [searchTerm, showActiveOnly, resourceFilter, config.path]);

  const requiredReferencePaths = useMemo(() => getRequiredReferencePaths(config.path), [config.path]);

  const supportsIsActiveFilter = useMemo(
    () => config.supportsIsActiveFilter ?? config.fields.some((field) => field.name === 'isActive'),
    [config.fields, config.supportsIsActiveFilter],
  );

  const query = useQuery({
    queryKey: [config.path, 'list', page, searchTerm, showActiveOnly],
    queryFn: () => listResource<Record<string, unknown>>(config.path, {
      page,
      limit: PAGE_SIZE,
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(supportsIsActiveFilter && showActiveOnly && !['/tenants', '/rooms', '/announcements', '/expenses'].includes(config.path) ? { isActive: 'true' } : {}),
    }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const tenantsRefQuery = useQuery({
    queryKey: ['resource-ref', '/tenants'],
    queryFn: () => listResource<Record<string, unknown>>('/tenants', { limit: 500, isActive: 'true' }),
    enabled: requiredReferencePaths.includes('/tenants'),
  });

  const roomsRefQuery = useQuery({
    queryKey: ['resource-ref', '/rooms'],
    queryFn: () => listResource<Record<string, unknown>>('/rooms', { limit: 500, isActive: 'true' }),
    enabled: requiredReferencePaths.includes('/rooms'),
  });

  const inventoryItemsRefQuery = useQuery({
    queryKey: ['resource-ref', '/inventory-items'],
    queryFn: () => listResource<Record<string, unknown>>('/inventory-items', { limit: 500, isActive: 'true' }),
    enabled: requiredReferencePaths.includes('/inventory-items'),
  });

  const invoicesRefQuery = useQuery({
    queryKey: ['resource-ref', '/invoices'],
    queryFn: () => listResource<Record<string, unknown>>('/invoices', { limit: 500 }),
    enabled: requiredReferencePaths.includes('/invoices'),
  });

  const staysRefQuery = useQuery({
    queryKey: ['resource-ref', '/stays'],
    queryFn: () => listResource<Record<string, unknown>>('/stays', { limit: 500 }),
    enabled: requiredReferencePaths.includes('/stays'),
  });

  const tenantUsersQuery = useQuery({
    queryKey: ['/users', 'tenant-links'],
    queryFn: () => listResource<PortalTenantUser>('/users', { limit: 500 }),
    enabled: config.path === '/tenants',
  });

  const referenceOptions = useMemo(
    () => ({
      '/tenants': mapReferenceData(tenantsRefQuery.data?.items ?? [], '/tenants').options,
      '/rooms': mapReferenceData(roomsRefQuery.data?.items ?? [], '/rooms').options,
      '/inventory-items': mapReferenceData(inventoryItemsRefQuery.data?.items ?? [], '/inventory-items').options,
      '/invoices': mapReferenceData(invoicesRefQuery.data?.items ?? [], '/invoices').options,
      '/stays': mapReferenceData(staysRefQuery.data?.items ?? [], '/stays').options,
    }) as Record<string, ReferenceOption[]>,
    [
      invoicesRefQuery.data?.items,
      inventoryItemsRefQuery.data?.items,
      roomsRefQuery.data?.items,
      staysRefQuery.data?.items,
      tenantsRefQuery.data?.items,
    ],
  );

  const referenceMaps = useMemo(
    () => ({
      '/tenants': mapReferenceData(tenantsRefQuery.data?.items ?? [], '/tenants').map,
      '/rooms': mapReferenceData(roomsRefQuery.data?.items ?? [], '/rooms').map,
      '/inventory-items': mapReferenceData(inventoryItemsRefQuery.data?.items ?? [], '/inventory-items').map,
      '/invoices': mapReferenceData(invoicesRefQuery.data?.items ?? [], '/invoices').map,
      '/stays': mapReferenceData(staysRefQuery.data?.items ?? [], '/stays').map,
    }) as Record<string, Map<string, ReferenceOption>>,
    [
      invoicesRefQuery.data?.items,
      inventoryItemsRefQuery.data?.items,
      roomsRefQuery.data?.items,
      staysRefQuery.data?.items,
      tenantsRefQuery.data?.items,
    ],
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editingItem) {
        return updateResource(`${config.path}/${String(editingItem.id)}`, payload);
      }
      return createResource(config.path, payload);
    },
    onSuccess: async () => {
      await refreshResourceCaches(config.path);
      setShowModal(false);
      setEditingItem(null);
      setStockMovementConfirm(null);
      setFormState(buildInitialState(config));
      setError('');
      toast.toast(editingItem ? 'Data berhasil diubah.' : 'Data berhasil ditambah.');
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Gagal menyimpan data')
        : 'Gagal menyimpan data';
      setError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteResource(`${config.path}/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.path, 'list'] });
      toast.toast('Data berhasil dihapus.', 'warning');
    },
  });

  const refreshResourceCaches = async (savedPath: string) => {
    const impactedPathByResource: Record<string, string[]> = {
      '/inventory-items': ['/inventory-items', '/inventory-movements'],
      '/rooms': ['/rooms', '/room-items'],
      '/tenants': ['/tenants'],
      '/invoices': ['/invoices', '/stays'],
      '/stays': ['/stays', '/rooms', '/invoices'],
      '/room-items': ['/room-items', '/inventory-items', '/rooms'],
      '/inventory-movements': ['/inventory-movements', '/inventory-items', '/room-items', '/rooms'],
    };
    const impactedPaths = Array.from(new Set([savedPath, ...(impactedPathByResource[savedPath] ?? [])]));

    await Promise.all([
      ...impactedPaths.map((path) => queryClient.invalidateQueries({ queryKey: [path, 'list'] })),
      ...impactedPaths.map((path) => queryClient.invalidateQueries({ queryKey: ['resource-ref', path] })),
    ]);
  };

  const refetchRequiredReferences = () => {
    requiredReferencePaths.forEach((path) => {
      void queryClient.invalidateQueries({ queryKey: ['resource-ref', path] });
      void queryClient.refetchQueries({ queryKey: ['resource-ref', path] });
    });
  };

  const applyExpenseReceiptDraft = (patch: Record<string, unknown>) => {
    setEditingItem(null);
    setFormState({ ...buildInitialState(config), ...patch });
    setError('');
    refetchRequiredReferences();
    setShowModal(true);
  };

  useEffect(() => {
    if (config.path !== '/inventory-movements' || !movementContext) return;
    const params = new URLSearchParams(movementContext);
    const itemId = params.get('itemId');
    const roomId = params.get('roomId');
    const qty = params.get('qty');
    const movementType = params.get('movementType') || params.get('type') || (params.get('action') === 'return' ? 'RETURN_FROM_ROOM' : params.get('action') === 'out' ? 'OUT' : params.get('action') === 'in' ? 'IN' : 'ASSIGN_TO_ROOM');
    const nextState = {
      ...buildInitialState(config),
      itemId: itemId ? Number(itemId) : '',
      roomId: roomId ? Number(roomId) : '',
      qty: qty || '1',
      movementType,
      movementDate: todayInputDate(),
      note: automatedMovementNote(movementType),
    };
    setEditingItem(null);
    setFormState(nextState);
    setError('');
    refetchRequiredReferences();
    setShowModal(true);
    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.path, movementContext]);

  const tenantPortalUsers = useMemo(
    () => (tenantUsersQuery.data?.items ?? []).filter((item) => item.role === 'TENANT' && item.tenantId),
    [tenantUsersQuery.data?.items],
  );

  const items = useMemo(() => {
    const rawItems = query.data?.items ?? [];
    if (config.path !== '/tenants') return rawItems;

    return rawItems.map((tenant) => {
      const linkedUser = tenantPortalUsers.find((item) => item.tenantId === Number(tenant.id)) ?? null;
      const existingSummary = tenant.portalUserSummary as Record<string, unknown> | undefined;
      return {
        ...tenant,
        linkedUser,
        portalUserSummary: existingSummary
          ? existingSummary
          : linkedUser
            ? {
                portalUserId: linkedUser.id,
                portalEmail: linkedUser.email,
                portalIsActive: linkedUser.isActive,
                lastLoginAt: linkedUser.lastLoginAt ?? null,
              }
            : null,
      };
    });
  }, [config.path, query.data?.items, tenantPortalUsers]);

  const resourceFilters = useMemo(() => getResourceFilterDefinitions(config.path, items), [config.path, items]);
  const hasResourceFilters = resourceFilters.length > 0;

  const summaryItems = useMemo(() => {
    const total = query.data?.meta?.totalItems ?? items.length;
    if (config.path === '/inventory-items') {
      const lowOrEmpty = items.filter((item) => isLowStock(item) || Number(item.qtyOnHand ?? 0) <= 0).length;
      return [
        { id: 'inventory-total', label: 'Stok gudang', value: total, helper: 'Barang terdaftar', tone: 'info' as const },
        { id: 'inventory-action', label: 'Perlu aksi', value: lowOrEmpty, helper: 'Habis/menipis', tone: lowOrEmpty ? 'warning' as const : 'success' as const },
      ];
    }
    if (config.path === '/inventory-movements') {
      return [
        { id: 'movement-total', label: 'Mutasi stok', value: total, helper: 'Riwayat resmi', tone: 'info' as const },
        { id: 'movement-auto', label: 'Efek stok', value: 'Otomatis', helper: 'Gudang & kamar sinkron', tone: 'success' as const },
      ];
    }
    if (config.path === '/room-items') {
      return [
        { id: 'room-item-total', label: 'Barang kamar', value: total, helper: 'Dari mutasi stok', tone: 'info' as const },
        { id: 'room-item-mode', label: 'Mode', value: 'Lihat', helper: 'Ubah via mutasi', tone: 'warning' as const },
      ];
    }
    if (config.path === '/rooms') {
      const available = items.filter((item) => asString(item.status) === 'AVAILABLE').length;
      return [
        { id: 'room-total', label: 'Kamar', value: total, helper: 'Total aktif', tone: 'info' as const },
        { id: 'room-available', label: 'Tersedia', value: available, helper: 'Siap ditawarkan', tone: available ? 'success' as const : 'warning' as const },
      ];
    }
    if (config.path === '/tenants') {
      const activePortal = tenantPortalUsers.filter((item) => item.isActive).length;
      return [
        { id: 'tenant-total', label: 'Tenant', value: total, helper: 'Data penghuni', tone: 'info' as const },
        { id: 'tenant-portal', label: 'Portal aktif', value: activePortal, helper: 'Akun terhubung', tone: 'success' as const },
      ];
    }
    return [
      { id: 'resource-total', label: config.title, value: total, helper: 'Total data', tone: 'info' as const },
      { id: 'resource-mode', label: 'Mode', value: 'Ringkas', helper: 'Menu dan filter dipisah', tone: 'success' as const },
    ];
  }, [config.path, config.title, items, query.data?.meta?.totalItems, tenantPortalUsers]);

  const filteredItems = useMemo(() => {
    if (!hasResourceFilters) return items;
    return items.filter((item) => applyResourceFilter(config.path, item, resourceFilter));
  }, [config.path, hasResourceFilters, items, resourceFilter]);

  const openCreate = () => {
    if (config.path === '/room-items') {
      navigate('/inventory/mutasi?movementType=ASSIGN_TO_ROOM&qty=1');
      return;
    }
    const createGuard = canCreateResourceItem(config, user?.role);
    if (!createGuard.allowed) {
      setError(createGuard.reason ?? 'Anda tidak memiliki izin untuk membuat data baru.');
      return;
    }

    setEditingItem(null);
    setFormState(buildInitialState(config));
    setError('');
    refetchRequiredReferences();
    setShowModal(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    const editGuard = canEditResourceItem(config, user?.role, item);
    if (!editGuard.allowed) {
      setError(editGuard.reason ?? 'Anda tidak memiliki izin untuk mengedit item ini.');
      return;
    }

    const formattedItem: Record<string, unknown> = { ...item };
    config.fields.forEach((field) => {
      if (field.type === 'date' && formattedItem[field.name]) {
        formattedItem[field.name] = formatDateForInput(formattedItem[field.name] as string | Date | null | undefined);
      }
      if (field.name === 'images' && Array.isArray(formattedItem[field.name])) {
        formattedItem[field.name] = (formattedItem[field.name] as string[]).join('\n');
      }
    });

    setEditingItem(item);
    setFormState({ ...buildInitialState(config), ...formattedItem });
    setError('');
    refetchRequiredReferences();
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    const target = items.find((item) => Number(item.id) === id);
    if (!target) return;
    const deleteGuard = canDeleteResourceItem(config, user?.role, target);
    if (!deleteGuard.allowed) {
      setError(deleteGuard.reason ?? 'Anda tidak memiliki izin untuk menghapus item ini.');
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleSubmit = () => {
    if (config.path === '/tenants' && editingItem) {
      const hasActiveStay = Boolean(editingItem.activeStayId || editingItem.currentStay);
      const isTryingToDeactivate = formState.isActive === false;
      if (hasActiveStay && isTryingToDeactivate) {
        setError('Tenant ini masih menempati kamar. Selesaikan atau batalkan masa sewa terlebih dahulu dari menu Masa Sewa sebelum menonaktifkan tenant.');
        return;
      }
    }

    if (config.path === '/rooms' && editingItem) {
      const hasActiveStay = Boolean(editingItem.activeStayId || editingItem.currentStay);
      const isTryingToDeactivate = formState.isActive === false;
      if (hasActiveStay && isTryingToDeactivate) {
        setError('Kamar ini sedang ditempati tenant aktif. Selesaikan atau batalkan stay terlebih dahulu sebelum menonaktifkan kamar.');
        return;
      }
    }

    const requiredFields = config.fields.filter((field) => field.required);
    for (const field of requiredFields) {
      const value = formState[field.name];
      if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
        setError(`Field "${field.label}" wajib diisi`);
        return;
      }
    }

    const payload = normalizeFormDataForSubmit(formState, config.fields);
    if (config.path === '/expenses' && !editingItem && formState.aiDraftMeta) {
      payload.aiDraftMeta = formState.aiDraftMeta;
    }

    if (editingItem && !payload.password) {
      delete payload.password;
    }

    config.fields.forEach((field) => {
      if (field.type === 'number' && payload[field.name] !== undefined && payload[field.name] !== '') {
        payload[field.name] = Number(payload[field.name]);
      }
      if (field.type === 'checkbox' && payload[field.name] !== undefined) {
        payload[field.name] = Boolean(payload[field.name]);
      }
    });

    if (config.path === '/users' && user?.role === 'ADMIN' && payload.role === 'OWNER') {
      setError('Admin tidak dapat mengubah role menjadi OWNER.');
      return;
    }

    if (payload.role !== 'TENANT') {
      delete payload.tenantId;
    }

    if (config.path === '/inventory-items' && editingItem) {
      const currentQty = String(editingItem.qtyOnHand ?? '').trim();
      const submittedQty = String(payload.qtyOnHand ?? '').trim();
      if (submittedQty && submittedQty !== currentQty) {
        setError('Stok resmi tidak bisa diedit dari master barang. Gunakan menu Mutasi Stok.');
        return;
      }
      delete payload.qtyOnHand;
    }

    if (config.path === '/room-items' && editingItem) {
      const currentQty = String(editingItem.qty ?? '').trim();
      const submittedQty = String(payload.qty ?? '').trim();
      if (submittedQty && submittedQty !== currentQty) {
        setError('Jumlah barang kamar harus diubah lewat Mutasi Stok agar stok gudang ikut sinkron.');
        return;
      }
      delete payload.qty;
      delete payload.roomId;
      delete payload.itemId;
    }

    if (config.path === '/inventory-movements') {
      const movementType = String(payload.movementType ?? '');
      const note = String(payload.note ?? '').trim();
      const qty = Number(payload.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError('Jumlah mutasi stok harus lebih dari 0.');
        return;
      }
      if (note.length < 8) {
        setError('Catatan mutasi stok minimal 8 karakter.');
        return;
      }
      if (['ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM'].includes(movementType) && !payload.roomId) {
        setError('Pilih kamar untuk mutasi Pasang ke Kamar atau Kembali dari Kamar.');
        return;
      }
      if (['IN', 'OUT'].includes(movementType)) {
        delete payload.roomId;
      }
      if (!payload.movementDate) {
        payload.movementDate = todayInputDate();
      }
      setStockMovementConfirm({ payload, isEdit: Boolean(editingItem) });
      return;
    }

    saveMutation.mutate(payload);
  };

  const confirmStockMovement = () => {
    if (!stockMovementConfirm) return;
    saveMutation.mutate(stockMovementConfirm.payload);
  };

  useEffect(() => {
    if (resourceFilters.length && !resourceFilters.some((filter) => filter.id === resourceFilter)) {
      setResourceFilter('ALL');
    }
  }, [resourceFilter, resourceFilters]);

  const createGuard = useMemo(() => canCreateResourceItem(config, user?.role), [config, user?.role]);
  const isStaffView = user?.role === 'STAFF';
  const isTenantResource = config.path === '/tenants';

  const flowNote = getFlowNote(config.path);
  const areaMenuItems = useMemo(() => {
    if (['/tenants'].includes(config.path)) return [
      { id: 'stays', icon: '🏠', label: 'Semua Proses', helper: 'Booking, stay aktif, dan checkout.', to: '/stays', active: false },
      { id: 'tenant', icon: '👤', label: 'Tenant', helper: 'Daftar tenant dan portal access.', to: '/tenants', active: true },
      { id: 'renew', icon: '🔁', label: 'Perpanjangan', helper: 'Pengajuan renew tenant.', to: '/renew-requests', active: false },
      { id: 'checkin', icon: '➕', label: 'Check-in', helper: 'Masukkan tenant ke kamar.', to: '/stays/check-in', active: false },
    ];
    if (['/wifi-sales', '/expenses', '/invoice-payments'].includes(config.path)) return [
      { id: 'invoices', icon: '🧾', label: 'Tagihan', helper: 'Tagihan dan pembayaran penghuni.', to: '/invoices', active: false },
      { id: 'review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar pending review.', to: '/payment-submissions/review', active: false },
      { id: 'wifi', icon: '📶', label: 'Voucher WiFi', helper: 'Rekap penjualan voucher WiFi.', to: '/wifi-sales', active: config.path === '/wifi-sales' },
      { id: 'ancillary', icon: '🛒', label: 'Pendapatan Tambahan', helper: 'Katalog layanan add-on future: laundry, galon, cleaning, parkir.', to: '/ancillary-revenue', active: false },
      { id: 'expenses', icon: '💸', label: 'Pengeluaran', helper: 'Biaya operasional dan COGS layanan.', to: '/expenses', active: config.path === '/expenses' },
      { id: 'history', icon: '📚', label: 'Riwayat Bayar', helper: 'Pembayaran invoice yang tercatat.', to: '/invoice-payments', active: config.path === '/invoice-payments' },
    ];
    if (['/rooms', '/room-items', '/inventory-items', '/inventory-movements'].includes(config.path)) return [
      { id: 'rooms', icon: '🏘️', label: 'Kamar', helper: 'Status kamar dan okupansi.', to: '/rooms', active: config.path === '/rooms' },
      { id: 'room-items', icon: '🪑', label: 'Barang Kamar', helper: 'Inventaris per kamar.', to: '/inventory/barang-kamar', active: config.path === '/room-items' },
      { id: 'stock', icon: '📦', label: 'Stok Gudang', helper: 'Barang gudang dan stok minimum.', to: '/inventory/gudang', active: config.path === '/inventory-items' },
      { id: 'movement', icon: '🔄', label: 'Mutasi Stok', helper: 'Riwayat stok masuk/keluar/pasang.', to: '/inventory/mutasi', active: config.path === '/inventory-movements' },
    ];
    return [];
  }, [config.path]);
  const meta = query.data?.meta;
  const isReferenceLoading = [tenantsRefQuery, roomsRefQuery, inventoryItemsRefQuery, invoicesRefQuery, staysRefQuery]
    .filter((item) => item.isFetching && item.fetchStatus !== 'idle')
    .length > 0;
  const pageDescription = config.path === '/room-items'
    ? 'Inventaris kamar otomatis dari Mutasi Stok. Klik baris untuk buka detail kamar.'
    : config.path === '/inventory-items'
      ? 'Stok dan posisi dihitung otomatis. Tambah barang akan membuat mutasi masuk.'
      : config.path === '/inventory-movements'
        ? 'Catat stok masuk, keluar, pasang ke kamar, atau kembali dari kamar. Efek stok dihitung otomatis.'
        : isStaffView
          ? `Cek data ${config.title.toLowerCase()} yang perlu tindakan.`
          : `Data ${config.title.toLowerCase()} dengan menu dan filter terpisah.`;

  return (
    <div className={isStaffView ? 'staff-simple-mode' : undefined}>
      <PageHeader
        eyebrow={isStaffView ? 'Daftar Cek' : 'Master data'}
        title={config.title}
        description={pageDescription}
        actionLabel={createGuard.allowed ? (config.createLabel || 'Tambah Data') : undefined}
        onAction={createGuard.allowed ? openCreate : undefined}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {config.path === '/expenses' && (user?.role === 'OWNER' || user?.role === 'ADMIN') ? (
        <ExpenseReceiptUpload
          onApplyDraft={applyExpenseReceiptDraft}
          disabled={saveMutation.isPending}
        />
      ) : null}
      {config.path === '/room-items' && user?.role !== 'STAFF' ? (
        <Alert variant="info" className="mb-3">
          Barang kamar dibuat otomatis dari <strong>Mutasi Stok</strong>. Gunakan halaman ini untuk cek posisi dan kondisi.
        </Alert>
      ) : null}

      {areaMenuItems.length && !hideAreaMenu ? (
        <div className="admin-area-internal-menu finance-inline-menu" aria-label={`Sub-menu ${config.title}`}>
          <div className="admin-area-internal-menu-head">
            <span>{config.path === '/tenants' ? 'Menu Masa Sewa & Penghuni' : config.path === '/wifi-sales' || config.path === '/expenses' || config.path === '/invoice-payments' ? 'Menu Keuangan' : 'Menu Kamar & Stok'}</span>
            <small>Menu area</small>
          </div>
          <div className="admin-area-internal-menu-scroll">
            {areaMenuItems.map((item) => (
              <button type="button" key={item.id} className={`admin-area-internal-chip info ${item.active ? 'is-active' : ''}`.trim()} onClick={() => navigate(item.to)} title={item.helper}>
                <span className="admin-area-internal-chip-main">
                  <span className="admin-area-internal-icon" aria-hidden="true">{item.icon}</span>
                  <span className="admin-area-internal-label">{item.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isStaffView ? (
        <>
          <StatusStrip items={summaryItems} />
          {hasResourceFilters ? (
            <EntityBadgeFilterBar
              ariaLabel={`Filter ${config.title}`}
              activeId={resourceFilter}
              onChange={setResourceFilter}
              filters={resourceFilters}
            />
          ) : supportsIsActiveFilter ? (
            <EntityBadgeFilterBar
              ariaLabel={`Filter ${config.title}`}
              activeId={showActiveOnly ? 'ACTIVE' : 'ALL'}
              onChange={(id) => setShowActiveOnly(id === 'ACTIVE')}
              filters={[
                { id: 'ACTIVE', label: 'Aktif', count: meta?.totalItems ?? filteredItems.length, tone: 'success' },
                { id: 'ALL', label: 'Semua', count: meta?.totalItems ?? filteredItems.length, tone: 'info' },
              ]}
            />
          ) : null}
        </>
      ) : null}

      <Card className="content-card border-0 resource-command-card">
        <Card.Body>
          <ResourceTable
            items={items}
            filteredItems={filteredItems}
            config={config}
            currentUserRole={user?.role}
            openEdit={openEdit}
            onDelete={handleDelete}
            isLoading={query.isLoading || tenantUsersQuery.isLoading || isReferenceLoading}
            isError={query.isError || tenantUsersQuery.isError}
            showActiveOnly={showActiveOnly}
            setShowActiveOnly={setShowActiveOnly}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            referenceMaps={referenceMaps}
            meta={meta}
            currentPage={page}
            onPageChange={setPage}
            onRowOpen={(item) => {
              if (config.path === '/rooms') {
                navigate(`/rooms/${item.id}`);
                return;
              }
              if (config.path === '/room-items' && item.roomId) {
                navigate(`/rooms/${item.roomId}`);
                return;
              }
              setDetailItem(item);
            }}
          />
        </Card.Body>
      </Card>

      <ResourceFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingItem={editingItem}
        formState={formState}
        setFormState={setFormState}
        error={error}
        config={config}
        handleSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
        referenceOptions={referenceOptions}
        referenceMaps={referenceMaps}
        onPortalAccessToggle={() => {
          if (config.path === '/tenants') {
            void queryClient.invalidateQueries({ queryKey: [config.path, 'list'] });
          }
        }}
      />

      <Modal show={Boolean(stockMovementConfirm)} onHide={() => setStockMovementConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Mutasi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-3">
            <strong>Ini mengubah stok resmi.</strong> Pastikan bukti atau laporan staff sudah dicek.
          </Alert>
          {stockMovementConfirm ? (
            <div className="small">
              <div className="d-flex justify-content-between border-bottom py-2"><span>Jenis</span><strong>{movementTypeLabel(stockMovementConfirm.payload.movementType)}</strong></div>
              <div className="d-flex justify-content-between border-bottom py-2"><span>Jumlah</span><strong>{String(stockMovementConfirm.payload.qty ?? '-')}</strong></div>
              <div className="d-flex justify-content-between border-bottom py-2"><span>Efek</span><strong>{movementEffectLabel(stockMovementConfirm.payload.movementType)}</strong></div>
              <div className="mt-3">
                <div className="fw-semibold mb-1">Checklist</div>
                <ul className="mb-0 ps-3">
                  <li>Cek barang dan jumlah.</li>
                  <li>Cek alasan mutasi.</li>
                  <li>Bukti/laporan sudah dicek.</li>
                </ul>
              </div>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setStockMovementConfirm(null)}>Batal</Button>
          <Button onClick={confirmStockMovement} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Mutasi'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ResourceDetailModal
        show={Boolean(detailItem)}
        item={detailItem}
        config={config}
        onHide={() => setDetailItem(null)}
        onEdit={canEditResourceItem(config, user?.role, detailItem ?? {}).allowed ? (item) => { setDetailItem(null); openEdit(item); } : undefined}
        onPrimaryAction={config.path === '/tenants' || config.path === '/rooms' ? (item) => {
          const currentStay = item.currentStay as { id?: number } | undefined;
          if (config.path === '/tenants') {
            if (currentStay?.id) navigate(`/stays/${currentStay.id}`);
            else navigate(`/stays/check-in?tenantId=${item.id}`);
            return;
          }
          if (config.path === '/rooms') navigate(`/rooms/${item.id}`);
        } : undefined}
      />
    </div>
  );
}
