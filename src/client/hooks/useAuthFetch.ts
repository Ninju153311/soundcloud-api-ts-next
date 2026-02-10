"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { HookResult } from "../../types.js";

/**
 * Internal hook for fetching authenticated endpoints.
 * Only fetches when user is authenticated.
 */
export function useAuthFetch<T>(path: string): HookResult<T> {
  const { apiPrefix, accessToken, isAuthenticated } = useSoundCloudContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${apiPrefix}${path}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [path, apiPrefix, accessToken, isAuthenticated]);

  return { data, loading, error };
}
