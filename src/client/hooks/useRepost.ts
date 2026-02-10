"use client";

import { useState, useCallback } from "react";
import { useSoundCloudContext } from "../provider.js";

/** Hook for repost/unrepost track actions. Requires authentication. */
export function useRepost() {
  const { apiPrefix, accessToken } = useSoundCloudContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const repostTrack = useCallback(
    async (trackId: string | number) => {
      if (!accessToken) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPrefix}/tracks/${trackId}/repost`, {
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

  const unrepostTrack = useCallback(
    async (trackId: string | number) => {
      if (!accessToken) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPrefix}/tracks/${trackId}/repost`, {
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

  return { repostTrack, unrepostTrack, loading, error };
}
