// Configuración central de conexión al Backend API
// En Vercel usa la variable VITE_API_URL; en PC local usa http://127.0.0.1:8000 automáticamente
const rawBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://127.0.0.1:8000';

export const API_BASE = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
