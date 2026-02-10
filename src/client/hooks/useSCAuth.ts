"use client";

import { useSoundCloudContext } from "../provider.js";

/**
 * Hook for SoundCloud OAuth authentication state and actions.
 */
export function useSCAuth() {
  const { user, isAuthenticated, authLoading, login, logout, _setAuth, apiPrefix } =
    useSoundCloudContext();

  return {
    user,
    isAuthenticated,
    loading: authLoading,
    login,
    logout,
    /** Handle OAuth callback — exchange code for tokens */
    async handleCallback(code: string, state: string) {
      const res = await fetch(`${apiPrefix}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
      if (!res.ok) throw new Error(`Auth callback failed: ${res.status}`);
      const tokens = await res.json();
      _setAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });
      return tokens;
    },
  };
}
