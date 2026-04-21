export type ResourcePath =
  | '/users'
  | '/tenants'
  | '/rooms'
  | '/stays'
  | '/invoices'
  | '/meter-readings'
  | '/inventory-items'
  | '/room-items'
  | '/invoice-payments'
  | '/inventory-movements'
  | '/wifi-sales'
  | '/expenses'
  | '/announcements';

export type ReferenceOption = {
  value: number;
  label: string;
  caption?: string;
};

type RelationSpec = {
  sourcePath: ResourcePath;
  placeholder: string;
  optional?: boolean;
};

const relationSpecs: Record<string, Record<string, RelationSpec>> = {
  '/users': {
    tenantId: { sourcePath: '/tenants', placeholder: 'Pilih tenant untuk akun portal', optional: true },
  },
  '/stays': {
    tenantId: { sourcePath: '/tenants', placeholder: 'Pilih tenant', optional: false },
    roomId: { sourcePath: '/rooms', placeholder: 'Pilih kamar', optional: false },
  },
  '/meter-readings': {
    roomId: { sourcePath: '/rooms', placeholder: 'Pilih kamar', optional: false },
  },
  '/room-items': {
    roomId: { sourcePath: '/rooms', placeholder: 'Pilih kamar', optional: false },
    itemId: { sourcePath: '/inventory-items', placeholder: 'Pilih barang', optional: false },
  },
  '/invoice-payments': {
    invoiceId: { sourcePath: '/invoices', placeholder: 'Pilih invoice', optional: false },
  },
  '/inventory-movements': {
    itemId: { sourcePath: '/inventory-items', placeholder: 'Pilih barang', optional: false },
    roomId: { sourcePath: '/rooms', placeholder: 'Pilih kamar bila terkait', optional: true },
  },
  '/expenses': {
    roomId: { sourcePath: '/rooms', placeholder: 'Pilih kamar bila terkait', optional: true },
    stayId: { sourcePath: '/stays', placeholder: 'Pilih stay bila terkait', optional: true },
  },
};

export function getRelationSpec(configPath: string, fieldName: string): RelationSpec | null {
  return relationSpecs[configPath]?.[fieldName] ?? null;
}

export function getRequiredReferencePaths(configPath: string): ResourcePath[] {
  const specs = relationSpecs[configPath] ?? {};
  return Array.from(new Set(Object.values(specs).map((item) => item.sourcePath)));
}

function safeText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function buildReferenceOption(sourcePath: string, item: Record<string, any>): ReferenceOption {
  switch (sourcePath) {
    case '/tenants': {
      const label = `${safeText(item.fullName)}`;
      const captionParts = [item.phone, item.email].filter(Boolean).map((value) => String(value));
      return {
        value: Number(item.id),
        label,
        caption: captionParts.join(' · ') || `Tenant #${item.id}`,
      };
    }
    case '/rooms': {
      const roomName = item.name ? ` · ${item.name}` : '';
      const floor = item.floor ? `Lantai ${item.floor}` : 'Tanpa lantai';
      const status = item.status ? String(item.status) : 'UNKNOWN';
      return {
        value: Number(item.id),
        label: `${safeText(item.code)}${roomName}`,
        caption: `${floor} · ${status}`,
      };
    }
    case '/inventory-items': {
      const sku = item.sku ? `${item.sku}` : `Item #${item.id}`;
      const category = item.category ? `${item.category}` : 'Tanpa kategori';
      const qty = item.qtyOnHand !== undefined && item.qtyOnHand !== null ? `Stok ${item.qtyOnHand}` : null;
      return {
        value: Number(item.id),
        label: `${sku} · ${safeText(item.name)}`,
        caption: [category, qty].filter(Boolean).join(' · '),
      };
    }
    case '/stays': {
      const tenantName = item.tenant?.fullName || item.tenantName || `Tenant #${item.tenantId}`;
      const roomCode = item.room?.code || item.roomCode || `Kamar #${item.roomId}`;
      const status = item.status ? String(item.status) : 'UNKNOWN';
      return {
        value: Number(item.id),
        label: `Stay #${item.id} · ${tenantName}`,
        caption: `${roomCode} · ${status}`,
      };
    }
    case '/invoices': {
      const tenantName = item.stay?.tenant?.fullName || item.tenantName || (item.stayId ? `Stay #${item.stayId}` : `Invoice #${item.id}`);
      const roomCode = item.stay?.room?.code || item.roomCode;
      const invoiceNumber = item.invoiceNumber || `INV-${item.id}`;
      const status = item.status ? String(item.status) : 'UNKNOWN';
      return {
        value: Number(item.id),
        label: `${invoiceNumber}`,
        caption: [tenantName, roomCode, status].filter(Boolean).join(' · '),
      };
    }
    default:
      return {
        value: Number(item.id),
        label: `${sourcePath} #${item.id}`,
      };
  }
}

export function buildReferenceOptions(items: Array<Record<string, any>> = [], sourcePath: string): ReferenceOption[] {
  return items
    .map((item) => buildReferenceOption(sourcePath, item))
    .sort((a, b) => a.label.localeCompare(b.label, 'id-ID'));
}

export function getReferenceLabel(
  configPath: string,
  fieldName: string,
  value: unknown,
  referenceMaps: Record<string, Map<string, ReferenceOption>>,
): ReferenceOption | null {
  const spec = getRelationSpec(configPath, fieldName);
  if (!spec || value === null || value === undefined || value === '') return null;
  return referenceMaps[spec.sourcePath]?.get(String(value)) ?? null;
}

export function getFlowNote(configPath: string) {
  switch (configPath) {
    case '/invoice-payments':
      return {
        title: 'Flow pembayaran yang disarankan',
        description:
          'Untuk pencatatan paling sederhana, buka detail invoice lalu catat pembayaran dari sana. Halaman ini tetap berguna untuk koreksi, audit, dan input cepat massal.',
        backendNote:
          'Backend berikutnya idealnya menyiapkan endpoint invoice outstanding siap-bayar dan preview status invoice setelah nominal dimasukkan.',
      };
    case '/inventory-items':
      return {
        title: 'Flow inventaris yang disarankan',
        description:
          'Inventory Items adalah master barang global. Penempatan barang ke kamar sebaiknya lewat Room Items, sedangkan perubahan stok harian dicatat di Inventory Movements.',
        backendNote:
          'Backend berikutnya idealnya menyiapkan endpoint ringkasan stok per kategori, low stock, dan histori item terurut untuk dashboard operasional.',
      };
    case '/inventory-movements':
      return {
        title: 'Flow pergerakan stok',
        description:
          'Gunakan IN untuk barang masuk, OUT untuk barang keluar, ASSIGN_TO_ROOM saat barang dipasang ke kamar, dan RETURN_FROM_ROOM saat barang kembali ke stok pusat.',
        backendNote:
          'Frontend sudah menampilkan nama item dan kamar lewat lookup. Backend yang lebih matang idealnya mengembalikan include item dan room langsung di response list.',
      };
    case '/room-items':
      return {
        title: 'Flow aset per kamar',
        description:
          'Room Items adalah snapshot barang yang terpasang di setiap kamar. Bila stok pusat berubah, tetap catat perpindahannya di Inventory Movements agar audit trail tidak putus.',
        backendNote:
          'Jika nanti ingin lebih otomatis, backend dapat menyiapkan sinkronisasi room items dari movement tertentu.',
      };
    case '/expenses':
      return {
        title: 'Flow pengeluaran operasional',
        description:
          'Hubungkan expense ke kamar atau stay hanya jika memang ada kaitan langsung. Untuk biaya umum seperti gaji dan internet pusat, biarkan relasi kamar/stay kosong.',
        backendNote:
          'Backend berikutnya idealnya menyiapkan filter laporan bulanan, include relasi kamar/stay, dan agregasi total per kategori.',
      };
    default:
      return null;
  }
}
