import { GoogleAuth } from 'google-auth-library';
import { SimulationError } from './types';

// Modelo de imagem da Google pelo Vertex AI (Secção 16 — decisão do Fábio,
// 2026-09-09: Vertex AI no MESMO projeto Google Cloud do Firebase, e não
// uma chave da Gemini API: mesma fatura Blaze, mesmo contrato de
// tratamento de dados, sem segredo para guardar). A autenticação é a da
// própria conta de serviço — no Firebase, a das Functions (Application
// Default Credentials); localmente (scripts/runJobs.ts), a chave de dev.
//
// O que o Fábio faz uma vez por projeto (ver DEVELOPMENT.md, "Simulador"):
// ativar a API do Vertex AI e dar o papel "Vertex AI User" às contas de
// serviço. Sem isso a chamada responde 403 e a simulação fica 'failed'
// (`vertex_unavailable`) — a app mostra a comparação lado a lado.
//
// Sem SDK: um POST HTTPS a `generateContent` com as imagens em base64
// (a foto do cliente e a amostra) e a instrução em texto; a resposta traz
// a imagem editada em base64. Modelos com saída de imagem (Gemini
// "Nano Banana"): gemini-3.1-flash-image (por defeito), gemini-3-pro-image.
//
// Erros: HTTP → SimulationError('vertex_unavailable') com a resposta na
// mensagem (só para os logs — o cliente vê o código, auditoria 2026-09-12,
// SEG-A-13); sem imagem → outcome com `code` 'blocked' ou 'no_image'.

export type VertexConfig = {
  project: string;
  // 'global' (endpoint global) ou uma região (ex: europe-west1) — nem
  // todos os modelos de imagem existem em todas as regiões.
  location: string;
  model: string;
  // Só local: ficheiro da chave de service account.
  keyFile?: string;
};

export type ImageInput = { data: Buffer; mimeType: string };

export type EditOutcome = { image: ImageInput; text?: string } | { image: null; code: 'blocked' | 'no_image'; reason: string };

// Um pedido ao modelo demora 10–30 s; acima disto é o modelo a arrastar-se
// e a Function tem um prazo interno (SIMULATION_DEADLINE_MS) que abrange
// também as imagens e o upload.
const VERTEX_TIMEOUT_MS = 120_000;

let authCache: { key: string; auth: GoogleAuth } | null = null;

function googleAuth(cfg: VertexConfig): GoogleAuth {
  const key = cfg.keyFile ?? 'adc';
  if (!authCache || authCache.key !== key) {
    authCache = { key, auth: new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'], keyFile: cfg.keyFile }) };
  }
  return authCache.auth;
}

export function vertexEndpoint(cfg: VertexConfig): string {
  const host = cfg.location === 'global' ? 'aiplatform.googleapis.com' : `${cfg.location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${cfg.project}/locations/${cfg.location}/publishers/google/models/${cfg.model}:generateContent`;
}

type GenerateResponse = {
  candidates?: {
    content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] };
    finishReason?: string;
    safetyRatings?: { category?: string; blocked?: boolean }[];
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

// finishReason que significa "a Google recusou" e não "não saiu imagem".
const BLOCKED_FINISH = new Set(['SAFETY', 'IMAGE_SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_PROHIBITED_CONTENT', 'IMAGE_RECITATION']);

// Pede ao modelo a foto editada. Devolve a imagem (bytes + mime) ou o
// motivo de não haver imagem (bloqueio de segurança, resposta só com
// texto). Lança SimulationError em erro HTTP — quem chama marca a
// simulação como 'failed'. `signal` aborta o pedido (prazo interno).
export async function generateEditedImage(cfg: VertexConfig, prompt: string, images: ImageInput[], signal?: AbortSignal): Promise<EditOutcome> {
  const client = await googleAuth(cfg).getClient();
  const token = (await client.getAccessToken()).token;
  if (!token) throw new SimulationError('vertex_unavailable', 'Vertex AI: sem token de acesso (credenciais da conta de serviço)');

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data.toString('base64') } }))],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.4,
    },
  };

  const signals = [AbortSignal.timeout(VERTEX_TIMEOUT_MS), ...(signal ? [signal] : [])];
  let res: Response;
  try {
    res = await fetch(vertexEndpoint(cfg), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any(signals),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SimulationError('vertex_unavailable', `Vertex AI (${cfg.model}): ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as GenerateResponse;
      if (parsed.error?.message) msg = `${parsed.error.status ?? res.status}: ${parsed.error.message.slice(0, 240)}`;
    } catch {
      /* corpo sem JSON */
    }
    throw new SimulationError('vertex_unavailable', `Vertex AI (${cfg.model}) respondeu ${res.status} — ${msg}`);
  }
  const parsed = JSON.parse(text) as GenerateResponse;
  if (parsed.promptFeedback?.blockReason) return { image: null, code: 'blocked', reason: `bloqueado: ${parsed.promptFeedback.blockReason}` };
  const candidate = parsed.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  const textPart = parts.find((p) => p.text)?.text;
  if (!imagePart?.inlineData?.data) {
    const finish = candidate?.finishReason;
    if (finish && BLOCKED_FINISH.has(finish)) return { image: null, code: 'blocked', reason: `bloqueado: ${finish}` };
    const why = finish && finish !== 'STOP' ? finish : textPart ? `só texto: ${textPart.slice(0, 120)}` : 'sem imagem na resposta';
    return { image: null, code: 'no_image', reason: why };
  }
  return {
    image: { data: Buffer.from(imagePart.inlineData.data, 'base64'), mimeType: imagePart.inlineData.mimeType || 'image/png' },
    text: textPart,
  };
}
