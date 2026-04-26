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
};

const userRoles = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'TENANT', label: 'Tenant Portal' },
];

const announcementAudienceOptions = [
  { value: 'TENANT', label: 'Tenant' },
  { value: 'ALL', label: 'Semua' },
];

export const resourceConfigs: Record<string, ResourceConfig> = {
  users: {
    title: 'Users & Akses',
    supportsIsActiveFilter: true,
    path: '/users',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'fullName', label: 'Nama' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'tenantId', label: 'Tenant Terkait' },
      { key: 'isActive', label: 'Aktif' },
    ],
    fields: [
      {
        name: 'fullName',
        label: 'Nama Lengkap',
        type: 'text',
        placeholder: 'Nama lengkap user',
        required: true,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'email@contoh.com',
        required: true,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Password minimal 8 karakter',
        required: true,
      },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        options: userRoles,
        required: true,
      },
      {
        name: 'tenantId',
        label: 'Tenant Terkait',
        type: 'select',
        placeholder: 'Pilih tenant bila role = TENANT',
      },
      { name: 'isActive', label: 'Akun Aktif', type: 'checkbox' },
    ],
  },

  tenants: {
    title: 'Tenants & Portal Access',
    supportsIsActiveFilter: true,
    path: '/tenants',
    columns: [
      { key: 'fullName', label: 'Nama Tenant' },
      { key: 'phone', label: 'HP' },
      { key: 'email', label: 'Email' },
      { key: 'portalAccess', label: 'Akses Portal' },
      { key: 'isActive', label: 'Status' },
      { key: 'originCity', label: 'Kota Asal' },
    ],
    fields: [
      {
        name: 'fullName',
        label: 'Nama Lengkap',
        type: 'text',
        placeholder: 'Nama lengkap tenant',
        required: true,
      },
      {
        name: 'phone',
        label: 'No. HP',
        type: 'text',
        placeholder: '08xxxxxxxxxx atau +628xxxxxxxxxx',
        required: true,
      },
      {
        name: 'identityNumber',
        label: 'No. KTP',
        type: 'text',
        placeholder: 'Nomor KTP tenant',
        required: true,
      },
      {
        name: 'emergencyContactName',
        label: 'Nama Kontak Darurat',
        type: 'text',
        placeholder: 'Nama kontak darurat',
      },
      {
        name: 'emergencyContactPhone',
        label: 'Telp Kontak Darurat',
        type: 'text',
        placeholder: 'Nomor telepon kontak darurat',
      },
      {
        name: 'email',
        label: 'Email Tenant (untuk kontak)',
        type: 'email',
        placeholder: 'email@contoh.com',
      },
      {
        name: 'gender',
        label: 'Jenis Kelamin',
        type: 'select',
        options: [
          { value: 'MALE', label: 'Laki-laki' },
          { value: 'FEMALE', label: 'Perempuan' },
          { value: 'OTHER', label: 'Lainnya' },
        ],
      },
      { name: 'birthDate', label: 'Tanggal Lahir', type: 'date' },
      {
        name: 'originCity',
        label: 'Kota Asal',
        type: 'text',
        placeholder: 'Kota asal tenant',
      },
      {
        name: 'occupation',
        label: 'Pekerjaan',
        type: 'text',
        placeholder: 'Pekerjaan tenant',
      },
      {
        name: 'companyOrCampus',
        label: 'Instansi / Kampus',
        type: 'text',
        placeholder: 'Nama perusahaan atau kampus',
      },
      {
        name: 'notes',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan tambahan tentang tenant',
      },
      { name: 'isActive', label: 'Tenant Aktif', type: 'checkbox' },
    ],
  },

  rooms: {
    title: 'Rooms',
    supportsIsActiveFilter: true,
    path: '/rooms',
    columns: [
      { key: 'code', label: 'Kamar' },
      { key: 'floor', label: 'Lantai' },
      { key: 'status', label: 'Status Kamar' },
      { key: 'monthlyRateRupiah', label: 'Tarif Bulanan' },
    ],
    fields: [
      {
        name: 'code',
        label: 'Kode Kamar',
        type: 'text',
        placeholder: 'Contoh: A101, B202, C303',
        required: true,
      },
      {
        name: 'name',
        label: 'Nama Kamar',
        type: 'text',
        placeholder: 'Contoh: Kamar Standard Lantai 1, Kamar VIP',
        required: true,
      },
      {
        name: 'floor',
        label: 'Lantai',
        type: 'text',
        placeholder: 'Contoh: 1, 2, 3, Lantai Dasar',
        required: true,
      },
      {
        name: 'monthlyRateRupiah',
        label: 'Tarif Bulanan',
        type: 'currency',
        placeholder: '1500000 untuk Rp 1.500.000',
        required: true,
      },
      {
        name: 'weeklyRateRupiah',
        label: 'Tarif Mingguan',
        type: 'currency',
        placeholder: '400000 untuk Rp 400.000',
        required: true,
      },
      {
        name: 'biWeeklyRateRupiah',
        label: 'Tarif 2 Mingguan',
        type: 'currency',
        placeholder: '750000 untuk Rp 750.000',
        required: true,
      },
      {
        name: 'dailyRateRupiah',
        label: 'Tarif Harian',
        type: 'currency',
        placeholder: '75000 untuk Rp 75.000',
        required: true,
      },
      {
        name: 'defaultDepositRupiah',
        label: 'Deposit Default',
        type: 'currency',
        placeholder: '2000000 untuk Rp 2.000.000',
        required: true,
      },
      {
        name: 'electricityTariffPerKwhRupiah',
        label: 'Tarif Listrik per kWh',
        type: 'currency',
        placeholder: '1500 untuk Rp 1.500 per kWh',
        required: true,
      },
      {
        name: 'waterTariffPerM3Rupiah',
        label: 'Tarif Air per m³',
        type: 'currency',
        placeholder: '8000 untuk Rp 8.000 per m³',
        required: true,
      },
      {
        name: 'images',
        label: 'Galeri Gambar',
        type: 'textarea',
        placeholder: 'https://.../gambar-1.jpg\nhttps://.../gambar-2.jpg',
      },
      {
        name: 'notes',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan tambahan tentang kamar, fasilitas, kondisi, dll.',
      },
      { name: 'isActive', label: 'Master Data Aktif', type: 'checkbox' },
    ],
  },

  stays: {
    title: 'Hunian & Check-in',
    path: '/stays',
    createLabel: 'Check-in Baru',
    columns: [
      { key: 'id', label: 'Stay' },
      { key: 'checkInDate', label: 'Check-in' },
      { key: 'status', label: 'Status' },
      { key: 'agreedRentAmountRupiah', label: 'Sewa' },
    ],
    fields: [
      {
        name: 'tenantId',
        label: 'Tenant',
        type: 'number',
        placeholder: 'Pilih tenant',
        required: true,
      },
      {
        name: 'roomId',
        label: 'Kamar',
        type: 'number',
        placeholder: 'Pilih kamar',
        required: true,
      },
      {
        name: 'pricingTerm',
        label: 'Termin Sewa',
        type: 'select',
        options: [
          { value: 'MONTHLY', label: 'Bulanan' },
          { value: 'WEEKLY', label: 'Mingguan' },
          { value: 'DAILY', label: 'Harian' },
          { value: 'BIWEEKLY', label: '2 Mingguan' },
          { value: 'SMESTERLY', label: 'Semesteran' },
          { value: 'YEARLY', label: 'Tahunan' },
        ],
        required: true,
      },
      {
        name: 'checkInDate',
        label: 'Tanggal Check-in',
        type: 'date',
        placeholder: 'Tanggal check-in',
        required: true,
      },
      {
        name: 'agreedRentAmountRupiah',
        label: 'Sewa Disepakati',
        type: 'currency',
        placeholder: 'Jumlah sewa yang disepakati dalam Rupiah',
        required: true,
      },
      {
        name: 'depositAmountRupiah',
        label: 'Deposit',
        type: 'currency',
        placeholder: 'Jumlah deposit dalam Rupiah',
      },
      {
        name: 'stayPurpose',
        label: 'Tujuan Tinggal',
        type: 'select',
        options: [
          { value: 'WORK', label: 'Kerja' },
          { value: 'STUDY', label: 'Kuliah' },
          { value: 'TRANSIT', label: 'Transit' },
          { value: 'FAMILY', label: 'Keluarga' },
          { value: 'MEDICAL', label: 'Medis' },
          { value: 'PROJECT', label: 'Proyek' },
          { value: 'OTHER', label: 'Lainnya' },
        ],
        placeholder: 'Pilih tujuan tinggal',
      },
      {
        name: 'bookingSource',
        label: 'Sumber Booking',
        type: 'select',
        options: [
          { value: 'GOOGLE_MAPS', label: 'Google Maps' },
          { value: 'WALK_IN', label: 'Datang Langsung' },
          { value: 'REFERRAL', label: 'Referensi' },
          { value: 'INSTAGRAM', label: 'Instagram' },
          { value: 'TIKTOK', label: 'TikTok' },
          { value: 'WHATSAPP', label: 'WhatsApp' },
          { value: 'FACEBOOK', label: 'Facebook' },
          { value: 'WEBSITE', label: 'Website' },
          { value: 'OTA', label: 'OTA (Online Travel Agent)' },
          { value: 'OTHER', label: 'Lainnya' },
        ],
        placeholder: 'Pilih sumber booking',
      },
      {
        name: 'notes',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan tambahan tentang stay',
      },
    ],
  },

  announcements: {
    title: 'Pengumuman & Komunikasi',
    supportsIsActiveFilter: true,
    path: '/announcements',
    createLabel: 'Buat Pengumuman',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Judul' },
      { key: 'audience', label: 'Audiens' },
      { key: 'isPublished', label: 'Published' },
      { key: 'isPinned', label: 'Pinned' },
      { key: 'publishedAt', label: 'Tgl Publish' },
    ],
    fields: [
      {
        name: 'title',
        label: 'Judul',
        type: 'text',
        placeholder: 'Judul pengumuman',
        required: true,
      },
      {
        name: 'content',
        label: 'Konten',
        type: 'textarea',
        placeholder: 'Isi pengumuman',
        required: true,
      },
      {
        name: 'audience',
        label: 'Audiens',
        type: 'select',
        options: announcementAudienceOptions,
        required: true,
      },
      { name: 'isPublished', label: 'Published', type: 'checkbox' },
      { name: 'isPinned', label: 'Pinned', type: 'checkbox' },
      {
        name: 'startsAt',
        label: 'Mulai Tayang',
        type: 'date',
        placeholder: 'Tanggal mulai tayang',
      },
      {
        name: 'expiresAt',
        label: 'Berakhir',
        type: 'date',
        placeholder: 'Tanggal berakhir',
      },
    ],
  },

  'meter-readings': {
    title: 'Riwayat Meter & Input Manual',
    path: '/meter-readings',
    createLabel: 'Catat Meter Manual',
    columns: [
      { key: 'roomId', label: 'Kamar' },
      { key: 'utilityType', label: 'Utilitas' },
      { key: 'readingAt', label: 'Tanggal' },
      { key: 'readingValue', label: 'Nilai' },
    ],
    fields: [
      {
        name: 'roomId',
        label: 'Kamar',
        type: 'number',
        placeholder: 'Pilih kamar',
        required: true,
      },
      {
        name: 'utilityType',
        label: 'Utilitas',
        type: 'select',
        options: [
          { value: 'ELECTRICITY', label: 'Listrik' },
          { value: 'WATER', label: 'Air' },
        ],
        required: true,
      },
      {
        name: 'readingAt',
        label: 'Tanggal',
        type: 'date',
        placeholder: 'Tanggal pembacaan meter',
        required: true,
      },
      {
        name: 'readingValue',
        label: 'Nilai Meter',
        type: 'text',
        placeholder: 'Nilai meter (angka)',
        required: true,
      },
      {
        name: 'note',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan tambahan',
      },
    ],
  },

  'inventory-items': {
    title: 'Inventory Items',
    path: '/inventory-items',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Nama' },
      { key: 'category', label: 'Kategori' },
      { key: 'qtyOnHand', label: 'Stok' },
      { key: 'minQty', label: 'Min Stok' },
    ],
    fields: [
      {
        name: 'sku',
        label: 'SKU',
        type: 'text',
        placeholder: 'Kode SKU barang',
        required: true,
      },
      {
        name: 'name',
        label: 'Nama Barang',
        type: 'text',
        placeholder: 'Nama barang',
        required: true,
      },
      {
        name: 'category',
        label: 'Kategori',
        type: 'text',
        placeholder: 'Kategori barang',
        required: true,
      },
      {
        name: 'unit',
        label: 'Satuan',
        type: 'text',
        placeholder: 'pcs, unit, liter, set, dll',
        required: true,
      },
      {
        name: 'qtyOnHand',
        label: 'Stok Saat Ini',
        type: 'text',
        placeholder: 'Jumlah stok saat ini',
        required: true,
      },
      {
        name: 'minQty',
        label: 'Batas Minimum',
        type: 'text',
        placeholder: 'Jumlah minimum stok',
      },
      {
        name: 'notes',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan tambahan tentang barang',
      },
      { name: 'isActive', label: 'Barang Aktif', type: 'checkbox' },
    ],
  },

  'room-items': {
    title: 'Inventaris per Kamar',
    path: '/room-items',
    createLabel: 'Catat Inventaris Kamar',
    columns: [
      { key: 'roomId', label: 'Kamar' },
      { key: 'itemId', label: 'Barang' },
      { key: 'qty', label: 'Qty' },
      { key: 'status', label: 'Status' },
    ],
    fields: [
      {
        name: 'roomId',
        label: 'Kamar',
        type: 'number',
        placeholder: 'Pilih kamar',
        required: true,
      },
      {
        name: 'itemId',
        label: 'Barang',
        type: 'number',
        placeholder: 'Pilih barang',
        required: true,
      },
      {
        name: 'qty',
        label: 'Qty',
        type: 'text',
        placeholder: 'Jumlah barang',
        required: true,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'GOOD', label: 'Baik' },
          { value: 'DAMAGED', label: 'Rusak' },
          { value: 'MAINTENANCE', label: 'Maintenance' },
          { value: 'MISSING', label: 'Hilang' },
        ],
        required: true,
      },
      {
        name: 'note',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan kondisi barang',
      },
    ],
  },

  'invoice-payments': {
    title: 'Invoice Payments',
    path: '/invoice-payments',
    allowDelete: true,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'invoiceId', label: 'Invoice' },
      { key: 'paymentDate', label: 'Tanggal' },
      { key: 'amountRupiah', label: 'Nominal' },
      { key: 'method', label: 'Metode' },
    ],
    fields: [
      {
        name: 'invoiceId',
        label: 'Invoice',
        type: 'number',
        placeholder: 'Pilih invoice',
        required: true,
      },
      {
        name: 'paymentDate',
        label: 'Tanggal Pembayaran',
        type: 'date',
        placeholder: 'Tanggal pembayaran',
        required: true,
      },
      {
        name: 'amountRupiah',
        label: 'Nominal',
        type: 'currency',
        placeholder: 'Jumlah pembayaran dalam Rupiah',
        required: true,
      },
      {
        name: 'method',
        label: 'Metode',
        type: 'select',
        options: [
          { value: 'CASH', label: 'Tunai' },
          { value: 'TRANSFER', label: 'Transfer' },
          { value: 'QRIS', label: 'QRIS' },
          { value: 'EWALLET', label: 'E-Wallet' },
          { value: 'OTHER', label: 'Lainnya' },
        ],
        required: true,
      },
      {
        name: 'referenceNo',
        label: 'Nomor Referensi',
        type: 'text',
        placeholder: 'Nomor referensi pembayaran',
      },
      {
        name: 'note',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan pembayaran',
      },
    ],
  },

  'inventory-movements': {
    title: 'Histori Pergerakan Stok',
    path: '/inventory-movements',
    createLabel: 'Catat Pergerakan Stok',
    columns: [
      { key: 'itemId', label: 'Barang' },
      { key: 'movementType', label: 'Tipe' },
      { key: 'qty', label: 'Qty' },
      { key: 'roomId', label: 'Kamar' },
      { key: 'movementDate', label: 'Tanggal' },
    ],
    fields: [
      {
        name: 'itemId',
        label: 'Barang',
        type: 'number',
        placeholder: 'Pilih barang',
        required: true,
      },
      {
        name: 'movementType',
        label: 'Tipe Pergerakan',
        type: 'select',
        options: [
          { value: 'IN', label: 'Barang Masuk' },
          { value: 'OUT', label: 'Barang Keluar' },
          { value: 'ASSIGN_TO_ROOM', label: 'Pasang ke Kamar' },
          { value: 'RETURN_FROM_ROOM', label: 'Kembali dari Kamar' },
        ],
        required: true,
      },
      {
        name: 'qty',
        label: 'Qty',
        type: 'text',
        placeholder: 'Jumlah barang',
        required: true,
      },
      {
        name: 'roomId',
        label: 'Kamar Terkait',
        type: 'number',
        placeholder: 'Pilih kamar bila applicable',
      },
      {
        name: 'movementDate',
        label: 'Tanggal',
        type: 'date',
        placeholder: 'Tanggal pergerakan',
        required: true,
      },
      {
        name: 'note',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan pergerakan barang',
      },
    ],
  },

  'wifi-sales': {
    title: 'WiFi Sales',
    path: '/wifi-sales',
    allowDelete: true,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'saleDate', label: 'Tanggal' },
      { key: 'customerName', label: 'Customer' },
      { key: 'packageName', label: 'Paket' },
      { key: 'soldPriceRupiah', label: 'Harga' },
    ],
    fields: [
      {
        name: 'saleDate',
        label: 'Tanggal',
        type: 'date',
        placeholder: 'Tanggal penjualan',
        required: true,
      },
      {
        name: 'customerName',
        label: 'Nama Customer',
        type: 'text',
        placeholder: 'Nama customer',
        required: true,
      },
      {
        name: 'packageName',
        label: 'Nama Paket',
        type: 'text',
        placeholder: 'Nama paket WiFi',
        required: true,
      },
      {
        name: 'soldPriceRupiah',
        label: 'Harga',
        type: 'currency',
        placeholder: 'Harga jual dalam Rupiah',
        required: true,
      },
      {
        name: 'note',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan penjualan',
      },
    ],
  },

  expenses: {
    title: 'Expenses',
    supportsIsActiveFilter: true,
    path: '/expenses',
    allowDelete: true,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'expenseDate', label: 'Tanggal' },
      { key: 'type', label: 'Tipe' },
      { key: 'category', label: 'Kategori' },
      { key: 'description', label: 'Deskripsi' },
      { key: 'amountRupiah', label: 'Nominal' },
    ],
    fields: [
      {
        name: 'expenseDate',
        label: 'Tanggal',
        type: 'date',
        placeholder: 'Tanggal pengeluaran',
        required: true,
      },
      {
        name: 'type',
        label: 'Tipe',
        type: 'select',
        options: [
          { value: 'FIXED', label: 'Tetap' },
          { value: 'VARIABLE', label: 'Variabel' },
        ],
        required: true,
      },
      {
        name: 'category',
        label: 'Kategori',
        type: 'select',
        options: [
          { value: 'RENT_BUILDING', label: 'Sewa Bangunan' },
          { value: 'SALARY', label: 'Gaji' },
          { value: 'ELECTRICITY', label: 'Listrik' },
          { value: 'WATER', label: 'Air' },
          { value: 'INTERNET', label: 'Internet' },
          { value: 'MAINTENANCE', label: 'Maintenance' },
          { value: 'CLEANING', label: 'Kebersihan' },
          { value: 'SUPPLIES', label: 'Supplies' },
          { value: 'TAX', label: 'Pajak' },
          { value: 'MARKETING', label: 'Marketing' },
          { value: 'OTHER', label: 'Lainnya' },
        ],
        required: true,
      },
      {
        name: 'description',
        label: 'Deskripsi',
        type: 'text',
        placeholder: 'Deskripsi pengeluaran',
        required: true,
      },
      {
        name: 'amountRupiah',
        label: 'Nominal',
        type: 'currency',
        placeholder: 'Jumlah pengeluaran dalam Rupiah',
        required: true,
      },
      {
        name: 'vendorName',
        label: 'Vendor',
        type: 'text',
        placeholder: 'Nama vendor',
      },
      {
        name: 'roomId',
        label: 'Kamar Terkait',
        type: 'number',
        placeholder: 'Pilih kamar bila applicable',
      },
      {
        name: 'stayId',
        label: 'Stay Terkait',
        type: 'number',
        placeholder: 'Pilih stay bila applicable',
      },
      {
        name: 'note',
        label: 'Catatan',
        type: 'textarea',
        placeholder: 'Catatan pengeluaran',
      },
    ],
  },
};
export type ManageGuardResult = {
  allowed: boolean;
  reason?: string;
};

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

export function canEditResourceItem(
  config: ResourceConfig,
  currentUserRole: string | undefined,
  item: Record<string, unknown>,
): ManageGuardResult {
  if (config.path === '/users' && currentUserRole === 'ADMIN' && item.role === 'OWNER') {
    return {
      allowed: false,
      reason: 'Admin tidak dapat mengedit akun Owner.',
    };
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

  return { allowed: true };
}
