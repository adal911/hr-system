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
import { User, AuthResponse, LicenseState, Company } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  license: LicenseState | null;
  company: Company | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (companyName: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshLicense: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "hr_token";

interface SignupResponse extends AuthResponse {
  company: Company;
  license: LicenseState;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
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
    setLicense(null);
    setCompany(null);
  };

  const fetchUser = useCallback(async (t: string) => {
    try {
      const data = await api.get<User>("/auth/me/", t);
      setUser(data);
      setToken(t);
      if (data.company) setCompany(data.company);
      if (data.license) setLicense(data.license);
    } catch {
      clearToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshLicense = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<{ company: Company; license: LicenseState }>(
        "/billing/license/",
        token
      );
      setLicense(data.license);
      setCompany(data.company);
    } catch {
      // silent
    }
  }, [token]);

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
    // After login, fetch license info from /me
    await fetchUser(data.token);
  };

  const signup = async (
    companyName: string,
    username: string,
    password: string
  ) => {
    const data = await api.post<SignupResponse>("/auth/signup/", {
      company_name: companyName,
      username,
      password,
    });
    saveToken(data.token);
    setUser(data.user);
    setCompany(data.company);
    setLicense(data.license);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        license,
        company,
        login,
        signup,
        logout: clearToken,
        refreshLicense,
        isLoading,
      }}
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
