import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createResource, deleteResource, listResource, updateResource } from '../../api/resources';
import PageHeader from '../../components/common/PageHeader';
import { EntityBadgeFilterBar, StatusStrip } from '../../components/workspace';
import ResourceFormModal from '../../components/resources/ResourceFormModal';
import ResourceTable from '../../components/resources/ResourceTable';
import ResourceDetailModal from '../../components/resources/ResourceDetailModal';
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
} from './simpleCrudHelpers';
import {
  buildReferenceOptions,
  getFlowNote,
  getRequiredReferencePaths,
  ReferenceOption,
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

function asString(value: unknown) {
  return String(value ?? '').toUpperCase();
}

function getNested(item: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, item);
}

function isLowStock(item: Record<string, unknown>) {
  const qty = Number(item.qtyOnHand ?? 0);
  const min = Number(item.minQty ?? 0);
  return min > 0 && qty <= min;
}

function getResourceFilterDefinitions(configPath: string, items: Array<Record<string, unknown>>) {
  const count = (predicate: (item: Record<string, unknown>) => boolean) => items.filter(predicate).length;
  const statusCount = (status: string) => count((item) => asString(item.status) === status);
  const movementCount = (type: string) => count((item) => asString(item.movementType) === type);
  const publishedCount = (value: boolean) => count((item) => Boolean(item.isPublished) === value);
  const activeCount = (value: boolean) => count((item) => Boolean(item.isActive) === value);

  if (configPath === '/tenants') {
    return [
      { id: 'ALL', label: 'Semua Tenant', count: items.length, tone: 'info' as const },
      { id: 'ACTIVE', label: 'Aktif', count: activeCount(true), tone: 'success' as const },
      { id: 'WITH_STAY', label: 'Ada Masa Sewa', count: count((item) => Boolean(item.activeStayId || item.currentStay)), tone: 'success' as const },
      { id: 'NO_STAY', label: 'Belum Menempati', count: count((item) => !item.activeStayId && !item.currentStay), tone: 'warning' as const },
      { id: 'PORTAL_ACTIVE', label: 'Portal Aktif', count: count((item) => Boolean(getNested(item, 'portalUserSummary.portalIsActive'))), tone: 'info' as const },
    ];
  }

  if (configPath === '/rooms') {
    return [
      { id: 'ALL', label: 'Semua Kamar', count: items.length, tone: 'info' as const },
      { id: 'AVAILABLE', label: 'Tersedia', count: statusCount('AVAILABLE'), tone: 'success' as const },
      { id: 'OCCUPIED', label: 'Terisi', count: statusCount('OCCUPIED'), tone: 'info' as const },
      { id: 'RESERVED', label: 'Dipesan', count: statusCount('RESERVED'), tone: 'warning' as const },
      { id: 'MAINTENANCE', label: 'Perlu Cek', count: count((item) => ['MAINTENANCE', 'INACTIVE'].includes(asString(item.status))), tone: 'danger' as const },
    ];
  }

  if (configPath === '/room-items') {
    return [
      { id: 'ALL', label: 'Semua Barang', count: items.length, tone: 'info' as const },
      { id: 'GOOD', label: 'Baik', count: statusCount('GOOD'), tone: 'success' as const },
      { id: 'PENDING_CHECK', label: 'Perlu Cek', count: statusCount('PENDING_CHECK'), tone: 'warning' as const },
      { id: 'MAINTENANCE', label: 'Maintenance', count: statusCount('MAINTENANCE'), tone: 'warning' as const },
      { id: 'DAMAGED', label: 'Rusak', count: statusCount('DAMAGED'), tone: 'danger' as const },
      { id: 'MISSING', label: 'Hilang', count: statusCount('MISSING'), tone: 'danger' as const },
    ];
  }

  if (configPath === '/inventory-items') {
    return [
      { id: 'ALL', label: 'Semua Stok', count: items.length, tone: 'info' as const },
      { id: 'LOW_AUTO', label: 'Stok Menipis', count: count(isLowStock), tone: 'warning' as const },
      { id: 'OUT_OF_STOCK', label: 'Habis', count: statusCount('OUT_OF_STOCK'), tone: 'danger' as const },
      { id: 'GOOD', label: 'Aman', count: count((item) => asString(item.status) === 'GOOD' && !isLowStock(item)), tone: 'success' as const },
      { id: 'DAMAGED', label: 'Rusak', count: statusCount('DAMAGED'), tone: 'danger' as const },
    ];
  }

  if (configPath === '/inventory-movements') {
    return [
      { id: 'ALL', label: 'Semua Mutasi', count: items.length, tone: 'info' as const },
      { id: 'IN', label: 'Masuk', count: movementCount('IN'), tone: 'success' as const },
      { id: 'OUT', label: 'Keluar', count: movementCount('OUT'), tone: 'warning' as const },
      { id: 'ASSIGN_TO_ROOM', label: 'Pasang ke Kamar', count: movementCount('ASSIGN_TO_ROOM'), tone: 'info' as const },
      { id: 'RETURN_FROM_ROOM', label: 'Kembali', count: movementCount('RETURN_FROM_ROOM'), tone: 'neutral' as const },
    ];
  }

  if (configPath === '/announcements') {
    return [
      { id: 'ALL', label: 'Semua', count: items.length, tone: 'info' as const },
      { id: 'PUBLISHED', label: 'Published', count: publishedCount(true), tone: 'success' as const },
      { id: 'DRAFT', label: 'Draft', count: publishedCount(false), tone: 'warning' as const },
      { id: 'PINNED', label: 'Pinned', count: count((item) => Boolean(item.isPinned)), tone: 'info' as const },
    ];
  }

  if (configPath === '/expenses') {
    return [
      { id: 'ALL', label: 'Semua Biaya', count: items.length, tone: 'info' as const },
      { id: 'FIXED', label: 'Tetap', count: count((item) => asString(item.type) === 'FIXED'), tone: 'info' as const },
      { id: 'VARIABLE', label: 'Variabel', count: count((item) => asString(item.type) === 'VARIABLE'), tone: 'warning' as const },
      { id: 'MAINTENANCE', label: 'Maintenance', count: count((item) => asString(item.category) === 'MAINTENANCE'), tone: 'warning' as const },
      { id: 'COGS_SERVICE', label: 'COGS Layanan', count: count((item) => ['INTERNET', 'CLEANING', 'SUPPLIES'].includes(asString(item.category))), tone: 'info' as const },
      { id: 'ADMIN_COST', label: 'Admin/Platform', count: count((item) => ['TAX', 'MARKETING', 'OTHER'].includes(asString(item.category))), tone: 'neutral' as const },
    ];
  }

  if (configPath === '/wifi-sales') {
    return [
      { id: 'ALL', label: 'Semua Voucher', count: items.length, tone: 'info' as const },
      { id: 'DAILY', label: 'Harian', count: count((item) => String(item.packageName ?? '').toLowerCase().includes('hari')), tone: 'success' as const },
      { id: 'WEEKLY', label: 'Mingguan', count: count((item) => String(item.packageName ?? '').toLowerCase().includes('minggu')), tone: 'info' as const },
      { id: 'MONTHLY', label: 'Bulanan', count: count((item) => String(item.packageName ?? '').toLowerCase().includes('bulan')), tone: 'warning' as const },
    ];
  }

  return [];
}

function applyResourceFilter(configPath: string, item: Record<string, unknown>, filter: ResourceFilterId) {
  if (filter === 'ALL') return true;
  if (configPath === '/tenants') {
    if (filter === 'ACTIVE') return item.isActive !== false;
    if (filter === 'WITH_STAY') return Boolean(item.activeStayId || item.currentStay);
    if (filter === 'NO_STAY') return !item.activeStayId && !item.currentStay;
    if (filter === 'PORTAL_ACTIVE') return Boolean(getNested(item, 'portalUserSummary.portalIsActive'));
  }
  if (configPath === '/rooms') {
    if (filter === 'MAINTENANCE') return ['MAINTENANCE', 'INACTIVE'].includes(asString(item.status));
    return asString(item.status) === filter;
  }
  if (configPath === '/room-items') return asString(item.status) === filter;
  if (configPath === '/inventory-items') {
    if (filter === 'LOW_AUTO') return isLowStock(item);
    if (filter === 'GOOD') return asString(item.status) === 'GOOD' && !isLowStock(item);
    return asString(item.status) === filter;
  }
  if (configPath === '/inventory-movements') return asString(item.movementType) === filter;
  if (configPath === '/announcements') {
    if (filter === 'PUBLISHED') return Boolean(item.isPublished);
    if (filter === 'DRAFT') return !item.isPublished;
    if (filter === 'PINNED') return Boolean(item.isPinned);
  }
  if (configPath === '/expenses') {
    if (filter === 'MAINTENANCE') return asString(item.category) === 'MAINTENANCE';
    if (filter === 'COGS_SERVICE') return ['INTERNET', 'CLEANING', 'SUPPLIES'].includes(asString(item.category));
    if (filter === 'ADMIN_COST') return ['TAX', 'MARKETING', 'OTHER'].includes(asString(item.category));
    return asString(item.type) === filter;
  }
  if (configPath === '/wifi-sales') {
    const packageName = String(item.packageName ?? '').toLowerCase();
    if (filter === 'DAILY') return packageName.includes('hari');
    if (filter === 'WEEKLY') return packageName.includes('minggu');
    if (filter === 'MONTHLY') return packageName.includes('bulan');
  }
  return true;
}

function mapReferenceData(items: Array<Record<string, unknown>> = [], sourcePath: string) {
  const options = buildReferenceOptions(items, sourcePath);
  const map = new Map<string, ReferenceOption>();
  options.forEach((option) => {
    map.set(String(option.value), option);
  });
  return { options, map };
}

export default function SimpleCrudPage({ config }: { config: ResourceConfig }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>(buildInitialState(config));
  const [error, setError] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilterId>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;


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
      await queryClient.invalidateQueries({ queryKey: [config.path, 'list'] });
      setShowModal(false);
      setEditingItem(null);
      setFormState(buildInitialState(config));
      setError('');
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
    },
  });

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

  const filteredItems = useMemo(() => {
    if (!hasResourceFilters) return items;
    return items.filter((item) => applyResourceFilter(config.path, item, resourceFilter));
  }, [config.path, hasResourceFilters, items, resourceFilter]);

  const openCreate = () => {
    const createGuard = canCreateResourceItem(config, user?.role);
    if (!createGuard.allowed) {
      setError(createGuard.reason ?? 'Anda tidak memiliki izin untuk membuat data baru.');
      return;
    }

    setEditingItem(null);
    setFormState(buildInitialState(config));
    setError('');
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
        setError('Tenant ini masih menempati kamar. Checkout atau batalkan stay terlebih dahulu dari modul Stays sebelum menonaktifkan tenant.');
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

    saveMutation.mutate(payload);
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
      { id: 'invoices', icon: '🧾', label: 'Tagihan', helper: 'Invoice dan tagihan tenant.', to: '/invoices', active: false },
      { id: 'review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar pending review.', to: '/payment-submissions/review', active: false },
      { id: 'wifi', icon: '📶', label: 'Voucher WiFi', helper: 'Rekap penjualan voucher WiFi.', to: '/wifi-sales', active: config.path === '/wifi-sales' },
      { id: 'ancillary', icon: '🛒', label: 'Pendapatan Tambahan', helper: 'Katalog layanan add-on future: laundry, galon, cleaning, parkir.', to: '/ancillary-revenue', active: false },
      { id: 'expenses', icon: '💸', label: 'Pengeluaran', helper: 'Biaya operasional dan COGS layanan.', to: '/expenses', active: config.path === '/expenses' },
      { id: 'history', icon: '📚', label: 'Riwayat Bayar', helper: 'Pembayaran invoice yang tercatat.', to: '/invoice-payments', active: config.path === '/invoice-payments' },
    ];
    if (['/rooms', '/room-items', '/inventory-items', '/inventory-movements'].includes(config.path)) return [
      { id: 'rooms', icon: '🏘️', label: 'Kamar', helper: 'Status kamar dan okupansi.', to: '/rooms', active: config.path === '/rooms' },
      { id: 'room-items', icon: '🪑', label: 'Barang Kamar', helper: 'Inventaris per kamar.', to: '/room-items', active: config.path === '/room-items' },
      { id: 'stock', icon: '📦', label: 'Stok Gudang', helper: 'Barang gudang dan stok minimum.', to: '/inventory-items', active: config.path === '/inventory-items' },
      { id: 'movement', icon: '🔄', label: 'Mutasi Stok', helper: 'Riwayat stok masuk/keluar/pasang.', to: '/inventory-movements', active: config.path === '/inventory-movements' },
    ];
    return [];
  }, [config.path]);
  const meta = query.data?.meta;
  const isReferenceLoading = [tenantsRefQuery, roomsRefQuery, inventoryItemsRefQuery, invoicesRefQuery, staysRefQuery]
    .filter((item) => item.isFetching && item.fetchStatus !== 'idle')
    .length > 0;

  return (
    <div className={isStaffView ? 'staff-simple-mode' : undefined}>
      <PageHeader
        eyebrow={isStaffView ? 'Daftar Cek' : 'Master data'}
        title={config.title}
        description={isStaffView ? `Lihat data ${config.title.toLowerCase()} yang perlu dicek. Buka detail bila perlu.` : `Kelola data ${config.title.toLowerCase()} dengan tampilan yang lebih rapi, relasi yang lebih jelas, dan input yang lebih aman.`}
        actionLabel={createGuard.allowed ? (config.createLabel || 'Tambah Data') : undefined}
        onAction={createGuard.allowed ? openCreate : undefined}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {areaMenuItems.length ? (
        <div className="admin-area-internal-menu finance-inline-menu" aria-label={`Sub-menu ${config.title}`}>
          <div className="admin-area-internal-menu-head">
            <span>{config.path === '/tenants' ? 'Menu Stays & Tenant' : config.path === '/wifi-sales' || config.path === '/expenses' || config.path === '/invoice-payments' ? 'Menu Finance' : 'Menu Kamar & Stok'}</span>
            <small>{config.path === '/tenants' ? 'Tenant digabung dengan lifecycle masa sewa.' : config.path === '/wifi-sales' || config.path === '/expenses' || config.path === '/invoice-payments' ? 'Voucher, pendapatan tambahan, pengeluaran, dan riwayat tetap di Finance.' : 'Kamar, inventaris, stok, dan mutasi tetap satu area.'}</small>
          </div>
          <div className="admin-area-internal-menu-scroll">
            {areaMenuItems.map((item) => (
              <button type="button" key={item.id} className={`admin-area-internal-chip info ${item.active ? 'is-active' : ''}`.trim()} onClick={() => navigate(item.to)} title={item.helper}>
                <span className="admin-area-internal-chip-main">
                  <span className="admin-area-internal-icon" aria-hidden="true">{item.icon}</span>
                  <span className="admin-area-internal-label">{item.label}</span>
                </span>
                <small>{item.helper}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isStaffView ? (
        <>
          <StatusStrip
            items={[
              { id: 'total-records', label: isTenantResource ? 'Tenant' : config.title, value: meta?.totalItems ?? filteredItems.length, helper: 'Record pada badge aktif', tone: 'info' },
              { id: 'shown-records', label: 'Ditampilkan', value: filteredItems.length, helper: 'Baris tabel saat ini', tone: 'neutral' },
              ...(isTenantResource ? [
                { id: 'portal-active', label: 'Portal aktif', value: tenantPortalUsers.filter((item) => item.isActive).length, helper: 'Akun tenant terhubung', tone: 'success' as const },
                { id: 'without-portal', label: 'Belum portal', value: Math.max(0, filteredItems.length - tenantPortalUsers.length), helper: 'Butuh follow-up bila perlu', tone: 'warning' as const },
              ] : [
                { id: 'mode', label: 'Mode', value: createGuard.allowed ? 'Kelola' : 'Lihat', helper: createGuard.allowed ? 'Aksi tersedia sesuai status' : 'Read-only', tone: createGuard.allowed ? 'success' as const : 'warning' as const },
              ]),
            ]}
          />
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
            onRowOpen={setDetailItem}
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
