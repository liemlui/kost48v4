import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

function clearAuthAndRedirect() {
  localStorage.removeItem('kost48_access_token');

  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    window.location.assign('/login');
  }
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('kost48_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
