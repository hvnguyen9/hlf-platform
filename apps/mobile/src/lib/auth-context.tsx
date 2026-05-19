import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getApiBaseUrl } from "./config";
import {
  clearSession,
  loadSession,
  saveSession,
  type StoredUser,
} from "./auth-storage";

type AuthState = {
  ready: boolean;
  token: string | null;
  user: StoredUser | null;
};

type AuthContextValue = AuthState & {
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    token: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadSession().then((session) => {
      if (cancelled) return;
      setState({ ready: true, token: session.token, user: session.user });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/mobile/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Sign-in failed (${res.status})`);
    }

    const data = (await res.json()) as { token: string; user: StoredUser };
    await saveSession(data.token, data.user);
    setState({ ready: true, token: data.token, user: data.user });
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setState({ ready: true, token: null, user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
