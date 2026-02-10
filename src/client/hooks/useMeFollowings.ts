"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/** Fetch who the current authenticated user follows. */
export function useMeFollowings(): HookResult<SoundCloudUser[]> {
  return useAuthFetch<SoundCloudUser[]>("/me/followings");
}
