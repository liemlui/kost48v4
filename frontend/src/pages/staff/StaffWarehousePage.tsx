import '../../styles/staff-area';
import StaffGeneralInventorySection from '../../components/staff/StaffGeneralInventorySection';

export default function StaffWarehousePage() {
  return (
    <div className="staff-page-simple staff-warehouse-page">
      <section className="staff-simple-hero compact">
        <span className="staff-hero-pill">Gudang</span>
        <h1>Barang Umum & Gudang</h1>
        <p>Cek stok, kondisi fisik, dan kebutuhan restock dari satu tempat. Kirim laporan singkat bila ada selisih atau barang perlu diganti.</p>
      </section>

      <div className="staff-warehouse-rule-strip" aria-label="Panduan gudang">
        <span><strong>Laporkan kondisi</strong><small>foto, catatan lapangan, selisih fisik, atau kebutuhan restock</small></span>
        <span><strong>Stok terbaca</strong><small>habis/menipis dari jumlah barang dan minimal stok</small></span>
        <span><strong>Tindak lanjut</strong><small>laporkan ke admin, tunggu keputusan, atau konfirmasi penggantian</small></span>
      </div>

      <StaffGeneralInventorySection embedded />
    </div>
  );
}
