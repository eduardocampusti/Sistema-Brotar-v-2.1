import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

function createSupabaseAdmin() {
    return createClient(
        requireEnv('SUPABASE_URL'),
        requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false, autoRefreshToken: false } },
    );
}

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function logConfigurationError(error: unknown) {
    if (error instanceof MissingEnvironmentVariableError) {
        console.error(`[Webhook] Configuração ausente: ${error.variableName}.`);
        return;
    }
    console.error('[Webhook] Configuração de serviço inválida.');
}

// --- FUNÇÕES AUXILIARES WHATSAPP ---

function normalizeText(text: any): string {
    if (!text) return '';
    return text.toString()
        .normalize('NFD') // Decompõe caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .trim()
        .toLowerCase();
}

/** Evita que `%` e `_` no número tratado como curingas do ILIKE; `\` também escapado (padrão LIKE do Postgres). */
function escapeIlikePattern(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Busca agendamento pendente por telefone: igualdades exatas primeiro, depois ILIKE com padrão escapado. */
async function fetchPendingAppointmentByPhone(
    supabase: SupabaseAdmin,
    phoneClean: string,
    phoneShort: string,
    phoneWith55: string,
) {
    const base = () =>
        supabase
            .from('appointments')
            .select('id, student_name')
            .eq('status_confirmacao', 'PENDENTE')
            .or('excluido.is.null,excluido.eq.false')
            .order('date', { ascending: true })
            .limit(1);

    const variants = [...new Set([phoneClean, phoneShort, phoneWith55].filter(Boolean))];
    for (const p of variants) {
        const { data, error } = await base().eq('telefone_responsavel', p);
        if (error) console.error('[Webhook] Falha na busca exata por telefone.');
        if (data?.[0]) return data;
    }

    if (phoneShort.length >= 6) {
        const pattern = `%${escapeIlikePattern(phoneShort)}%`;
        const { data, error } = await base().ilike('telefone_responsavel', pattern);
        if (error) console.error('[Webhook] Falha na busca alternativa por telefone.');
        if (data?.[0]) return data;
    }

    return null;
}

async function sendWhatsAppMessage(to: string, message: string) {
    let whatsappToken: string;
    let whatsappPhoneNumberId: string;
    try {
        whatsappToken = requireEnv('WHATSAPP_TOKEN');
        whatsappPhoneNumberId = requireEnv('WHATSAPP_PHONE_NUMBER_ID');
    } catch (error: unknown) {
        logConfigurationError(error);
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${whatsappPhoneNumberId}/messages`;
    const messageBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody),
        });
        await response.json();
        console.log(`[WhatsApp] Envio concluído com status ${response.status}.`);
    } catch {
        console.error('[WhatsApp] Falha no envio de mensagem.');
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log(`[Webhook] Nova requisição recebida: ${req.method}`);

    // --- VERIFICAÇÃO GET (Webhook Meta) ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            let whatsappVerifyToken: string;
            try {
                whatsappVerifyToken = requireEnv('WHATSAPP_VERIFY_TOKEN');
            } catch (error: unknown) {
                if (error instanceof MissingEnvironmentVariableError) {
                    return res.status(503).json({ error: `Configuração ausente: ${error.variableName}.` });
                }
                return res.status(503).json({ error: 'Configuração de serviço inválida.' });
            }

            if (mode === 'subscribe' && token === whatsappVerifyToken) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                console.log('WEBHOOK_VERIFICATION_FAILED');
                return res.status(403).send('Forbidden');
            }
        }
        return res.status(400).send('Bad Request');
    }

    // --- RECEBIMENTO POST (Eventos Meta) ---
    if (req.method === 'POST') {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            try {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];

                if (!message) {
                    if (value?.statuses?.[0]) {
                        const status = value.statuses[0];
                        console.log(`[Webhook] Status de mensagem recebido: ${status.status}.`);
                    } else {
                        console.log('[Webhook] Update sem mensagem ou status.');
                    }
                    return res.status(200).send('EVENT_RECEIVED');
                }

                const from = message.from;
                const msgType = message.type;
                const msgId = message.id;
                console.log(`[Webhook] Mensagem recebida do tipo ${msgType}.`);

                let newStatus = '';
                let appointmentId = '';
                let rawText = '';
                let actionType = ''; // CONFIRM, CANCEL, RESCHEDULE

                // 1. Identificação da Ação (Botões Interativos)
                if (msgType === 'interactive' && message.interactive?.button_reply) {
                    const reply = message.interactive.button_reply;
                    const replyId = reply.id;
                    rawText = reply.title;
                    if (replyId.startsWith('CONFIRM_')) {
                        actionType = 'CONFIRM';
                        newStatus = 'CONFIRMADO';
                        appointmentId = replyId.replace('CONFIRM_', '');
                    } else if (replyId.startsWith('CANCEL_')) {
                        actionType = 'CANCEL';
                        newStatus = 'CANCELADO';
                        appointmentId = replyId.replace('CANCEL_', '');
                    } else if (replyId.startsWith('RESCHEDULE_')) {
                        actionType = 'RESCHEDULE';
                        newStatus = 'REMARCAR';
                        appointmentId = replyId.replace('RESCHEDULE_', '');
                    }
                } 
                // 2. Identificação da Ação (Botões de Template)
                else if (msgType === 'button' && message.button?.payload) {
                    const payload = message.button.payload;
                    rawText = message.button.text;
                    if (payload.startsWith('CONFIRM_')) {
                        actionType = 'CONFIRM';
                        newStatus = 'CONFIRMADO';
                        appointmentId = payload.replace('CONFIRM_', '');
                    } else if (payload.startsWith('CANCEL_')) {
                        actionType = 'CANCEL';
                        newStatus = 'CANCELADO';
                        appointmentId = payload.replace('CANCEL_', '');
                    } else if (payload.startsWith('RESCHEDULE_')) {
                        actionType = 'RESCHEDULE';
                        newStatus = 'REMARCAR';
                        appointmentId = payload.replace('RESCHEDULE_', '');
                    }
                }
                // 3. Identificação da Ação (Texto Livre)
                else if (msgType === 'text') {
                    rawText = message.text?.body || '';
                    const text = normalizeText(rawText);
                    if (text === 'confirmar' || text === 'confirmado' || text === 'sim' || text === '1') {
                        actionType = 'CONFIRM';
                        newStatus = 'CONFIRMADO';
                    } else if (text === 'cancelar' || text === 'cancelado' || text === 'nao' || text === '2') {
                        actionType = 'CANCEL';
                        newStatus = 'CANCELADO';
                    } else if (text === 'remarcar' || text === 'reagendar' || text === '3') {
                        actionType = 'RESCHEDULE';
                        newStatus = 'REMARCAR';
                    }
                }

            // 4. Execução das Ações no Supabase
            if (newStatus) {
                console.log(`[Webhook] Processando Ação: ${actionType} | Novo Status: ${newStatus}`);

                let supabase: SupabaseAdmin;
                try {
                    supabase = createSupabaseAdmin();
                } catch (error: unknown) {
                    logConfigurationError(error);
                    return res.status(200).send('EVENT_RECEIVED');
                }

                    let targetId = appointmentId;
                    
                    if (!targetId) {
                        const phoneClean = from.replace(/\D/g, '');
                        // Busca tanto com 55 quanto sem 55 para garantir compatibilidade com diferentes cadastros
                        const phoneShort = phoneClean.startsWith('55') ? phoneClean.substring(2) : phoneClean;
                        const phoneWith55 = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

                        const pending = await fetchPendingAppointmentByPhone(
                            supabase,
                            phoneClean,
                            phoneShort,
                            phoneWith55,
                        );

                        if (pending?.[0]) {
                            targetId = pending[0].id;
                            console.log('[Webhook] Agendamento pendente localizado.');
                        }
                    }

                    if (!targetId) {
                        console.log('[Webhook] Nenhum agendamento pendente localizado.');
                        await sendWhatsAppMessage(from, "Não localizamos agendamentos pendentes para confirmação neste número.");
                        return res.status(200).send('EVENT_RECEIVED');
                    }

                    const updateData = { 
                        status_confirmacao: newStatus,
                        confirmado_em: new Date().toISOString()
                    };

                    const { data, error } = await supabase
                        .from('appointments')
                        .update(updateData)
                        .eq('id', targetId)
                        .or('excluido.is.null,excluido.eq.false')
                        .select();

                    if (error) {
                        console.error('[Webhook] Falha ao atualizar agendamento.');
                        await sendWhatsAppMessage(from, "Desculpe, ocorreu um erro técnico ao processar sua solicitação. Por favor, tente novamente mais tarde.");
                    } else if (data && data.length > 0) {
                        console.log(`[Webhook] Agendamento atualizado para ${newStatus}.`);
                        
                        let feedbackMsg = "";
                        if (newStatus === 'CONFIRMADO') {
                            feedbackMsg = "✅ Seu atendimento foi confirmado com sucesso. Obrigado!";
                        } else if (newStatus === 'CANCELADO') {
                            feedbackMsg = "❌ Seu atendimento foi cancelado conforme solicitado.";
                        } else if (newStatus === 'REMARCAR') {
                            feedbackMsg = "⏳ Recebemos seu pedido de reagendamento. Nossa equipe entrará em contato em breve para combinar um novo horário.";
                        }

                        await sendWhatsAppMessage(from, feedbackMsg);
                    } else {
                        console.log('[Webhook] Agendamento não encontrado ou sem permissão para atualização.');
                        await sendWhatsAppMessage(from, "Não foi possível atualizar o agendamento. Ele pode ter sido alterado recentemente.");
                    }
                } else if (msgType === 'text') {
                    console.log('[Webhook] Texto não reconhecido como comando.');
                }

                return res.status(200).send('EVENT_RECEIVED');
            } catch {
                console.error('[Webhook] Falha crítica ao processar evento.');
                return res.status(200).send('EVENT_RECEIVED');
            }
        }
    }

    return res.status(405).send('Method Not Allowed');
}
