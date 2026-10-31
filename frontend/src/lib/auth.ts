const TOKEN_KEY = 'ares_admin_token';
const USER_KEY = 'ares_admin_user';

export interface AdminUser {
  username: string;
  role: string;
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminSession(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ username, role: 'admin' }));
}

export function removeAdminSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAdminUser(): AdminUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  if (!token) return false;
  
  // Basic client-side expiration check
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        removeAdminSession();
        return false;
      }
    }
  } catch {
    // If parsing fails, token will be validated on backend
  }
  
  return true;
}

export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { success: false, error: data.detail || 'Authentication failed. Please verify credentials.' };
    }

    const data = await resp.json();
    setAdminSession(data.access_token, data.username);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Connection to authentication service failed.' };
  }
}
