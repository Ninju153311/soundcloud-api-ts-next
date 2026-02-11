import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useUser } from '../../client/hooks/useUser.js';
import { useUserSearch } from '../../client/hooks/useUserSearch.js';
import { useUserTracks } from '../../client/hooks/useUserTracks.js';
import { useUserPlaylists } from '../../client/hooks/useUserPlaylists.js';
import { useUserLikes } from '../../client/hooks/useUserLikes.js';
import { useUserFollowers } from '../../client/hooks/useUserFollowers.js';
import { useUserFollowings } from '../../client/hooks/useUserFollowings.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

function mockAbortable() {
  fetchMock.mockImplementationOnce((_url: string, opts: any) =>
    new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted', 'AbortError'))
      );
    })
  );
}

function mockOk(data: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
}
function mockFail(s: number) {
  fetchMock.mockResolvedValueOnce({ ok: false, status: s, json: async () => ({}) });
}

// Helper to test a standard ID-based collection hook
function testCollectionHook(name: string, hook: (id: any) => any, _endpoint: string) {
  describe(name, () => {
    it('fetches data', async () => {
      mockOk({ collection: [{ id: 1 }] });
      const { result } = renderHook(() => hook(1), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });
    it('skips when undefined', () => {
      const { result } = renderHook(() => hook(undefined), { wrapper });
      expect(result.current.data).toBeNull();
    });
    it('handles error', async () => {
      mockFail(500);
      const { result } = renderHook(() => hook(1), { wrapper });
      await waitFor(() => expect(result.current.error).toBeTruthy());
    });
    it('handles array response', async () => {
      mockOk([{ id: 1 }]);
      const { result } = renderHook(() => hook(1), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });
    it('ignores AbortError on unmount', async () => {
      mockAbortable();
      const { unmount } = renderHook(() => hook(1), { wrapper });
      unmount();
      await new Promise((r) => setTimeout(r, 10));
    });
  });
}

// ── useUser ──
describe('useUser', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useUser(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches user', async () => {
    mockOk({ id: 1, username: 'u' });
    const { result } = renderHook(() => useUser(1), { wrapper });
    await waitFor(() => expect(result.current.data?.username).toBe('u'));
  });
  it('skips when undefined', () => {
    const { result } = renderHook(() => useUser(undefined), { wrapper });
    expect(result.current.data).toBeNull();
  });
  it('handles error', async () => {
    mockFail(404);
    const { result } = renderHook(() => useUser(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it('resets on undefined', async () => {
    mockOk({ id: 1, username: 'u' });
    const { result, rerender } = renderHook(({ id }) => useUser(id), {
      wrapper, initialProps: { id: 1 as number | undefined },
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    rerender({ id: undefined });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

// ── useUserSearch ──
describe('useUserSearch', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useUserSearch('q'), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches results', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result } = renderHook(() => useUserSearch('q'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
  it('skips empty query', () => {
    const { result } = renderHook(() => useUserSearch(''), { wrapper });
    expect(result.current.data).toBeNull();
  });
  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => useUserSearch('q'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it('handles array response', async () => {
    mockOk([{ id: 1 }]);
    const { result } = renderHook(() => useUserSearch('q'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
  it('resets when query becomes empty', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result, rerender } = renderHook(({ q }) => useUserSearch(q), {
      wrapper, initialProps: { q: 'test' },
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    rerender({ q: '' });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

testCollectionHook('useUserTracks', useUserTracks, '/users/1/tracks');
testCollectionHook('useUserPlaylists', useUserPlaylists, '/users/1/playlists');
testCollectionHook('useUserLikes', useUserLikes, '/users/1/likes/tracks');
testCollectionHook('useUserFollowers', useUserFollowers, '/users/1/followers');
testCollectionHook('useUserFollowings', useUserFollowings, '/users/1/followings');
