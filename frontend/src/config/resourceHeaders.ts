// Mapping resource → header kontekstual untuk SimpleCrudPage / ConfiguredResourcePage
// Key = nama resource tanpa leading slash (sama dengan kunci di resourceConfigs)
export const resourceHeaders: Record<string, { title: string; subtitle: string }> = {
  users: { title: 'Akun Pengguna', subtitle: 'Kelola akun owner, admin, staf, dan penghuni.' },
  tenants: { title: 'Data Penghuni', subtitle: 'Verifikasi KTP, data diri, dan riwayat penghuni.' },
  announcements: { title: 'Pengumuman', subtitle: 'Buat dan kelola pengumuman untuk penghuni dan staf.' },
  expenses: { title: 'Pengeluaran', subtitle: 'Catat dan pantau biaya operasional kos.' },
  'wifi-sales': { title: 'Penjualan WiFi', subtitle: 'Kelola pesanan WiFi tenant.' },
  additionalServices: { title: 'Layanan Tambahan', subtitle: 'Atur layanan tambahan yang bisa dipesan tenant.' },
  'invoice-payments': { title: 'Pembayaran Manual', subtitle: 'Catat pembayaran invoice secara manual.' },
  'inventory-items': { title: 'Stok Barang', subtitle: 'Kelola barang di gudang.' },
  'room-items': { title: 'Inventaris Kamar', subtitle: 'Kelola barang yang ada di setiap kamar.' },
  'inventory-movements': { title: 'Mutasi Stok', subtitle: 'Catat barang masuk, keluar, dan pindah kamar.' },
};
