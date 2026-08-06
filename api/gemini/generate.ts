import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { authorizeSession } from '../_shared/authorization';
import type {
  GeminiGenerateErrorResponse,
  GeminiGenerateRequest,
  GeminiGenerateSuccessResponse,
} from '../../types/geminiApi';

const SYSTEM_PERSONA = `
Você é o REDATOR OFICIAL do SISTEMA BROTAR.
Sua tarefa é gerar documentos profissionais (Relatórios, Ofícios, Declarações).
REGRAS:
1. Use linguagem técnica, formal e institucional.
2. NUNCA invente dados médicos ou diagnósticos não fornecidos.
3. Se faltar informação, use [DADO NÃO INFORMADO].
4. Formate como um texto de documento oficial, pronto para impressão em papel timbrado.
`;

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

function sendError(res: VercelResponse, status: number, error: string) {
  const payload: GeminiGenerateErrorResponse = { error };
  return res.status(status).json(payload);
}

function parseRequest(body: unknown): GeminiGenerateRequest | null {
  if (!body || typeof body !== 'object') return null;
  const prompt = (body as Record<string, unknown>).prompt;
  if (typeof prompt !== 'string') return null;
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt || normalizedPrompt.length > 30_000) return null;
  return { prompt: normalizedPrompt };
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  return record.status === 429 || record.code === 429;
}

function getBearerToken(req: VercelRequest): string | null {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed');
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return sendError(res, 401, 'Não autorizado.');
  }

  let supabaseUrl: string;
  let supabaseServiceKey: string;

  try {
    supabaseUrl = requireEnv('SUPABASE_URL');
    supabaseServiceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  } catch (error: unknown) {
    if (error instanceof MissingEnvironmentVariableError) {
      return sendError(res, 503, `Configuração ausente: ${error.variableName}.`);
    }
    return sendError(res, 503, 'Serviço de IA indisponível.');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorization = await authorizeSession(supabase, accessToken, 'gemini:generate');
  if ('status' in authorization) {
    const message = authorization.status === 401 ? 'Não autorizado.' : 'Acesso negado.';
    return sendError(res, authorization.status, message);
  }

  const request = parseRequest(req.body as unknown);
  if (!request) {
    return sendError(res, 400, 'Prompt ausente ou acima do limite permitido.');
  }

  let geminiApiKey: string;
  try {
    geminiApiKey = requireEnv('GEMINI_API_KEY');
  } catch (error: unknown) {
    if (error instanceof MissingEnvironmentVariableError) {
      return sendError(res, 503, `Configuração ausente: ${error.variableName}.`);
    }
    return sendError(res, 503, 'Serviço de IA indisponível.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
      contents: request.prompt,
      config: {
        systemInstruction: SYSTEM_PERSONA,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      return sendError(res, 502, 'O provedor de IA retornou uma resposta vazia.');
    }

    const payload: GeminiGenerateSuccessResponse = { text: response.text };
    return res.status(200).json(payload);
  } catch (error: unknown) {
    const status = isRateLimitError(error) ? 429 : 502;
    return sendError(res, status, 'Não foi possível concluir a geração do documento.');
  }
}
