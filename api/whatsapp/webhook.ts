import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a Service Role Key (necessária para Serverless Functions)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'BROTAR_VERIFY_2026';

    console.log(`[Webhook] Nova requisição recebida: ${req.method}`);

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
                console.log('WEBHOOK_VERIFICATION_FAILED');
                return res.status(403).send('Forbidden');
            }
        }
        return res.status(400).send('Bad Request');
    }

    // --- RECEBIMENTO POST (Eventos Meta) ---
    if (req.method === 'POST') {
        const body = req.body;
        console.log('[Webhook] Body bruto recebido:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
            try {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];

                if (!message) {
                    console.log('[Webhook] Nenhuma mensagem encontrada no payload (pode ser um status update)');
                    return res.status(200).send('EVENT_RECEIVED');
                }

                console.log('[Webhook] Mensagem recebida:', {
                    from: message.from,
                    id: message.id,
                    type: message.type
                });

                let newStatus = '';
                let appointmentId = '';

                // 1. Lógica para BOTÕES DE TEMPLATE (button)
                if (message.type === 'button' && message.button?.payload) {
                    const payload = message.button.payload;
                    console.log('[Webhook] Tipo: BUTTON (Template). Payload:', payload);

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
                // 2. Lógica para BOTÕES INTERATIVOS (button_reply dentro de interactive)
                else if (message.type === 'interactive' && message.interactive?.button_reply) {
                    const reply = message.interactive.button_reply;
                    console.log('[Webhook] Tipo: INTERACTIVE (button_reply). ID:', reply.id, 'Texto:', reply.title);

                    const replyId = reply.id;
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
                // 3. Lógica para TEXTO
                else if (message.type === 'text') {
                    const textBody = (message.text?.body || "").toUpperCase();
                    console.log('[Webhook] Tipo: TEXT. Conteúdo:', textBody);

                    if (textBody.includes('CONFIRMAR')) newStatus = 'CONFIRMADO';
                    else if (textBody.includes('CANCELAR')) newStatus = 'CANCELADO';
                } else {
                    console.log('[Webhook] Tipo de mensagem não tratado:', message.type);
                }

                if (newStatus) {
                    console.log('[Webhook] Mudança detectada:', { newStatus, appointmentId });
                    
                    if (appointmentId) {
                        console.log(`[Webhook] Tentando atualizar Supabase ID: ${appointmentId} -> ${newStatus}`);

                        const { data, error, count } = await supabase
                            .from('appointments')
                            .update({ status_confirmacao: newStatus })
                            .eq('id', appointmentId)
                            .select();

                        if (error) {
                            console.error('[Webhook] ERRO Supabase Update:', error);
                        } else {
                            console.log('[Webhook] SUCESSO Supabase Update:', {
                                rowsAffected: data?.length || 0,
                                data: data
                            });
                        }
                    } else {
                        // Fallback para o telefone se o payload ID não estiver presente
                        const from = message.from;
                        console.log(`[Webhook] Fallback: Atualizando por telefone ${from} para ${newStatus}`);
                        
                        const { data, error } = await supabase
                            .from('appointments')
                            .update({ status_confirmacao: newStatus })
                            .eq('telefone_responsavel', from)
                            .eq('status_confirmacao', 'PENDENTE')
                            .select();

                        if (error) {
                            console.error('[Webhook] ERRO Supabase Fallback Update:', error);
                        } else {
                            console.log('[Webhook] SUCESSO Supabase Fallback Update:', {
                                rowsAffected: data?.length || 0
                            });
                        }
                    }
                } else {
                    console.log('[Webhook] Nenhuma ação definida para esta mensagem.');
                }

                return res.status(200).send('EVENT_RECEIVED');
            } catch (err: any) {
                console.error('[Webhook] CATCH ERROR:', {
                    message: err.message,
                    stack: err.stack
                });
                return res.status(200).send('EVENT_RECEIVED'); // Sempre retornar 200 para a Meta evitar retentativas infinitas
            }
        } else {
            console.log('[Webhook] Objeto não identificado:', body.object);
            return res.status(404).send('Not Found');
        }
    }

    return res.status(405).send('Method Not Allowed');
}
