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
const allowedOrigins = [
  'https://brotar.smebrotas.com.br',
  'https://api-brotar.smebrotas.com.br',
  'http://localhost:5501',
  'http://localhost:5500',
  'http://192.168.0.10:5501',
  'http://192.168.0.10:5500'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
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

// --- FUNÇÕES AUXILIARES WHATSAPP ---

function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .normalize('NFD') // Decompõe caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .trim()
        .toLowerCase();
}

async function sendWhatsAppMessage(to, message) {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.VITE_WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
    
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

app.post('/api/whatsapp/webhook', async (req, res) => {
    const body = req.body;
    
    // Log detalhado para diagnóstico em produção
    console.log('[Webhook] Payload completo:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
        try {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (!message) {
                // Pode ser um status de entrega (sent, delivered, read)
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
                
                // Busca o agendamento antes para saber o que estamos alterando (Auditoria/Log)
                let targetId = appointmentId;
                
                if (!targetId) {
                    const phoneClean = from.replace(/\D/g, '');
                    // Busca tanto com 55 quanto sem 55 para garantir compatibilidade com diferentes cadastros
                    const phoneShort = phoneClean.startsWith('55') ? phoneClean.substring(2) : phoneClean;
                    const phoneWith55 = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

                    console.log(`[Webhook] Buscando agendamento pendente para: ${phoneClean} / ${phoneShort}`);

                    const { data: pending, error: searchError } = await supabase
                        .from('appointments')
                        .select('id, student_name')
                        .or(`telefone_responsavel.ilike.%${phoneShort}%,telefone_responsavel.eq.${phoneClean},telefone_responsavel.eq.${phoneWith55}`)
                        .eq('status_confirmacao', 'PENDENTE')
                        .or('excluido.is.null,excluido.eq.false')
                        .order('date', { ascending: true })
                        .limit(1);

                    if (searchError) {
                        console.error('[Webhook] Erro ao buscar agendamento pendente:', searchError);
                    }

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
                    .or('excluido.is.null,excluido.eq.false')
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
                    console.log(`[Webhook] Falha na atualização: ID ${targetId} não encontrado ou sem permissão.`);
                    await sendWhatsAppMessage(from, "Não foi possível atualizar o agendamento. Ele pode ter sido alterado recentemente.");
                }
            } else if (msgType === 'text') {
                console.log('[Webhook] Resposta de texto ignorada (não é comando).');
                // Opcional: Responder apenas se for a primeira vez ou se parecer uma dúvida
                // await sendWhatsAppMessage(from, "Olá! Para confirmar use os botões acima ou responda CONFIRMAR ou CANCELAR.");
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (err) {
            console.error('[Webhook] Erro Crítico:', err);
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    res.status(404).send('Not Found');
});

// 2. Envio de Mensagem (Confirmar Agendamento)
app.post('/api/whatsapp/send', async (req, res) => {
    const sendSecret = process.env.BROTAR_WHATSAPP_SEND_SECRET;
    if (sendSecret && String(sendSecret).trim()) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${String(sendSecret).trim()}`) {
            return res.status(401).json({
                error: 'Não autorizado: configure no app a variável VITE_BROTAR_WHATSAPP_SEND_SECRET com o mesmo valor de BROTAR_WHATSAPP_SEND_SECRET no servidor.',
            });
        }
    }

    const { telefone, nome, data, hora, appointmentId, professional, unit } = req.body;

    if (!telefone || !nome || !data || !hora || !appointmentId) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    console.log(`[API Send] Preparando envio para ${nome} (${telefone}) - ID: ${appointmentId}`);
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
            // Corpo: quantidade DEVE coincidir com os {{n}} aprovados no modelo "confirmar_agendamento" na Meta.
            // Erro #132000 = parâmetros a mais ou a menos. O modelo padrão do Brotar usa 3 (nome, data, hora).
            // profissional/unidade não entram no body até o template no Manager ter {{4}} e {{5}} aprovados.
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

