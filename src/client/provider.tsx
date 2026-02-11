"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { SoundCloudUser } from "soundcloud-api-ts";

/**
 * Internal context value shape for the SoundCloud provider.
 *
 * @see {@link SoundCloudProvider} for setting up the context
 * @see {@link useSoundCloudContext} for accessing the context
 */
export interface SoundCloudContextValue {
  /** API route prefix used for all fetch calls (e.g. `"/api/soundcloud"`). */
  apiPrefix: string;
  /** The authenticated user's profile, or `null`. */
  user: SoundCloudUser | null;
  /** Current OAuth access token, or `null`. */
  accessToken: string | null;
  /** Whether the user is fully authenticated (has token + profile). */
  isAuthenticated: boolean;
  /** `true` while the user profile is being loaded after token set. */
  authLoading: boolean;
  /** Initiate OAuth login — redirects to SoundCloud authorization page. */
  login: () => void;
  /** Log out and clear all auth state. */
  logout: () => Promise<void>;
  /** @internal Called by callback handler to set auth tokens. */
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

/**
 * Props for the {@link SoundCloudProvider} component.
 */
export interface SoundCloudProviderProps {
  /** API route prefix — must match your server route mount point. Default: `"/api/soundcloud"`. */
  apiPrefix?: string;
  /** React children to render inside the provider. */
  children: ReactNode;
}

/**
 * Provide SoundCloud API context to your React tree.
 *
 * Wrap your app (or a subtree) with this provider to enable all SoundCloud hooks.
 * Manages authentication state and provides the API prefix for route resolution.
 *
 * @param props - Provider props including optional `apiPrefix` and `children`.
 * @returns A React context provider element.
 *
 * @example
 * ```tsx
 * import { SoundCloudProvider } from "soundcloud-api-ts-next";
 *
 * export default function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SoundCloudProvider apiPrefix="/api/soundcloud">
 *       {children}
 *     </SoundCloudProvider>
 *   );
 * }
 * ```
 *
 * @see {@link useSCAuth} for authentication actions
 * @see {@link useTrack} and other hooks that depend on this provider
 */
export function SoundCloudProvider({
  apiPrefix = "/api/soundcloud",
  children,
}: SoundCloudProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [_refreshToken, setRefreshToken] = useState<string | null>(null);
  const [_expiresAt, setExpiresAt] = useState<number | null>(null);
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

/**
 * Access the SoundCloud context value (API prefix, auth state, login/logout).
 *
 * Must be called within a {@link SoundCloudProvider}. Prefer using higher-level hooks
 * like {@link useSCAuth} for auth or data hooks like {@link useTrack} for fetching.
 *
 * @returns The current {@link SoundCloudContextValue}.
 *
 * @example
 * ```tsx
 * import { useSoundCloudContext } from "soundcloud-api-ts-next";
 *
 * function DebugPanel() {
 *   const { apiPrefix, isAuthenticated } = useSoundCloudContext();
 *   return <pre>API: {apiPrefix}, Auth: {String(isAuthenticated)}</pre>;
 * }
 * ```
 *
 * @see {@link SoundCloudProvider}
 * @see {@link useSCAuth} for a friendlier auth hook
 */
export function useSoundCloudContext(): SoundCloudContextValue {
  return useContext(SoundCloudContext);
}
