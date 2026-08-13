import type { ResultRow } from '@/components/library/ResultsTable';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export interface CaseSummary {
  id: string;
  title: string;
  client_name?: string;
  status?: string;
  created_at?: string;
}

export async function fetchCases(): Promise<CaseSummary[]> {
  return request<CaseSummary[]>('/firm/cases');
}

export async function createCase(payload: Partial<CaseSummary>): Promise<CaseSummary> {
  return request<CaseSummary>('/firm/cases', { method: 'POST', body: JSON.stringify(payload) });
}

export interface LibrarySearchResult {
  id: string;
  title: string;
  snippet?: string;
  created_at?: string;
}

export async function searchLibrary(q: string, page = 1): Promise<{ results: LibrarySearchResult[]; total: number }> {
  const params = new URLSearchParams({ q, page: String(page) });
  return request(`/library/search?${params.toString()}`) as Promise<{ results: LibrarySearchResult[]; total: number }>;
}

export async function fetchLawIndex(): Promise<{ id: string; title: string; year?: string }[]> {
  return request('/library/index');
}

export async function postContactRequest(name: string, email: string): Promise<{ ok: boolean }> {
  return request('/contact', { method: 'POST', body: JSON.stringify({ name, email }) });
}

// Fallback helper used by components that still call Supabase directly — keep it here so we can centralize
export async function safeOpenRow(row: ResultRow) {
  // For now this is a no-op wrapper that callers can await and be replaced by real navigation later
  return Promise.resolve(row);
}

export default {
  fetchCases,
  createCase,
  searchLibrary,
  fetchLawIndex,
  postContactRequest,
};
