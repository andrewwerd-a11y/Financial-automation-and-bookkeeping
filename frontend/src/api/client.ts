const API = 'http://localhost:4000/api';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
