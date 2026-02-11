import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useMe } from '../../client/hooks/useMe.js';
import { useMeTracks } from '../../client/hooks/useMeTracks.js';
import { useMeLikes } from '../../client/hooks/useMeLikes.js';
import { useMePlaylists } from '../../client/hooks/useMePlaylists.js';
import { useMeFollowings } from '../../client/hooks/useMeFollowings.js';
import { useMeFollowers } from '../../client/hooks/useMeFollowers.js';
import { useAuthFetch } from '../../client/hooks/useAuthFetch.js';
import { type ReactNode } from 'react';

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

// We need a wrapper that can set auth state. We'll use the provider + _setAuth pattern.
// The simplest way is to test useAuthFetch directly with a custom wrapper that simulates auth.

function AuthWrapper({ children }: { children: ReactNode }) {
  return <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>;
}

describe('useAuthFetch', () => {
  it('returns null when not authenticated', () => {
    const { result } = renderHook(() => useAuthFetch('/me'), { wrapper: AuthWrapper });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('ignores AbortError on unmount when authenticated', async () => {
    const { useSCAuth } = await import('../../client/hooks/useSCAuth.js');

    // handleCallback mock
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'u' }),
    });
    // useAuthFetch will make a request that aborts on unmount
    fetchMock.mockImplementationOnce((_url: string, opts: any) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted', 'AbortError'))
        );
      })
    );

    const { result, unmount } = renderHook(() => {
      const auth = useSCAuth();
      const data = useAuthFetch('/me/test');
      return { auth, data };
    }, { wrapper: AuthWrapper });

    await act(async () => {
      await result.current.auth.handleCallback('code', 'state');
    });

    unmount(); // triggers abort
    await new Promise((r) => setTimeout(r, 10));
  });
});

// Test each me hook returns null when unauthenticated
function testMeHook(name: string, hook: () => any) {
  describe(name, () => {
    it('returns null when not authenticated', () => {
      const { result } = renderHook(() => hook(), { wrapper: AuthWrapper });
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
}

testMeHook('useMe', useMe);
testMeHook('useMeTracks', useMeTracks);
testMeHook('useMeLikes', useMeLikes);
testMeHook('useMePlaylists', useMePlaylists);
testMeHook('useMeFollowings', useMeFollowings);
testMeHook('useMeFollowers', useMeFollowers);

// Test useAuthFetch with authenticated state by using the internal _setAuth
describe('useAuthFetch (authenticated)', () => {
  it('fetches when authenticated', async () => {
    // Use useSCAuth to set auth, then useMe will work
    const { useSCAuth } = await import('../../client/hooks/useSCAuth.js');

    // Mock callback + /me fetch after auth + /me fetch from useMe
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok123', refresh_token: 'ref', expires_in: 3600 }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'authed_user' }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'authed_user' }),
    });

    const { result } = renderHook(() => {
      const auth = useSCAuth();
      const me = useMe();
      return { auth, me };
    }, { wrapper: AuthWrapper });

    await act(async () => {
      await result.current.auth.handleCallback('code', 'state');
    });

    await waitFor(() => expect(result.current.me.data).toBeTruthy());
    expect(result.current.me.data?.username).toBe('authed_user');
  });

  it('handles fetch error when authenticated', async () => {
    const { useSCAuth } = await import('../../client/hooks/useSCAuth.js');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'u' }),
    });
    // useMe fetch fails
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => {
      const auth = useSCAuth();
      const me = useMe();
      return { auth, me };
    }, { wrapper: AuthWrapper });

    await act(async () => {
      await result.current.auth.handleCallback('code', 'state');
    });

    await waitFor(() => expect(result.current.me.error).toBeTruthy());
  });

  it('resets data when auth is cleared', async () => {
    const { useSCAuth } = await import('../../client/hooks/useSCAuth.js');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'u' }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'u' }),
    });

    const { result } = renderHook(() => {
      const auth = useSCAuth();
      const me = useMe();
      return { auth, me };
    }, { wrapper: AuthWrapper });

    await act(async () => {
      await result.current.auth.handleCallback('code', 'state');
    });
    await waitFor(() => expect(result.current.me.data).toBeTruthy());

    // Logout
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.auth.logout(); });
    await waitFor(() => expect(result.current.me.data).toBeNull());
  });
});
