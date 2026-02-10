"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/** Fetch the current authenticated user's followers. */
export function useMeFollowers(): HookResult<SoundCloudUser[]> {
  return useAuthFetch<SoundCloudUser[]>("/me/followers");
}
