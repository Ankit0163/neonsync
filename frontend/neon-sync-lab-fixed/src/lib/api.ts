// ── All REST calls to Spring Boot backend ────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AuthUser {
  token: string;
  username: string;
  email: string;
  color: string;
}

export interface RoomData {
  roomId: string;
  name: string;
  code: string;
  ownerUsername: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('neonsync_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function apiRegister(
  username: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const user = await handleResponse<AuthUser>(res);
  localStorage.setItem('neonsync_token', user.token);
  localStorage.setItem('neonsync_user', JSON.stringify(user));
  return user;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const user = await handleResponse<AuthUser>(res);
  localStorage.setItem('neonsync_token', user.token);
  localStorage.setItem('neonsync_user', JSON.stringify(user));
  return user;
}

export function apiLogout(): void {
  localStorage.removeItem('neonsync_token');
  localStorage.removeItem('neonsync_user');
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('neonsync_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

// ── Rooms ────────────────────────────────────────────────────────────────────

export async function apiCreateRoom(name: string, roomId?: string): Promise<RoomData> {
  const res = await fetch(`${BASE_URL}/api/rooms/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, roomId }),
  });
  return handleResponse<RoomData>(res);
}

export async function apiJoinRoom(roomId: string): Promise<RoomData> {
  const res = await fetch(`${BASE_URL}/api/rooms/join/${roomId}`, {
    headers: authHeaders(),
  });
  return handleResponse<RoomData>(res);
}
