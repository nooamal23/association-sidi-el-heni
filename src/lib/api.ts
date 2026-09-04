// Tiny API client. Set VITE_API_URL in .env to point at the Express backend.
// When unset, the admin space falls back to a local mock so the UI is browsable.

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
export const HAS_API = API_URL.length > 0;

const TOKEN_KEY = "sh_token";
const USER_KEY = "sh_user";
const FINANCE_TOKEN_KEY = "sh_finance_token";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "instructor" | "student";
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}

export function saveSession(token: string, user: SessionUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(FINANCE_TOKEN_KEY);
}

// --- Finance second-factor token (scoped, short-lived, server-issued) ---
export function getFinanceToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(FINANCE_TOKEN_KEY);
}
export function saveFinanceToken(token: string) {
  window.localStorage.setItem(FINANCE_TOKEN_KEY, token);
}
export function clearFinanceToken() {
  window.localStorage.removeItem(FINANCE_TOKEN_KEY);
}

export class FinanceLockedError extends Error {
  constructor() { super("Finance module locked"); this.name = "FinanceLockedError"; }
}

export class ApiError extends Error {
  status: number;
  /** Parsed JSON error body, when the server sent one (e.g. { code, conflicts }). */
  body?: Record<string, unknown>;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --- Part 28/5b: graceful session expiry -------------------------------------
// A 401 must never destroy in-progress form data. We broadcast an event and a
// re-auth dialog lets the admin sign back in without leaving the page.
export const SESSION_EXPIRED_EVENT = "sh:session-expired";

let sessionExpiredNotified = false;

export function notifySessionExpired() {
  if (typeof window === "undefined" || sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function resetSessionExpiredFlag() {
  sessionExpiredNotified = false;
}

/** Replace the stored token in place, keeping the current user session. */
export function updateToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Always attach the finance token when we have one; the backend only checks
  // it on /finance* routes. Harmless elsewhere.
  const financeToken = getFinanceToken();
  if (financeToken) headers.set("X-Finance-Token", financeToken);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  // Sliding expiration: the backend re-issues a fresh token on every
  // authenticated request — swap it in transparently.
  const refreshed = res.headers.get("X-Refresh-Token");
  if (refreshed) {
    updateToken(refreshed);
    resetSessionExpiredFlag();
  }
  if (!res.ok) {
    if (res.status === 423) {
      clearFinanceToken();
      throw new FinanceLockedError();
    }
    let msg = `HTTP ${res.status}`;
    let body: Record<string, unknown> | undefined;
    try {
      body = (await res.json()) as Record<string, unknown>;
      msg = (body?.error as string) || msg;
    } catch { /* non-JSON error body */ }
    if (res.status === 401 && token) notifySessionExpired();
    const err = new ApiError(msg, res.status);
    err.body = body;
    throw err;
  }
  return res.json() as Promise<T>;
}

