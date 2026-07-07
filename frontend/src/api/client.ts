import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
  // P3-01: Kirim cookie (refresh token) pada semua request ke /api/auth/*
  withCredentials: true,
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

// P3-01: refresh token state — cegah multiple refresh bersamaan
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(token: string | null, error: unknown | null) {
  failedQueue.forEach((p) => {
    if (token) {
      p.resolve(token);
    } else {
      p.reject(error);
    }
  });
  failedQueue = [];
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
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const hasToken = Boolean(localStorage.getItem('kost48_access_token'));
    const requestUrl = String(originalRequest?.url ?? '');
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    // P3-01: Jika 401 dan ada token dan bukan dari auth endpoint → coba refresh
    if (status === 401 && hasToken && !isAuthRequest) {
      if (isRefreshing) {
        // Request lain sedang refresh — antri
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Panggil refresh endpoint — httpOnly cookie dikirim otomatis
        const refreshResp = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const { accessToken } = refreshResp.data.data;
        localStorage.setItem('kost48_access_token', accessToken);

        // Proses antrian
        processQueue(accessToken, null);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(null, refreshError);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Timeout atau server tidak merespons → pesan yang bisa dibaca
    if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
      error.response = error.response ?? {};
      error.response.data = {
        message: 'Server tidak merespons. Pastikan backend sudah berjalan dan coba lagi.',
      };
    }

    return Promise.reject(error);
  },
);

export default client;
