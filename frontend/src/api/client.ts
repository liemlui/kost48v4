import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

function clearAuthAndRedirect() {
  localStorage.removeItem('kost48_access_token');
  sessionStorage.removeItem('kost48_last_authenticated_user');

  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    window.location.assign('/login');
  }
}

client.interceptors.request.use((config) => {
  const method = String(config.method ?? 'get').toLowerCase();
  const isReadOnly = ['get', 'head', 'options'].includes(method);
  if (typeof navigator !== 'undefined' && !navigator.onLine && !isReadOnly) {
    throw new axios.AxiosError(
      'Tidak ada koneksi. Data belum dikirim untuk mencegah transaksi ganda.',
      'ERR_NETWORK_OFFLINE',
      config,
    );
  }

  const token = localStorage.getItem('kost48_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // OWN-BACKEND-MODE: kirim mode tampilan owner (owner/admin) untuk audit log/guard backend.
  const ownerViewMode = localStorage.getItem('kost48_owner_view_mode');
  if (ownerViewMode === 'owner' || ownerViewMode === 'admin') {
    config.headers['X-Owner-View-Mode'] = ownerViewMode;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hasToken = Boolean(localStorage.getItem('kost48_access_token'));
    const requestUrl = String(error?.config?.url ?? '');
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (status === 401 && hasToken && !isLoginRequest) {
      clearAuthAndRedirect();
    }

    return Promise.reject(error);
  },
);

export default client;
