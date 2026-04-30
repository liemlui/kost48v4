import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Card } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { createResource, deleteResource, listResource, updateResource } from '../../api/resources';
import PageHeader from '../../components/common/PageHeader';
import ResourceFormModal from '../../components/resources/ResourceFormModal';
import ResourceTable from '../../components/resources/ResourceTable';
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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>(buildInitialState(config));
  const [error, setError] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState(config.path === '/tenants' ? searchParams.get('search') ?? '' : '');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (config.path !== '/tenants') return;
    const next = searchParams.get('search') ?? '';
    if (next !== searchTerm) {
      setSearchTerm(next);
    }
  }, [config.path, searchParams, searchTerm]);

  useEffect(() => {
    if (config.path !== '/tenants') return;
    const nextParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      nextParams.set('search', searchTerm.trim());
    } else {
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  }, [config.path, searchParams, searchTerm, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, showActiveOnly]);

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
      ...(supportsIsActiveFilter && showActiveOnly ? { isActive: 'true' } : {}),
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

  const filteredItems = useMemo(() => {
    return items;
  }, [items]);

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

  const createGuard = useMemo(() => canCreateResourceItem(config, user?.role), [config, user?.role]);

  const flowNote = getFlowNote(config.path);
  const meta = query.data?.meta;
  const isReferenceLoading = [tenantsRefQuery, roomsRefQuery, inventoryItemsRefQuery, invoicesRefQuery, staysRefQuery]
    .filter((item) => item.isFetching && item.fetchStatus !== 'idle')
    .length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title={config.title}
        description={`Kelola data ${config.title.toLowerCase()} dengan tampilan yang lebih rapi, relasi yang lebih jelas, dan input yang lebih aman.`}
        actionLabel={createGuard.allowed ? (config.createLabel || 'Tambah Data') : undefined}
        onAction={createGuard.allowed ? openCreate : undefined}
      />

      {flowNote ? (
        <Alert variant="info" className="content-card border-0 mb-4">
          <div className="fw-semibold mb-1">{flowNote.title}</div>
          <div className="mb-1">{flowNote.description}</div>
          <div className="small text-muted">Catatan backend: {flowNote.backendNote}</div>
        </Alert>
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card className="content-card border-0">
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
    </div>
  );
}
