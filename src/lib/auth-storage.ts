export const AUTH_USER_KEY = 'missao_user';
export const AUTH_TOKEN_KEY = 'missao_auth_token';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUserRaw(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_USER_KEY);
}

export function setStoredSession(user: unknown, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
