export interface AuthUser {
  nombre: string;
  correo: string;
  rol: string;
}

const TOKEN_KEY = 'rpa_iep_token';
const USER_KEY = 'rpa_iep_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearSession();
      return false;
    }
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export function getStoredUser(): AuthUser {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthUser;
    }
  } catch {
    // fallback default
  }
  return {
    nombre: 'Administrador',
    correo: 'IEP Augusto Wiese',
    rol: 'Administrador',
  };
}

export function isAdmin(): boolean {
  return isAuthenticated() && getStoredUser().rol === 'Administrador';
}

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
