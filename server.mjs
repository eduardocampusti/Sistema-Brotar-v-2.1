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

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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
// ... (resto da lógica igual)
// ...
});

// 2. Envio de Mensagem (Confirmar Agendamento)
app.post('/api/whatsapp/send', async (req, res) => {
// ...
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
    console.log(`[Servidor] Sistema Brotar rodando na porta ${port}`);
});
