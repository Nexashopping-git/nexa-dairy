const API_BASE = (import.meta.env?.VITE_API_URL || "http://localhost:8787").replace(/\/$/, "");

export type DiaryRole = "CUSTOMER" | "DISTRIBUTOR";
export type Account = {
  id: string;
  name: string | null;
  phone: string | null;
  role: string;
  status: string;
};
export type Session = { token: string; expiresAt: string; account: Account };
export type Summary = {
  account: Account;
  approvedTotal: string;
  currency: "INR";
  approvedEntryCount: number;
  plan: { monthlyReferenceAmount: string; durationMonths: number; currency: "INR"; description: string };
};
export type Entry = {
  id: string;
  referenceCode: string;
  amount: string;
  currency: "INR";
  cashReceivedAt: string;
  approvedAt: string;
  notes: string | null;
};
export type EntryPage = { entries: Entry[]; meta: { page: number; limit: number; total: number; totalPages: number } };

const SESSION_KEY = "nexa-diary-session";

type Envelope<T> = { success: true; data: T; meta?: EntryPage["meta"] };

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<Envelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Sign in again.");
    if (response.status === 429) throw new Error("Too many attempts. Please wait and try again.");
    let message = "The request could not be completed. Please try again.";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch { /* keep the readable fallback */ }
    throw new Error(message);
  }
  return (await response.json()) as Envelope<T>;
}

export async function requestCode(phone: string, role: DiaryRole): Promise<void> {
  await request("/api/v1/auth/diary/otp/request", { method: "POST", body: JSON.stringify({ phone, role }) });
}

export async function verifyCode(phone: string, role: DiaryRole, otp: string): Promise<Session> {
  const response = await request<Session>("/api/v1/auth/diary/otp/verify", { method: "POST", body: JSON.stringify({ phone, role, otp }) });
  return response.data;
}

export async function currentAccount(token: string): Promise<Account> {
  const response = await request<{ account: Account }>("/api/v1/auth/me", {}, token);
  return response.data.account;
}

export async function getSummary(token: string): Promise<Summary> {
  const response = await request<Summary>("/api/v1/diary/me/summary", {}, token);
  return response.data;
}

export async function getEntries(token: string, page: number): Promise<EntryPage> {
  const response = await request<{ entries: Entry[] }>(`/api/v1/diary/me/entries?page=${page}&limit=20`, {}, token);
  return { entries: response.data.entries, meta: response.meta ?? { page, limit: 20, total: response.data.entries.length, totalPages: page } };
}

export async function logout(token: string): Promise<void> {
  await request("/api/v1/auth/logout", { method: "POST" }, token);
}

export function readSession(): Session | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as Session;
    if (!session.token || Date.parse(session.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
