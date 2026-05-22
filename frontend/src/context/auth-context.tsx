"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { User, AuthResponse } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "hr_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveToken = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    document.cookie = `${TOKEN_KEY}=${t};path=/;samesite=lax`;
    setToken(t);
  };

  const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setToken(null);
    setUser(null);
  };

  const fetchUser = useCallback(async (t: string) => {
    try {
      const data = await api.get<User>("/auth/me/", t);
      setUser(data);
      setToken(t);
    } catch {
      clearToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      fetchUser(stored);
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (username: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login/", {
      username,
      password,
    });
    saveToken(data.token);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout: clearToken, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
