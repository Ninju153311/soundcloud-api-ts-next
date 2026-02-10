"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { SoundCloudUser } from "soundcloud-api-ts";

export interface SoundCloudContextValue {
  apiPrefix: string;
  // Auth state
  user: SoundCloudUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  /** @internal Called by callback handler to set auth tokens */
  _setAuth: (auth: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
}

const SoundCloudContext = createContext<SoundCloudContextValue>({
  apiPrefix: "/api/soundcloud",
  user: null,
  accessToken: null,
  isAuthenticated: false,
  authLoading: false,
  login: () => {},
  logout: async () => {},
  _setAuth: () => {},
});

export interface SoundCloudProviderProps {
  /** API route prefix (default: "/api/soundcloud") */
  apiPrefix?: string;
  children: ReactNode;
}

export function SoundCloudProvider({
  apiPrefix = "/api/soundcloud",
  children,
}: SoundCloudProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [user, setUser] = useState<SoundCloudUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const _setAuth = useCallback(
    (auth: { accessToken: string; refreshToken: string; expiresIn: number }) => {
      setAccessToken(auth.accessToken);
      setRefreshToken(auth.refreshToken);
      setExpiresAt(Date.now() + auth.expiresIn * 1000);
    },
    [],
  );

  // Fetch user profile when accessToken is set
  useEffect(() => {
    if (!accessToken) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    fetch(`${apiPrefix}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, apiPrefix]);

  const login = useCallback(() => {
    fetch(`${apiPrefix}/auth/login`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url;
        }
      })
      .catch(console.error);
  }, [apiPrefix]);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await fetch(`${apiPrefix}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        });
      }
    } catch {
      // best effort
    }
    setAccessToken(null);
    setRefreshToken(null);
    setExpiresAt(null);
    setUser(null);
  }, [accessToken, apiPrefix]);

  const isAuthenticated = accessToken !== null && user !== null;

  return (
    <SoundCloudContext.Provider
      value={{
        apiPrefix,
        user,
        accessToken,
        isAuthenticated,
        authLoading,
        login,
        logout,
        _setAuth,
      }}
    >
      {children}
    </SoundCloudContext.Provider>
  );
}

export function useSoundCloudContext(): SoundCloudContextValue {
  return useContext(SoundCloudContext);
}
