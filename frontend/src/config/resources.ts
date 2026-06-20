export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'date'
  | 'textarea'
  | 'checkbox'
  | 'password'
  | 'currency';

export type ResourceField = {
  name: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
};

export type ResourceConfig = {
  title: string;
  path: string;
  idField?: string;
  columns: { key: string; label: string }[];
  fields: ResourceField[];
  allowDelete?: boolean;
  createLabel?: string;
  supportsIsActiveFilter?: boolean;
  emptyMessage?: string;
};

export type ManageGuardResult = {
  allowed: boolean;
  reason?: string;
};

import { peopleConfigs } from './resources/people';
import { propertyConfigs } from './resources/property';
import { inventoryConfigs } from './resources/inventory';
import { financeConfigs } from './resources/finance';
import { communicationsConfigs } from './resources/communications';

export const resourceConfigs: Record<string, ResourceConfig> = {
  ...peopleConfigs,
  ...propertyConfigs,
  ...inventoryConfigs,
  ...financeConfigs,
  ...communicationsConfigs,
};

const staffReadOnlyResourcePaths = new Set(['/rooms', '/inventory-items', '/inventory-movements', '/room-items']);

function getStaffReadOnlyReason(path: string) {
  if (!staffReadOnlyResourcePaths.has(path)) return null;
  switch (path) {
    case '/rooms':
      return 'Buka detail kamar untuk melihat data.';
    case '/inventory-items':
      return 'Cek stok barang dari daftar ini.';
    case '/inventory-movements':
      return 'Cek catatan barang masuk dan keluar.';
    case '/room-items':
      return 'Cek barang yang ada di kamar.';
    default:
      return 'Buka data yang perlu dicek.';
  }
}

export function getFieldOptionsForContext(
  config: ResourceConfig,
  fieldName: string,
  currentUserRole?: string,
): { label: string; value: string }[] {
  const field = config.fields.find((item) => item.name === fieldName);
  const options = field?.options ?? [];

  if (config.path === '/users' && fieldName === 'role' && currentUserRole === 'ADMIN') {
    return options.filter((option) => option.value !== 'OWNER');
  }

  return options;
}

export function canCreateResourceItem(
  config: ResourceConfig,
  currentUserRole: string | undefined,
): ManageGuardResult {
  if (config.path === '/room-items') {
    return {
      allowed: false,
      reason: 'Tambah/pindah barang kamar lewat Mutasi Stok agar stok gudang ikut sinkron.',
    };
  }

  if (currentUserRole === 'STAFF') {
    const reason = getStaffReadOnlyReason(config.path);
    if (reason) {
      return { allowed: false, reason };
    }
  }

  return { allowed: true };
}

export function canEditResourceItem(
  config: ResourceConfig,
  currentUserRole: string | undefined,
  item: Record<string, unknown>,
): ManageGuardResult {
  if (config.path === '/inventory-movements') {
    return {
      allowed: false,
      reason: 'Mutasi stok resmi tidak diedit langsung. Buat mutasi koreksi agar audit tetap jelas.',
    };
  }

  if (config.path === '/users' && currentUserRole === 'ADMIN' && item.role === 'OWNER') {
    return {
      allowed: false,
      reason: 'Admin tidak dapat mengedit akun Owner.',
    };
  }

  if (currentUserRole === 'STAFF') {
    const reason = getStaffReadOnlyReason(config.path);
    if (reason) {
      return { allowed: false, reason };
    }
  }

  return { allowed: true };
}

export function canDeleteResourceItem(
  config: ResourceConfig,
  currentUserRole: string | undefined,
  item: Record<string, unknown>,
): ManageGuardResult {
  if (config.path === '/users' && currentUserRole === 'ADMIN' && item.role === 'OWNER') {
    return {
      allowed: false,
      reason: 'Admin tidak dapat menghapus akun Owner.',
    };
  }

  if (currentUserRole === 'STAFF') {
    const reason = getStaffReadOnlyReason(config.path);
    if (reason) {
      return { allowed: false, reason };
    }
  }

  return { allowed: true };
}
