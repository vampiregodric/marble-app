import { GoogleAuth } from 'google-auth-library';

// Modelo de imagem da Google pelo Vertex AI (Secção 16 — decisão do Fábio,
// 2026-09-09: Vertex AI no MESMO projeto Google Cloud do Firebase, e não
// uma chave da Gemini API: mesma fatura Blaze, mesmo contrato de
// tratamento de dados, sem segredo para guardar). A autenticação é a da
// própria conta de serviço — no Firebase, a das Functions (Application
// Default Credentials); localmente (scripts/runJobs.ts), a chave de dev.
//
// O que o Fábio faz uma vez por projeto (ver DEVELOPMENT.md, "Simulador"):
// ativar a API do Vertex AI e dar o papel "Vertex AI User" às contas de
// serviço. Sem isso a chamada responde 403 e a simulação fica 'failed' —
// a app mostra a comparação lado a lado.
//
// Sem SDK: um POST HTTPS a `generateContent` com as imagens em base64
// (a foto do cliente e a amostra) e a instrução em texto; a resposta traz
// a imagem editada em base64. Modelos com saída de imagem (Gemini
// "Nano Banana"): gemini-3.1-flash-image (por defeito), gemini-3-pro-image.

export type VertexConfig = {
  project: string;
  // 'global' (endpoint global), uma multi-região ('us' | 'eu') ou uma
  // região (ex: europe-west1) — nem todos os modelos de imagem existem em
  // todas; ver vertexHost().
  location: string;
  model: string;
  // Só local: ficheiro da chave de service account.
  keyFile?: string;
};

export type ImageInput = { data: Buffer; mimeType: string };

export type EditOutcome = { image: ImageInput; text?: string } | { image: null; reason: string };

let authCache: { key: string; auth: GoogleAuth } | null = null;

function googleAuth(cfg: VertexConfig): GoogleAuth {
  const key = cfg.keyFile ?? 'adc';
  if (!authCache || authCache.key !== key) {
    authCache = { key, auth: new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'], keyFile: cfg.keyFile }) };
  }
  return authCache.auth;
}

// Três tipos de endpoint (Google, "Deployment and endpoint locations" e
// "Data residency", lidos a 2026-09-13): 'global' processa em qualquer
// parte do mundo, sem garantia de residência; as multi-regiões 'us' e 'eu'
// (host aiplatform.<x>.rep.googleapis.com) garantem que o processamento
// fica dentro dessa jurisdição — 'eu' = só Estados-membros da UE; uma
// região (ex: europe-west1, host <região>-aiplatform.googleapis.com) fica
// nessa região. O gemini-3.1-flash-image existe em 'global', 'us' e 'eu',
// não em regiões soltas (auditoria 2026-09-12, RGPD-01).
export function vertexHost(location: string): string {
  if (location === 'global') return 'aiplatform.googleapis.com';
  if (location === 'us' || location === 'eu') return `aiplatform.${location}.rep.googleapis.com`;
  return `${location}-aiplatform.googleapis.com`;
}

export function vertexEndpoint(cfg: VertexConfig): string {
  return `https://${vertexHost(cfg.location)}/v1/projects/${cfg.project}/locations/${cfg.location}/publishers/google/models/${cfg.model}:generateContent`;
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

// Pede ao modelo a foto editada. Devolve a imagem (bytes + mime) ou o
// motivo de não haver imagem (bloqueio de segurança, resposta só com
// texto). Lança em erro HTTP — quem chama marca a simulação como 'failed'.
export async function generateEditedImage(cfg: VertexConfig, prompt: string, images: ImageInput[]): Promise<EditOutcome> {
  const client = await googleAuth(cfg).getClient();
  const token = (await client.getAccessToken()).token;
  if (!token) throw new Error('Vertex AI: sem token de acesso (credenciais da conta de serviço)');

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

  const res = await fetch(vertexEndpoint(cfg), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as GenerateResponse;
      if (parsed.error?.message) msg = `${parsed.error.status ?? res.status}: ${parsed.error.message.slice(0, 240)}`;
    } catch {
      /* corpo sem JSON */
    }
    throw new Error(`Vertex AI (${cfg.model}) respondeu ${res.status} — ${msg}`);
  }
  const parsed = JSON.parse(text) as GenerateResponse;
  if (parsed.promptFeedback?.blockReason) return { image: null, reason: `bloqueado: ${parsed.promptFeedback.blockReason}` };
  const candidate = parsed.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  const textPart = parts.find((p) => p.text)?.text;
  if (!imagePart?.inlineData?.data) {
    const why = candidate?.finishReason && candidate.finishReason !== 'STOP' ? candidate.finishReason : textPart ? `só texto: ${textPart.slice(0, 120)}` : 'sem imagem na resposta';
    return { image: null, reason: why };
  }
  return {
    image: { data: Buffer.from(imagePart.inlineData.data, 'base64'), mimeType: imagePart.inlineData.mimeType || 'image/png' },
    text: textPart,
  };
}
