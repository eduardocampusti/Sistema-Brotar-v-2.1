import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a Service Role Key (necessária para Serverless Functions)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

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

        if (body.object === 'whatsapp_business_account') {
            try {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];

                if (message) {
                    console.log('Mensagem recebida:', message);

                    // Lógica para mensagens de BOTÃO (PROMPT 4 - Usando ID de agendamento)
                    if (message.type === 'button') {
                        const from = message.from;
                        const buttonText = message.button?.text;
                        const appointmentId = message.button?.payload; // ID capturado do payload enviado no /api/whatsapp/send.ts

                        let newStatus = '';
                        if (buttonText === 'Confirmar') newStatus = 'CONFIRMADO';
                        else if (buttonText === 'Cancelar') newStatus = 'CANCELADO';

                        if (newStatus && appointmentId) {
                            console.log(`Atualizando agendamento ID ${appointmentId}: ${newStatus}`);

                            // Atualiza o agendamento específico via ID (Evita conflitos de múltiplos agendamentos para o mesmo telefone)
                            const { error } = await supabase
                                .from('appointments')
                                .update({ status_confirmacao: newStatus })
                                .eq('id', appointmentId)
                                .eq('status_confirmacao', 'PENDENTE');

                            if (error) {
                                console.error('Supabase Update Error:', error);
                            } else {
                                console.log('Status atualizado com sucesso via ID.');
                            }
                        } else if (newStatus && !appointmentId) {
                            // Fallback para o telefone se o payload não estiver presente (Retrocompatibilidade)
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
