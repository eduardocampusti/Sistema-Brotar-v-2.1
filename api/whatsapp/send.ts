import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeAppointment, authorizeSession } from '../_shared/authorization';

class MissingEnvironmentVariableError extends Error {
    constructor(readonly variableName: string) {
        super(`Missing required environment variable: ${variableName}`);
        this.name = 'MissingEnvironmentVariableError';
    }
}

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new MissingEnvironmentVariableError(name);
    }
    return value;
}

function getBearerToken(req: VercelRequest): string | null {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return null;
    const token = authorization.slice('Bearer '.length).trim();
    return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
        return res.status(401).json({ error: 'Não autorizado.' });
    }

    let supabaseUrl: string;
    let supabaseServiceKey: string;

    try {
        supabaseUrl = requireEnv('SUPABASE_URL');
        supabaseServiceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    } catch (error: unknown) {
        if (error instanceof MissingEnvironmentVariableError) {
            return res.status(503).json({ error: `Configuração ausente: ${error.variableName}.` });
        }
        return res.status(503).json({ error: 'Serviço de WhatsApp indisponível.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const authorization = await authorizeSession(supabase, accessToken, 'whatsapp:send');
    if ('status' in authorization) {
        const message = authorization.status === 401 ? 'Não autorizado.' : 'Acesso negado.';
        return res.status(authorization.status).json({ error: message });
    }

    const { telefone, nome, data, hora, appointmentId } = req.body ?? {};
    if (!telefone || !nome || !data || !hora || !appointmentId) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const appointmentAuthorization = await authorizeAppointment(
        supabase,
        authorization.profile,
        String(appointmentId),
    );
    if ('status' in appointmentAuthorization) {
        if (appointmentAuthorization.status === 404) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }
        if (appointmentAuthorization.status === 500) {
            return res.status(500).json({ error: 'Não foi possível validar o agendamento.' });
        }
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    let whatsappToken: string;
    let phoneNumberId: string;
    try {
        whatsappToken = requireEnv('WHATSAPP_TOKEN');
        phoneNumberId = requireEnv('WHATSAPP_PHONE_NUMBER_ID');
    } catch (error: unknown) {
        if (error instanceof MissingEnvironmentVariableError) {
            return res.status(503).json({ error: `Configuração ausente: ${error.variableName}.` });
        }
        return res.status(503).json({ error: 'Serviço de WhatsApp indisponível.' });
    }

    let formattedPhone = String(telefone).replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const messageBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
            name: 'confirmar_agendamento',
            language: { code: 'pt_BR' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: nome },
                        { type: 'text', text: data },
                        { type: 'text', text: hora },
                    ],
                },
                {
                    type: 'button',
                    sub_type: 'quick_reply',
                    index: '0',
                    parameters: [{ type: 'payload', payload: `CONFIRM_${appointmentId}` }],
                },
                {
                    type: 'button',
                    sub_type: 'quick_reply',
                    index: '1',
                    parameters: [{ type: 'payload', payload: `RESCHEDULE_${appointmentId}` }],
                },
                {
                    type: 'button',
                    sub_type: 'quick_reply',
                    index: '2',
                    parameters: [{ type: 'payload', payload: `CANCEL_${appointmentId}` }],
                },
            ],
        },
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody),
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'O provedor de WhatsApp recusou o envio.' });
        }

        return res.status(200).json({ ok: true });
    } catch {
        return res.status(502).json({ error: 'Não foi possível conectar ao provedor de WhatsApp.' });
    }
}
