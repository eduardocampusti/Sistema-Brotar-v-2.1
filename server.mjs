import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
    canAccessAppointment,
    normalizeAppointmentAccess,
    normalizeTrustedProfile,
    profileHasPermission,
} from './server/authorization.mjs';

// Carrega variáveis de ambiente (localmente usa .env ou .env.local)
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

class MissingEnvironmentVariableError extends Error {
    constructor(variableName) {
        super(`Missing required environment variable: ${variableName}`);
        this.name = 'MissingEnvironmentVariableError';
        this.variableName = variableName;
    }
}

function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new MissingEnvironmentVariableError(name);
    }
    return value;
}

function readPort() {
    const configuredPort = process.env.PORT?.trim();
    if (!configuredPort) return 3000;
    const parsedPort = Number(configuredPort);
    if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
        throw new Error('Invalid environment variable: PORT');
    }
    return parsedPort;
}

const port = readPort();

function createSupabaseAdmin() {
    return createClient(
        requireEnv('SUPABASE_URL'),
        requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

function getWhatsAppConfig() {
    return {
        token: requireEnv('WHATSAPP_TOKEN'),
        phoneNumberId: requireEnv('WHATSAPP_PHONE_NUMBER_ID')
    };
}

function sendConfigurationError(res, error) {
    if (error instanceof MissingEnvironmentVariableError) {
        res.status(503).json({ error: `Configuração ausente: ${error.variableName}.` });
        return;
    }
    res.status(503).json({ error: 'Configuração de serviço inválida.' });
}

function logConfigurationError(scope, error) {
    if (error instanceof MissingEnvironmentVariableError) {
        console.error(`${scope} Configuração ausente: ${error.variableName}.`);
        return;
    }
    console.error(`${scope} Configuração de serviço inválida.`);
}

function isRateLimitError(error) {
    return Boolean(error && typeof error === 'object' && (error.status === 429 || error.code === 429));
}

async function requireAuthorizedUser(req, res, permission) {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Não autorizado.' });
        return null;
    }

    const accessToken = authorization.slice('Bearer '.length).trim();
    if (!accessToken) {
        res.status(401).json({ error: 'Não autorizado.' });
        return null;
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        sendConfigurationError(res, error);
        return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
        res.status(401).json({ error: 'Não autorizado.' });
        return null;
    }

    const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,is_active,specialty,scope,school_id')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();
    const profile = normalizeTrustedProfile(profileRow, user.id);

    if (profileError || !profile || !profileHasPermission(profile, permission)) {
        res.status(403).json({ error: 'Acesso negado.' });
        return null;
    }

    return { profile, supabase };
}

const GEMINI_SYSTEM_PERSONA = `
Você é o REDATOR OFICIAL do SISTEMA BROTAR.
Sua tarefa é gerar documentos profissionais (Relatórios, Ofícios, Declarações).
REGRAS:
1. Use linguagem técnica, formal e institucional.
2. NUNCA invente dados médicos ou diagnósticos não fornecidos.
3. Se faltar informação, use [DADO NÃO INFORMADO].
4. Formate como um texto de documento oficial, pronto para impressão em papel timbrado.
`;

console.log('[Servidor] Inicialização solicitada.');

// --- CAMADA DE DIAGNÓSTICO AGRESSIVA (TOPO ABSOLUTO) ---
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});

app.get('/ping', (req, res) => {
    res.status(200).send('PONG - SISTEMA BROTAR V2.1.4 ATIVO');
});

app.get('/debug-ping', (req, res) => {
    res.status(200).send('PONG - SISTEMA BROTAR V2.1.4 ATIVO');
});


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
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Se houver parâmetros da Meta, procede com a verificação
    if (mode && token) {
        let whatsappVerifyToken;
        try {
            whatsappVerifyToken = requireEnv('WHATSAPP_VERIFY_TOKEN');
        } catch (error) {
            return sendConfigurationError(res, error);
        }

        if (mode === 'subscribe' && token === whatsappVerifyToken) {
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
    let whatsappConfig;
    try {
        whatsappConfig = getWhatsAppConfig();
    } catch (error) {
        logConfigurationError('[WhatsApp]', error);
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`;
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
                'Authorization': `Bearer ${whatsappConfig.token}`,
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

app.post('/api/whatsapp/webhook', async (req, res) => {
    const body = req.body;
    
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

                let supabase;
                try {
                    supabase = createSupabaseAdmin();
                } catch (error) {
                    logConfigurationError('[Webhook]', error);
                    return res.status(200).send('EVENT_RECEIVED');
                }
                
                // Busca o agendamento antes para saber o que estamos alterando (Auditoria/Log)
                let targetId = appointmentId;
                
                if (!targetId) {
                    const phoneClean = from.replace(/\D/g, '');
                    // Busca tanto com 55 quanto sem 55 para garantir compatibilidade com diferentes cadastros
                    const phoneShort = phoneClean.startsWith('55') ? phoneClean.substring(2) : phoneClean;
                    const phoneWith55 = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

                const { data: pending, error: searchError } = await supabase
                        .from('appointments')
                        .select('id, student_name')
                        .or(`telefone_responsavel.ilike.%${phoneShort}%,telefone_responsavel.eq.${phoneClean},telefone_responsavel.eq.${phoneWith55}`)
                        .eq('status_confirmacao', 'PENDENTE')
                        .or('excluido.is.null,excluido.eq.false')
                        .order('date', { ascending: true })
                        .limit(1);

                    if (searchError) {
                    console.error('[Webhook] Falha ao buscar agendamento pendente.');
                    }

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
                console.log('[Webhook] Resposta de texto ignorada (não é comando).');
                // Opcional: Responder apenas se for a primeira vez ou se parecer uma dúvida
                // await sendWhatsAppMessage(from, "Olá! Para confirmar use os botões acima ou responda CONFIRMAR ou CANCELAR.");
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch {
            console.error('[Webhook] Falha crítica ao processar evento.');
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    res.status(404).send('Not Found');
});

// 2. Envio de Mensagem (Confirmar Agendamento)
app.post('/api/whatsapp/send', async (req, res) => {
    const authorization = await requireAuthorizedUser(req, res, 'whatsapp:send');
    if (!authorization) return;

    let whatsappConfig;
    try {
        whatsappConfig = getWhatsAppConfig();
    } catch (error) {
        return sendConfigurationError(res, error);
    }

    const { telefone, nome, data, hora, appointmentId, professional, unit } = req.body;

    if (!telefone || !nome || !data || !hora || !appointmentId) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const { data: appointmentRow, error: appointmentError } = await authorization.supabase
        .from('appointments')
        .select('id,professional_id,specialty,unit,students(school_id,schools(district))')
        .eq('id', String(appointmentId))
        .maybeSingle();
    const appointment = normalizeAppointmentAccess(appointmentRow);

    if (appointmentError) {
        return res.status(500).json({ error: 'Não foi possível validar o agendamento.' });
    }
    if (!appointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    if (!canAccessAppointment(authorization.profile, appointment)) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    let formattedPhone = telefone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }

    const url = `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`;

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
                'Authorization': `Bearer ${whatsappConfig.token}`,
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

app.post('/api/gemini/generate', async (req, res) => {
    const authorization = await requireAuthorizedUser(req, res, 'gemini:generate');
    if (!authorization) return;

    let geminiApiKey;
    try {
        geminiApiKey = requireEnv('GEMINI_API_KEY');
    } catch (error) {
        return sendConfigurationError(res, error);
    }

    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt || prompt.length > 30_000) {
        return res.status(400).json({ error: 'Prompt ausente ou acima do limite permitido.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
            contents: prompt,
            config: {
                systemInstruction: GEMINI_SYSTEM_PERSONA,
                temperature: 0.7
            }
        });

        if (!response.text) {
            return res.status(502).json({ error: 'O provedor de IA retornou uma resposta vazia.' });
        }

        return res.status(200).json({ text: response.text });
    } catch (error) {
        const status = isRateLimitError(error) ? 429 : 502;
        return res.status(status).json({ error: 'Não foi possível concluir a geração do documento.' });
    }
});

// 3. Endpoint de Teste (Envio Simples)
app.post('/api/whatsapp/send-test', async (req, res) => {
    const authorization = await requireAuthorizedUser(req, res, 'admin:manage');
    if (!authorization) return;

    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'O campo "phone" é obrigatório.' });
    }

    let whatsappConfig;
    try {
        whatsappConfig = getWhatsAppConfig();
    } catch (error) {
        return sendConfigurationError(res, error);
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        formattedPhone = `55${formattedPhone}`;
    }

    const url = `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`;

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

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappConfig.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody),
        });

        const result = await response.json();
        return res.status(response.status).json(result);
    } catch {
        console.error('[WhatsApp Test] Falha no envio.');
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
    console.log('[Configuração] Integrações opcionais serão validadas sob demanda.');
    console.log('==============================================');
});

