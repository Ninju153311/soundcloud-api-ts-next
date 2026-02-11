import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useSCAuth } from '../../client/hooks/useSCAuth.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

describe('useSCAuth', () => {
  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useSCAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('login fetches auth URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://sc.com/connect' }),
    });
    // Mock window.location
    const originalLocation = window.location;
    // @ts-expect-error — testing invalid props
    delete window.location;
    window.location = { ...originalLocation, href: '' } as any;

    const { result } = renderHook(() => useSCAuth(), { wrapper });
    await act(async () => { result.current.login(); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/login')));

    window.location = originalLocation;
  });

  it('handleCallback exchanges code for tokens', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'tok',
        refresh_token: 'ref',
        expires_in: 3600,
      }),
    });
    // After _setAuth, provider will fetch /me
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'me' }),
    });

    const { result } = renderHook(() => useSCAuth(), { wrapper });
    let tokens: any;
    await act(async () => {
      tokens = await result.current.handleCallback('code123', 'state123');
    });
    expect(tokens.access_token).toBe('tok');
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/callback');
    expect(fetchMock.mock.calls[0][0]).toContain('code=code123');
    expect(fetchMock.mock.calls[0][0]).toContain('state=state123');
  });

  it('handleCallback throws on failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });
    const { result } = renderHook(() => useSCAuth(), { wrapper });
    await expect(
      act(async () => { await result.current.handleCallback('bad', 'bad'); })
    ).rejects.toThrow('Auth callback failed');
  });

  it('logout clears state', async () => {
    // Set up auth first
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'me' }),
    });

    const { result } = renderHook(() => useSCAuth(), { wrapper });
    await act(async () => {
      await result.current.handleCallback('code', 'state');
    });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    // Now logout
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
  });
});
