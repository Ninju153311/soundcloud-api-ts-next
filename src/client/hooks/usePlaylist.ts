"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

export function usePlaylist(
  playlistId: string | number | undefined,
): HookResult<SoundCloudPlaylist> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudPlaylist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (playlistId == null) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${apiPrefix}/playlists/${playlistId}`, { signal: controller.signal })
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
  }, [playlistId, apiPrefix]);

  return { data, loading, error };
}
