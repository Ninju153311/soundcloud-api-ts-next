"use client";

import { useState, useCallback } from "react";
import { useSoundCloudContext } from "../provider.js";

/** Hook for follow/unfollow actions. Requires authentication. */
export function useFollow() {
  const { apiPrefix, accessToken } = useSoundCloudContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const follow = useCallback(
    async (userId: string | number) => {
      if (!accessToken) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPrefix}/me/follow/${userId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiPrefix, accessToken],
  );

  const unfollow = useCallback(
    async (userId: string | number) => {
      if (!accessToken) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPrefix}/me/follow/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiPrefix, accessToken],
  );

  return { follow, unfollow, loading, error };
}
