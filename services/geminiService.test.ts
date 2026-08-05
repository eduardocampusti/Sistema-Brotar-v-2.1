import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: { getSession },
  },
}));

import { requestGeminiContent } from './geminiService';

describe('requestGeminiContent', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'test-session-token' } },
      error: null,
    });
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('envia somente o prompt e devolve o texto do endpoint autenticado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ text: 'Documento gerado' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestGeminiContent('Prompt institucional')).resolves.toBe('Documento gerado');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/api/gemini/generate');
    expect(init.headers).toEqual({
      Authorization: 'Bearer test-session-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init.body))).toEqual({ prompt: 'Prompt institucional' });
  });

  it('recusa a chamada quando não existe sessão Supabase', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestGeminiContent('Prompt')).rejects.toThrow('Sessão inválida');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
