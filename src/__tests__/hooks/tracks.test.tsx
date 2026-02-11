import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useTrack } from '../../client/hooks/useTrack.js';
import { useTrackSearch } from '../../client/hooks/useTrackSearch.js';
import { useTrackComments } from '../../client/hooks/useTrackComments.js';
import { useTrackLikes } from '../../client/hooks/useTrackLikes.js';
import { useRelatedTracks } from '../../client/hooks/useRelatedTracks.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

function mockAbortable() {
  fetchMock.mockImplementationOnce((_url: string, opts: any) =>
    new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted', 'AbortError'))
      );
    })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

function mockOk(data: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
}

function mockFail(status: number) {
  fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });
}

// ── useTrack ──

describe('useTrack', () => {
  it('fetches track data', async () => {
    mockOk({ id: 1, title: 'T' });
    const { result } = renderHook(() => useTrack(1), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data?.title).toBe('T'));
    expect(result.current.loading).toBe(false);
  });

  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => useTrack(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toContain('500');
  });

  it('skips when undefined', () => {
    const { result } = renderHook(() => useTrack(undefined), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts on unmount', () => {
    mockOk({ id: 1 });
    const { unmount } = renderHook(() => useTrack(1), { wrapper });
    unmount();
    // No assertion needed — just verifying no error thrown
  });

  it('ignores AbortError on unmount during fetch', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useTrack(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('re-fetches on ID change', async () => {
    mockOk({ id: 1, title: 'A' });
    const { result, rerender } = renderHook(({ id }) => useTrack(id), {
      wrapper,
      initialProps: { id: 1 as number | undefined },
    });
    await waitFor(() => expect(result.current.data?.title).toBe('A'));
    mockOk({ id: 2, title: 'B' });
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data?.title).toBe('B'));
  });

  it('resets data when id becomes undefined', async () => {
    mockOk({ id: 1, title: 'A' });
    const { result, rerender } = renderHook(({ id }) => useTrack(id), {
      wrapper,
      initialProps: { id: 1 as number | undefined },
    });
    await waitFor(() => expect(result.current.data?.title).toBe('A'));
    rerender({ id: undefined });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

// ── useTrackSearch ──

describe('useTrackSearch', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useTrackSearch('test'), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches search results', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result } = renderHook(() => useTrackSearch('test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('handles array response (no collection wrapper)', async () => {
    mockOk([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useTrackSearch('test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });

  it('skips when query is empty', () => {
    const { result } = renderHook(() => useTrackSearch(''), { wrapper });
    expect(result.current.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes limit option', async () => {
    mockOk({ collection: [] });
    renderHook(() => useTrackSearch('q', { limit: 5 }), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain('limit=5');
  });

  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => useTrackSearch('test'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('resets data when query becomes empty', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result, rerender } = renderHook(({ q }) => useTrackSearch(q), {
      wrapper,
      initialProps: { q: 'test' },
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    rerender({ q: '' });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

// ── useTrackComments ──

describe('useTrackComments', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useTrackComments(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches comments', async () => {
    mockOk({ collection: [{ id: 1, body: 'hi' }] });
    const { result } = renderHook(() => useTrackComments(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('skips when undefined', () => {
    const { result } = renderHook(() => useTrackComments(undefined), { wrapper });
    expect(result.current.data).toBeNull();
  });

  it('handles error', async () => {
    mockFail(404);
    const { result } = renderHook(() => useTrackComments(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('handles array response', async () => {
    mockOk([{ id: 1 }]);
    const { result } = renderHook(() => useTrackComments(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});

// ── useTrackLikes ──

describe('useTrackLikes', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useTrackLikes(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('handles array response (no collection)', async () => {
    mockOk([{ id: 1, username: 'u' }]);
    const { result } = renderHook(() => useTrackLikes(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('fetches likers', async () => {
    mockOk({ collection: [{ id: 1, username: 'u' }] });
    const { result } = renderHook(() => useTrackLikes(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('skips when undefined', () => {
    const { result } = renderHook(() => useTrackLikes(undefined), { wrapper });
    expect(result.current.data).toBeNull();
  });

  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => useTrackLikes(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});

// ── useRelatedTracks ──

describe('useRelatedTracks', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useRelatedTracks(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('handles array response (no collection)', async () => {
    mockOk([{ id: 1 }]);
    const { result } = renderHook(() => useRelatedTracks(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('fetches related tracks', async () => {
    mockOk({ collection: [{ id: 2 }] });
    const { result } = renderHook(() => useRelatedTracks(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it('skips when undefined', () => {
    const { result } = renderHook(() => useRelatedTracks(undefined), { wrapper });
    expect(result.current.data).toBeNull();
  });

  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => useRelatedTracks(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
