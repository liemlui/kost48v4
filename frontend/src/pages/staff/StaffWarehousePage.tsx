import StaffGeneralInventorySection from '../../components/staff/StaffGeneralInventorySection';

export default function StaffWarehousePage() {
  return (
    <div className="staff-page-simple staff-warehouse-page">
      <section className="staff-simple-hero compact">
        <span className="staff-hero-pill">Gudang</span>
        <h1>Barang Umum & Gudang</h1>
        <p>Laporkan kondisi stok kebersihan, alat kerja, dan barang area umum. Jumlah stok resmi, mutasi barang, dan status final tetap dikonfirmasi admin/owner.</p>
      </section>

      <StaffGeneralInventorySection embedded />
    </div>
  );
}
