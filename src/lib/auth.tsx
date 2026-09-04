import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  apiFetch,
  clearSession,
  getStoredUser,
  getToken,
  HAS_API,
  saveSession,
  type SessionUser,
} from "./api";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<SessionUser>;
  logout: (reason?: "manual" | "idle" | "expired") => void;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

// Auto-logout after 30 minutes of no activity.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// Fallback admin credentials when no backend is configured.
const MOCK_ADMIN = {
  username: "admin",
  password: "admin1234",
  user: { id: "u-admin", username: "admin", fullName: "مدير الفرع", role: "admin" as const },
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback((reason: "manual" | "idle" | "expired" = "manual") => {
    clearSession();
    setUser(null);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (reason === "idle") {
      toast.message("تم تسجيل الخروج تلقائياً", {
        description: "مرت أكثر من 30 دقيقة دون نشاط. يرجى تسجيل الدخول من جديد.",
      });
    } else if (reason === "expired") {
      toast.message("انتهت الجلسة", { description: "يرجى تسجيل الدخول من جديد." });
    }
  }, []);

  // Verify persisted token with backend on first load (if API is configured).
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      setLoading(false);
      return;
    }
    if (!HAS_API || !getToken()) {
      setUser(stored);
      setLoading(false);
      return;
    }
    apiFetch<{ user: SessionUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => logout("expired"))
      .finally(() => setLoading(false));
  }, [logout]);

  // Inactivity auto-logout: reset a 30-min timer on any user activity.
  useEffect(() => {
    if (!user) return;
    const events = [
      "mousemove", "mousedown", "keydown", "touchstart", "scroll",
    ] as const;
    const reset = () => {
      if (document.visibilityState === "hidden") return;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => logout("idle"), IDLE_TIMEOUT_MS);
    };
    reset();
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, logout]);

  const login = useCallback(async (username: string, password: string) => {
    if (HAS_API) {
      const res = await apiFetch<{ token: string; user: SessionUser }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) },
      );
      saveSession(res.token, res.user);
      setUser(res.user);
      return res.user;
    }
    // Mock mode: admin uses hard-coded creds; instructors/students come from
    // the admin-managed people-store so accounts created by the admin work.
    const uname = username.trim();
    if (uname.toLowerCase() === MOCK_ADMIN.username && password === MOCK_ADMIN.password) {
      saveSession("mock-token", MOCK_ADMIN.user);
      setUser(MOCK_ADMIN.user);
      return MOCK_ADMIN.user;
    }
    const { findPersonByCredentials } = await import("./people-store");
    const person = findPersonByCredentials(uname, password);
    if (!person) {
      throw new Error("بيانات الدخول غير صحيحة");
    }
    const sessionUser: SessionUser = {
      id: person.id,
      username: person.username,
      fullName: person.fullName,
      role: person.role,
    };
    saveSession("mock-token", sessionUser);
    setUser(sessionUser);
    return sessionUser;

  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
