"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { HookResult } from "../../types.js";

/**
 * Resolve a SoundCloud URL to an API resource.
 *
 * Pass a full SoundCloud URL (e.g. `https://soundcloud.com/deadmau5/strobe`)
 * and get back the resolved API resource (track, user, or playlist object).
 *
 * @param url - A SoundCloud URL to resolve. Pass `undefined` to skip the request.
 * @returns Hook result with the resolved resource as `data`, plus `loading` and `error` states.
 *
 * @example
 * ```tsx
 * import { useResolve } from "soundcloud-api-ts-next";
 *
 * function ResolvedResource({ scUrl }: { scUrl: string }) {
 *   const { data, loading, error } = useResolve(scUrl);
 *   if (loading) return <p>Resolving...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <pre>{JSON.stringify(data, null, 2)}</pre>;
 * }
 * ```
 */
export function useResolve(url: string | undefined): HookResult<any> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (url == null) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${apiPrefix}/resolve?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
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
  }, [url, apiPrefix]);

  return { data, loading, error };
}
