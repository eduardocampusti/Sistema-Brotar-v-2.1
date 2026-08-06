import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createClientMock,
  fromMock,
  generateContentMock,
  getUserMock,
  googleGenAiMock,
  profileMaybeSingleMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fromMock: vi.fn(),
  generateContentMock: vi.fn(),
  getUserMock: vi.fn(),
  googleGenAiMock: vi.fn(),
  profileMaybeSingleMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: googleGenAiMock,
}));

import handler from './generate';

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockImplementation(() => response);
  response.json.mockImplementation(() => response);
  return response as unknown as VercelResponse;
}

function createRequest(authorization?: string): VercelRequest {
  return {
    method: 'POST',
    headers: authorization ? { authorization } : {},
    body: { prompt: 'Prompt institucional' },
  } as unknown as VercelRequest;
}

describe('POST /api/gemini/generate', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://project.example.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    const profileQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: profileMaybeSingleMock,
    };
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
    fromMock.mockReturnValue(profileQuery);
    getUserMock.mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null });
    profileMaybeSingleMock.mockResolvedValue({
      data: {
        id: 'test-user-id',
        role: 'SPECIALIST',
        is_active: true,
        specialty: 'PSICOLOGIA',
        scope: 'GLOBAL',
        school_id: null,
      },
      error: null,
    });
    createClientMock.mockReturnValue({ auth: { getUser: getUserMock }, from: fromMock });
    googleGenAiMock.mockImplementation(function GoogleGenAiMock() {
      return { models: { generateContent: generateContentMock } };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('retorna 401 sem sessão antes de acessar configuração ou provedores', async () => {
    const response = createResponse();

    await handler(createRequest(), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(createClientMock).not.toHaveBeenCalled();
    expect(googleGenAiMock).not.toHaveBeenCalled();
  });

  it('valida somente ao chamar a rota e informa apenas a variável ausente', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = createResponse();

    await handler(createRequest('Bearer test-session'), response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ error: 'Configuração ausente: GEMINI_API_KEY.' });
  });

  it('valida a sessão, chama o provedor no servidor e devolve texto compatível', async () => {
    generateContentMock.mockResolvedValue({ text: 'Documento gerado' });
    const response = createResponse();

    await handler(createRequest('Bearer test-session'), response);

    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({
      contents: 'Prompt institucional',
      model: 'gemini-2.0-flash',
    }));
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ text: 'Documento gerado' });
  });
});
