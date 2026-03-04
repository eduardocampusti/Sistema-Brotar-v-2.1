import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a Service Role Key (necessária para Serverless Functions)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'BROTAR_VERIFY_2026';

    // --- VERIFICAÇÃO GET (Webhook Meta) ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).send('Forbidden');
            }
        }
        return res.status(400).send('Bad Request');
    }

    // --- RECEBIMENTO POST (Eventos Meta) ---
    if (req.method === 'POST') {
        const body = req.body;
        console.log('[Webhook] Payload bruto recebido:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
            try {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];

                if (message) {
                    console.log('[Webhook] Detalhes da mensagem:', JSON.stringify(message));

                    let newStatus = '';
                    let appointmentId = '';

                    // 1. Lógica para BOTÕES DE TEMPLATE (button payload)
                    if (message.type === 'button' && message.button?.payload) {
                        const payload = message.button.payload;
                        console.log('[Webhook] Botão de Template clicado. Payload:', payload);

                        if (payload.startsWith('CONFIRM_')) {
                            newStatus = 'CONFIRMADO';
                            appointmentId = payload.replace('CONFIRM_', '');
                        } else if (payload.startsWith('RESCHEDULE_')) {
                            newStatus = 'REMARCAR';
                            appointmentId = payload.replace('RESCHEDULE_', '');
                        } else if (payload.startsWith('CANCEL_')) {
                            newStatus = 'CANCELADO';
                            appointmentId = payload.replace('CANCEL_', '');
                        }
                    }
                    // 2. Lógica para BOTÕES INTERATIVOS (button_reply)
                    else if (message.type === 'interactive' && message.interactive?.button_reply) {
                        const replyId = message.interactive.button_reply.id;
                        console.log('[Webhook] Botão Interativo clicado:', replyId);

                        if (replyId.startsWith('CONFIRM_')) {
                            newStatus = 'CONFIRMADO';
                            appointmentId = replyId.replace('CONFIRM_', '');
                        } else if (replyId.startsWith('RESCHEDULE_')) {
                            newStatus = 'REMARCAR';
                            appointmentId = replyId.replace('RESCHEDULE_', '');
                        } else if (replyId.startsWith('CANCEL_')) {
                            newStatus = 'CANCELADO';
                            appointmentId = replyId.replace('CANCEL_', '');
                        }
                    }
                    // Lógica para TEXTO
                    else if (message.type === 'text') {
                        const from = message.from;
                        const textBody = (message.text?.body || "").toUpperCase();
                        if (textBody.includes('CONFIRMAR')) newStatus = 'CONFIRMADO';
                        else if (textBody.includes('CANCELAR')) newStatus = 'CANCELADO';
                    }

                    if (newStatus) {
                        if (appointmentId) {
                            console.log(`Atualizando agendamento ID ${appointmentId}: ${newStatus}`);

                            // Atualiza o agendamento específico via ID
                            const { error } = await supabase
                                .from('appointments')
                                .update({ status_confirmacao: newStatus })
                                .eq('id', appointmentId);

                            if (error) {
                                console.error('Supabase Update Error:', error);
                            } else {
                                console.log('Status atualizado com sucesso via ID.');
                            }
                        } else {
                            // Fallback para o telefone se o payload não estiver presente
                            const from = message.from;
                            console.log(`Fallback: Atualizando por telefone ${from}: ${newStatus}`);
                            await supabase
                                .from('appointments')
                                .update({ status_confirmacao: newStatus })
                                .eq('telefone_responsavel', from)
                                .eq('status_confirmacao', 'PENDENTE');
                        }
                    }
                }

                return res.status(200).send('EVENT_RECEIVED');
            } catch (error) {
                console.error('Erro ao processar o webhook POST:', error);
                return res.status(200).send('EVENT_RECEIVED');
            }
        } else {
            return res.status(404).send('Not Found');
        }
    }

    return res.status(405).send('Method Not Allowed');
}
