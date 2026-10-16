"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getSession,
  signIn as signInData,
  signOut as signOutData,
  type User,
} from "@/app/data/session";

type SessionContextValue = {
  user: User | null;
  signIn: (user: User | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // La sesión se lee después de montar: el servidor no conoce localStorage.
  useEffect(() => {
    let active = true;
    getSession().then((u) => {
      if (active) setUser(u);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (next: User | null) => {
    await signInData(next);
    setUser(next);
  }, []);

  const signOut = useCallback(async () => {
    await signOutData();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
