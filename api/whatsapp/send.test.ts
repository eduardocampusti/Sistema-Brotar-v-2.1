import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, getUserMock } = vi.hoisted(() => ({
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: createClientMock,
}));

import handler from './send';

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
        body: {
            telefone: '5511999999999',
            nome: 'Aluno Teste',
            data: '01/01/2030',
            hora: '10:00',
            appointmentId: 'appointment-test-id',
        },
    } as unknown as VercelRequest;
}

describe('POST /api/whatsapp/send', () => {
    beforeEach(() => {
        vi.stubEnv('SUPABASE_URL', 'https://project.example.test');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
        vi.stubEnv('WHATSAPP_TOKEN', 'test-whatsapp-token');
        vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', 'test-phone-number-id');
        createClientMock.mockReturnValue({ auth: { getUser: getUserMock } });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('retorna 401 sem sessão e não inicializa clientes externos', async () => {
        const response = createResponse();

        await handler(createRequest(), response);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(createClientMock).not.toHaveBeenCalled();
    });

    it('retorna 401 para sessão inválida e não chama a Meta', async () => {
        getUserMock.mockResolvedValue({ data: { user: null }, error: new Error('invalid session') });
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const response = createResponse();

        await handler(createRequest('Bearer invalid-test-session'), response);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('aceita sessão válida e encaminha a chamada sem segredo público do frontend', async () => {
        getUserMock.mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null });
        const fetchMock = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ messages: [{ id: 'message-test-id' }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
        vi.stubGlobal('fetch', fetchMock);
        const response = createResponse();

        await handler(createRequest('Bearer valid-test-session'), response);

        expect(response.status).toHaveBeenCalledWith(200);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
