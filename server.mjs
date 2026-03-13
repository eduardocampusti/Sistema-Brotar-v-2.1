import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente (localmente usa .env ou .env.local)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// --- CAMADA DE DIAGNÓSTICO AGRESSIVA ---
app.use((req, res, next) => {
    console.log(`[HIT] ${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

app.get('/debug-ping', (req, res) => {
    res.status(200).send('PONG - SISTEMA BROTAR V2.1.3 ATIVO');
});


// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Aviso] SUPABASE_URL ou SERVICE_ROLE_KEY não configurados corretamente.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);


// Middlewares
app.use(cors());
app.use(express.json());

// --- ROTAS DO WHATSAPP ---

// 1. Webhook (GET para Verificação, POST para Eventos)
app.get('/api/whatsapp/webhook', (req, res) => {
    const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'BROTAR_VERIFY_2026';
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Se houver parâmetros da Meta, procede com a verificação
    if (mode && token) {
        if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
            console.log('[Webhook] Verificação da Meta bem-sucedida!');
            return res.status(200).send(challenge);
        } else {
            console.log('[Webhook] Falha na verificação da Meta. Token ou modo incorreto.');
            return res.status(403).send('Forbidden');
        }
    }

    // Se NÃO for uma verificação da Meta (acesso direto via navegador), retorna status ativo
    return res.status(200).send('WhatsApp webhook endpoint active');
});

app.post('/api/whatsapp/webhook', async (req, res) => {
    const body = req.body;
    console.log('[Webhook] Payload recebido:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
        try {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (!message) {
                console.log('[Webhook] Update de status ou payload sem mensagem.');
                return res.status(200).send('EVENT_RECEIVED');
            }

            const from = message.from;
            const msgType = message.type;
            console.log(`[Webhook] Mensagem de ${from} tipo ${msgType}`);

            let newStatus = '';
            let appointmentId = '';

            // Lógica para BOTÕES INTERATIVOS (button_reply)
            if (msgType === 'interactive' && message.interactive?.button_reply) {
                const reply = message.interactive.button_reply;
                console.log(`[Webhook] Clique de Botão: ID=${reply.id}, Título=${reply.title}`);

                const replyId = reply.id;
                if (replyId.startsWith('CONFIRM_')) {
                    newStatus = 'CONFIRMADO';
                    appointmentId = replyId.replace('CONFIRM_', '');
                } else if (replyId.startsWith('CANCEL_')) {
                    newStatus = 'CANCELADO';
                    appointmentId = replyId.replace('CANCEL_', '');
                } else if (replyId.startsWith('RESCHEDULE_')) {
                    newStatus = 'REMARCAR';
                    appointmentId = replyId.replace('RESCHEDULE_', '');
                }
            } 
            // Lógica para BOTÕES DE TEMPLATE (button)
            else if (msgType === 'button' && message.button?.payload) {
                const payload = message.button.payload;
                if (payload.startsWith('CONFIRM_')) {
                    newStatus = 'CONFIRMADO';
                    appointmentId = payload.replace('CONFIRM_', '');
                } else if (payload.startsWith('CANCEL_')) {
                    newStatus = 'CANCELADO';
                    appointmentId = payload.replace('CANCEL_', '');
                }
            }
            // Lógica para TEXTO SIMPLES
            else if (msgType === 'text') {
                const text = (message.text?.body || '').toUpperCase();
                if (text.includes('CONFIRMAR')) newStatus = 'CONFIRMADO';
                else if (text.includes('CANCELAR')) newStatus = 'CANCELADO';
            }

            if (newStatus) {
                console.log(`[Webhook] Atualizando status no Supabase: ${newStatus}`);
                
                const query = supabase.from('appointments').update({ status_confirmacao: newStatus });

                if (appointmentId) {
                    query.eq('id', appointmentId);
                } else {
                    query.eq('telefone_responsavel', from).eq('status_confirmacao', 'PENDENTE');
                }

                const { data, error } = await query.select();

                if (error) {
                    console.error('[Webhook] ERRO ao atualizar Supabase:', error);
                } else {
                    console.log('[Webhook] SUCESSO! Linhas afetadas:', data?.length || 0);
                }
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (err) {
            console.error('[Webhook] Erro interno:', err);
            return res.status(200).send('EVENT_RECEIVED');
        }
    }
    
    res.status(404).send('Not Found');
});

// 2. Envio de Mensagem (Confirmar Agendamento)
app.post('/api/whatsapp/send', async (req, res) => {
    const { telefone, nome, data, hora, appointmentId } = req.body;

    if (!telefone || !nome || !data || !hora || !appointmentId) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    let formattedPhone = telefone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.VITE_WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.VITE_WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.error('[Env] Erro: WHATSAPP_TOKEN ou PHONE_NUMBER_ID ausentes.');
        return res.status(500).json({ error: 'Configurações do WhatsApp ausentes no servidor.' });
    }


    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    const messageBody = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
            name: "confirmar_agendamento",
            language: { code: "pt_BR" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: nome },
                        { type: "text", text: data },
                        { type: "text", text: hora }
                    ]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "0",
                    parameters: [{ type: "payload", payload: `CONFIRM_${appointmentId}` }]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "1",
                    parameters: [{ type: "payload", payload: `RESCHEDULE_${appointmentId}` }]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "2",
                    parameters: [{ type: "payload", payload: `CANCEL_${appointmentId}` }]
                }
            ]
        }
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
        return res.status(response.status).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao conectar com a API da Meta.' });
    }
});

// 3. Endpoint de Teste (Envio Simples)
app.post('/api/whatsapp/send-test', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'O campo "phone" é obrigatório.' });
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.VITE_WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.VITE_WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        return res.status(500).json({ error: 'Configurações do WhatsApp ausentes no servidor.' });
    }

    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    const messageBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
            preview_url: false,
            body: "Sistema Brotar conectado com sucesso."
        }
    };

    console.log(`[WhatsApp Test] Enviando para ${formattedPhone}...`);

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
        console.log('[WhatsApp Test] Resposta da Meta:', JSON.stringify(result));
        return res.status(response.status).json(result);
    } catch (error) {
        console.error('[WhatsApp Test] Erro:', error);
        return res.status(500).json({ error: 'Erro ao conectar com a API da Meta.' });
    }
});

// --- SERVIR FRONTEND (dist) ---
// 1. Servir arquivos estáticos explicitamente
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Fallback do React (SPA) - PROTEGIDO para não capturar rotas /api
app.get('*', (req, res) => {
    // Se a rota começar com /api e chegou aqui, é porque não bateu em nenhuma rota acima (404 Real)
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    // Caso contrário, serve o frontend para permitir roteamento interno do React
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log('==============================================');
    console.log(`[Servidor] Sistema Brotar v2.1 Ativo`);
    console.log(`[Porta] ${port}`);
    console.log(`[Supabase URL] ${supabaseUrl ? 'Configurada' : 'AUSENTE'}`);
    console.log(`[Webhook Token] ${process.env.WHATSAPP_VERIFY_TOKEN ? 'Personalizado' : 'Usando Padrão'}`);
    console.log('==============================================');
});

