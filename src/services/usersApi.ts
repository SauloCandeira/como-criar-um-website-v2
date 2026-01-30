const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type PermissionLevel = 'A' | 'B' | 'C';

export interface UserDTO {
  id: string;
  authUid?: string;
  name?: string;
  email: string;
  photoUrl?: string;
  authProvider?: string;
  permissionLevel?: PermissionLevel;
  status?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

const normalizeUser = (user: any): UserDTO => ({
  id: user.id,
  authUid: user.authUid ?? user.auth_uid ?? '',
  name: user.name ?? '',
  email: user.email ?? '',
  photoUrl: user.photoUrl ?? user.photo_url ?? '',
  authProvider: user.authProvider ?? user.auth_provider ?? '',
  permissionLevel: (user.permissionLevel ?? user.permission_level ?? 'A') as PermissionLevel,
  status: user.status ?? 'Ativo',
  createdAt: user.createdAt ?? user.created_at ?? '',
  lastLoginAt: user.lastLoginAt ?? user.last_login_at ?? '',
});

export async function fetchUsers(): Promise<UserDTO[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Falha ao carregar usuários');
  const data = await res.json();
  return data.map(normalizeUser);
}

export async function fetchUserByEmail(email: string): Promise<UserDTO | null> {
  if (!email) return null;
  const res = await fetch(`${API_BASE}/users/lookup?email=${encodeURIComponent(email)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Falha ao carregar usuário');
  const data = await res.json();
  return normalizeUser(data);
}

export async function upsertUser(payload: {
  authUid?: string;
  name?: string;
  email: string;
  photoUrl?: string;
  authProvider?: string;
  permissionLevel?: PermissionLevel;
  status?: string;
}): Promise<UserDTO> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao salvar usuário');
  const data = await res.json();
  return normalizeUser(data);
}

export async function updateUser(id: string, payload: Partial<UserDTO>): Promise<UserDTO> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao atualizar usuário');
  const data = await res.json();
  return normalizeUser(data);
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Falha ao excluir usuário');
}
