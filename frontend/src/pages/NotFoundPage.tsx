import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRoute } from '../config/navigation';

export default function NotFoundPage() {
  const { user } = useAuth();
  const homeLink = user ? getDefaultRoute(user.role) : '/rooms';

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <div className="text-center" style={{ maxWidth: 480 }}>
        <div className="display-1 fw-bold text-muted mb-3">404</div>
        <h1 className="h4 mb-2">Halaman tidak ditemukan</h1>
        <p className="text-muted mb-4">
          Alamat yang kamu tuju tidak ada atau sudah dipindahkan.
          Gunakan menu navigasi atau tombol di bawah untuk kembali.
        </p>
        <Link to={homeLink} className="btn btn-primary">
          {user ? 'Kembali ke Dashboard' : 'Lihat Katalog Kamar'}
        </Link>
      </div>
    </div>
  );
}
