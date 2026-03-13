import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a Service Role Key (necessária para Serverless Functions)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- FUNÇÕES AUXILIARES WHATSAPP ---

function normalizeText(text: any): string {
    if (!text) return '';
    return text.toString()
        .normalize('NFD') // Decompõe caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .trim()
        .toLowerCase();
}

async function sendWhatsAppMessage(to: string, message: string) {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.error('[WhatsApp] Configurações ausentes para envio.');
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
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
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody),
        });
        const result = await response.json();
        console.log(`[WhatsApp] Resposta envio para ${to}:`, result.messages?.[0]?.id ? 'Sucesso' : 'Falha');
    } catch (error) {
        console.error('[WhatsApp] Erro ao enviar mensagem:', error);
    }
}

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
        console.log('[Webhook] Body completo recebido:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
            try {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];

                if (!message) {
                    if (value?.statuses?.[0]) {
                        const status = value.statuses[0];
                        console.log(`[Webhook] Status da mensagem: ${status.status} para ${status.recipient_id}`);
                    } else {
                        console.log('[Webhook] Update sem mensagem ou status.');
                    }
                    return res.status(200).send('EVENT_RECEIVED');
                }

                const from = message.from;
                const msgType = message.type;
                const msgId = message.id;
                console.log(`[Webhook] Nova Mensagem | ID: ${msgId} | De: ${from} | Tipo: ${msgType}`);

                let newStatus = '';
                let appointmentId = '';
                let rawText = '';
                let actionType = ''; // CONFIRM, CANCEL, RESCHEDULE

                // 1. Identificação da Ação (Botões Interativos)
                if (msgType === 'interactive' && message.interactive?.button_reply) {
                    const reply = message.interactive.button_reply;
                    const replyId = reply.id;
                    rawText = reply.title;
                    console.log(`[Webhook] Botão Interativo Clicado: "${rawText}" (ID: ${replyId})`);

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
                    console.log(`[Webhook] Botão Template Clicado: "${rawText}" (Payload: ${payload})`);

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
                    console.log(`[Webhook] Texto Recebido: "${rawText}" (Normalizado: "${text}")`);

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
                    
                    let targetId = appointmentId;
                    
                    if (!targetId) {
                        const phoneClean = from.replace(/\D/g, '');
                        // Busca tanto com 55 quanto sem 55 para garantir compatibilidade com diferentes cadastros
                        const phoneShort = phoneClean.startsWith('55') ? phoneClean.substring(2) : phoneClean;
                        const phoneWith55 = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

                        console.log(`[Webhook] Buscando agendamento pendente para: ${phoneClean} / ${phoneShort}`);

                        const { data: pending } = await supabase
                            .from('appointments')
                            .select('id, student_name')
                            .or(`telefone_responsavel.ilike.%${phoneShort}%,telefone_responsavel.eq.${phoneClean},telefone_responsavel.eq.${phoneWith55}`)
                            .eq('status_confirmacao', 'PENDENTE')
                            .order('date', { ascending: true })
                            .limit(1);

                        if (pending?.[0]) {
                            targetId = pending[0].id;
                            console.log(`[Webhook] Agendamento encontrado: ${targetId} (${pending[0].student_name})`);
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
                        .select();

                    if (error) {
                        console.error('[Webhook] Erro ao atualizar Supabase:', error);
                        await sendWhatsAppMessage(from, "Desculpe, ocorreu um erro técnico ao processar sua solicitação. Por favor, tente novamente mais tarde.");
                    } else if (data && data.length > 0) {
                        console.log(`[Webhook] Sucesso! Agendamento ${targetId} atualizado para ${newStatus}`);
                        
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
                        console.log(`[Webhook] Falha na atualização: ID ${targetId} não encontrado.`);
                        await sendWhatsAppMessage(from, "Não foi possível atualizar o agendamento. Ele pode ter sido alterado recentemente.");
                    }
                } else if (msgType === 'text') {
                    console.log('[Webhook] Texto não reconhecido como comando.');
                }

                return res.status(200).send('EVENT_RECEIVED');
            } catch (err: any) {
                console.error('[Webhook] Erro Crítico:', err);
                return res.status(200).send('EVENT_RECEIVED');
            }
        }
    }

    return res.status(405).send('Method Not Allowed');
}
