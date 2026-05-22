import StaffGeneralInventorySection from '../../components/staff/StaffGeneralInventorySection';

export default function StaffWarehousePage() {
  return (
    <div className="staff-page-simple staff-warehouse-page">
      <section className="staff-simple-hero compact">
        <span className="staff-hero-pill">Gudang</span>
        <h1>Barang Umum & Gudang</h1>
        <p>Status stok seperti habis dan menipis dihitung otomatis dari jumlah barang. Staff cukup lapor masalah fisik, selisih jumlah, atau kebutuhan restock agar admin/owner bisa mengambil keputusan resmi.</p>
      </section>

      <StaffGeneralInventorySection embedded />
    </div>
  );
}
