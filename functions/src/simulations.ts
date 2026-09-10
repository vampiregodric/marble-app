import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CloudinaryConfig, deleteFilesByTag } from './cloudinary';
import { createNotification } from './notify';
import { addDays } from './time';
import { Simulation, SimulationImage, SimulationSource } from './types';
import { generateEditedImage, ImageInput, VertexConfig } from './vertex';

// Simulador "como ficaria" (Secção 16). Reage a `simulations/{id}`:
// - criado (pela app, com a foto do cliente já no Cloudinary e estado
//   'pending') → tectos (por cliente em 24 h; global por dia), pede ao
//   modelo de imagem (Vertex AI) a foto com a amostra aplicada, guarda o
//   resultado no Cloudinary (upload unsigned, o mesmo preset da app, com a
//   tag da simulação) e escreve `result`/`status` — a app escuta o doc;
// - apagado (cliente, equipa ou retenção) → ficheiros fora do Cloudinary
//   pela tag `simulation_<id>`.
// E o job diário: simulações sem pedido de orçamento com mais de 90 dias
// são apagadas (RETENTION.simulationDays em src/legal/texts.ts da app).
// Decisões do Fábio (2026-09-09): 5 por cliente e dia, 90 dias, Vertex AI,
// a equipa vê todas (backoffice, página Simulações).

export type Log = (msg: string) => void;

export const SIMULATION_PER_DAY = 5;
export const SIMULATION_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
// Lado maior das imagens enviadas ao modelo: chega para o resultado a 1K e
// mantém o pedido pequeno (a foto da app já vem a 1600 px).
const INPUT_WIDTH = 1024;

// Estado do tecto diário: quando foi o último alerta à equipa (como
// `system/requestGuard` nos pedidos). Só o Admin SDK lá chega.
export const SIMULATION_GUARD_DOC = 'system/simulationGuard';

export function simulationTag(id: string): string {
  return `simulation_${id}`;
}

export type SimulationDeps = {
  // null = Vertex não configurado (sem projeto): a simulação fica 'failed'.
  vertex: VertexConfig | null;
  // Só para APAGAR ficheiros (tag). Sem segredos, fica registado nos logs.
  cloudinary: CloudinaryConfig | null;
  // Upload unsigned do resultado — o mesmo preset que a app usa.
  cloudName: string;
  uploadPreset: string;
  // Tecto global por 24 h (SIMULATION_DAILY_CAP); 0/ausente = desligado.
  dailyCap?: number | null;
};

export type SimulationSummary = { checked: number; deleted: number };

const GUARD_TEXTS = {
  dailyCap(total: number, cap: number) {
    return {
      title: `Simulador no limite: ${total} simulações em 24 h`,
      description:
        `Acima do tecto de ${cap} por dia (SIMULATION_DAILY_CAP). Até o volume das últimas 24 h baixar, as simulações novas ficam sem resultado ` +
        '("limite de hoje" na app, com a comparação lado a lado). Se for uso real, sobe o tecto em functions/.env e faz deploy.',
    };
  },
};

function clean(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) out[k] = v;
  return out;
}

export async function handleSimulationWritten(
  db: Firestore,
  before: Simulation | null,
  after: Simulation | null,
  deps: SimulationDeps,
  now: Date,
  log: Log = () => {}
): Promise<void> {
  if (!after) {
    if (before) await cleanupFiles(deps.cloudinary, before.id, log);
    return;
  }
  if (!before) await handleSimulationCreated(db, after, deps, now, log);
}

async function cleanupFiles(cfg: CloudinaryConfig | null, id: string, log: Log): Promise<void> {
  if (!cfg) {
    log(`cloudinary: sem credenciais — ficheiros de ${simulationTag(id)} ficam por apagar (manual, ver README do backoffice)`);
    return;
  }
  const n = await deleteFilesByTag(cfg, simulationTag(id));
  log(`cloudinary ${simulationTag(id)}: ${n} ficheiro(s) apagado(s)`);
}

// Reescreve um URL de entrega do Cloudinary (c_limit,w_1600,… da app ou
// c_fill,… do backoffice) para a versão que vai ao modelo: inteira, até
// INPUT_WIDTH px, em JPEG. URLs de outros sítios vão como estão.
export function modelInputUrl(url: string): string {
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!m) return url;
  let rest = m[2];
  const first = rest.split('/')[0];
  if (/^(?:[a-z]{1,2}_[^/,]+)(?:,[a-z]{1,2}_[^/,]+)*$/.test(first) && /(^|,)[cwhqfgl]_/.test(first)) rest = rest.slice(first.length + 1);
  return `${m[1]}c_limit,w_${INPUT_WIDTH},q_auto:good,f_jpg/${rest}`;
}

async function fetchImage(url: string): Promise<ImageInput> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`não foi possível obter a imagem (${res.status}): ${url.slice(0, 120)}`);
  const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { data: Buffer.from(await res.arrayBuffer()), mimeType };
}

// A instrução ao modelo, em inglês (é o que os modelos seguem melhor).
// Primeira imagem = a foto do cliente; segunda = a amostra (ou a capa de
// um trabalho real, quando o cliente veio do Detalhe).
export function buildPrompt(kind: Simulation['kind'], source: SimulationSource): string {
  const what = [source.name, source.service, source.finish ? `${source.finish} finish` : null, source.brand ? `by ${source.brand}` : null].filter(Boolean).join(', ');
  const ref =
    source.type === 'work'
      ? `The SECOND image is a photo of a real ${kind === 'floor' ? 'floor' : 'car'} finished by the same company (${what}); use its finish as the reference.`
      : `The SECOND image is a close-up sample of the finish to apply (${what}).`;
  if (kind === 'floor') {
    return (
      'You are preparing a realistic visualisation for an epoxy flooring company. ' +
      'The FIRST image is a customer photo of a room, garage or shop as it is today. ' +
      ref +
      ' Edit the FIRST image: replace ONLY the floor surface with this epoxy finish — same colours, pattern and texture as the reference, ' +
      'with the glossy sealed look of a professionally installed epoxy floor, following the perspective of the room, with realistic reflections of walls and objects and natural shadows. ' +
      'Keep walls, doors, furniture, vehicles, objects, people, lighting, camera angle and framing exactly as in the FIRST image. Do not add, remove or move anything else. ' +
      'Output only the edited photo.'
    );
  }
  return (
    'You are preparing a realistic visualisation for a car wrapping and paint protection film studio. ' +
    'The FIRST image is a customer photo of their car as it is today. ' +
    ref +
    ' Edit the FIRST image: change ONLY the painted bodywork of the car to this colour and finish, keeping the reflections and highlights consistent with the finish. ' +
    'Keep the car shape, windows, lights, wheels, tyres, trim, badges, number plate, background, lighting, camera angle and framing exactly as in the FIRST image. Do not add, remove or move anything else. ' +
    'Output only the edited photo.'
  );
}

type UploadResponse = { public_id: string; version?: number };

// Sobe o resultado com o preset unsigned da app (não precisa dos segredos)
// e a tag da simulação, para ser apagado com ela.
async function uploadResult(deps: SimulationDeps, id: string, image: ImageInput): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', `data:${image.mimeType};base64,${image.data.toString('base64')}`);
  form.append('upload_preset', deps.uploadPreset);
  form.append('tags', `simulation,${simulationTag(id)},result`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${deps.cloudName}/image/upload`, { method: 'POST', body: form });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 200);
    try {
      const body = JSON.parse(text) as { error?: { message?: string } };
      if (body.error?.message) msg = body.error.message;
    } catch {
      /* sem JSON */
    }
    throw new Error(`Cloudinary (upload do resultado) respondeu ${res.status}: ${msg}`);
  }
  return JSON.parse(text) as UploadResponse;
}

// Selo "SIMULAÇÃO" gravado na entrega (canto inferior direito, dourado
// sobre fundo escuro): quando o cliente partilha a imagem, o aviso vai com
// ela. É uma transformação de URL — a app e o backoffice mostram este URL.
const LABEL = 'l_text:Arial_26_bold:SIMULA%C3%87%C3%83O,co_rgb:eccd8d,b_rgb:000000B3,g_south_east,x_14,y_12';
const LABEL_SMALL = 'l_text:Arial_16_bold:SIMULA%C3%87%C3%83O,co_rgb:eccd8d,b_rgb:000000B3,g_south_east,x_8,y_8';

export function resultImage(cloudName: string, publicId: string, version?: number): SimulationImage {
  const v = version ? `v${version}/` : '';
  return {
    url: `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_1600,q_auto,f_auto/${LABEL}/${v}${publicId}`,
    thumbnailUrl: `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_480,h_360,q_auto,f_auto/${LABEL_SMALL}/${v}${publicId}`,
    publicId,
  };
}

export async function handleSimulationCreated(db: Firestore, sim: Simulation, deps: SimulationDeps, now: Date, log: Log = () => {}): Promise<void> {
  const ref = db.collection('simulations').doc(sim.id);
  // O trigger pode repetir-se: relê e sai se já foi processado.
  const fresh = await ref.get();
  if (!fresh.exists || fresh.data()?.processedAt || fresh.data()?.status !== 'pending') return;
  const ts = Timestamp.fromDate(now);
  const since = addDays(now, -1).getTime();

  // 1. Por cliente: SIMULATION_PER_DAY nas últimas 24 h (além desta). As
  //    que ficaram 'limited'/'capped' não gastaram nada e não contam.
  //    Usa o índice clientId/createdAt da app.
  const recent = await db.collection('simulations').where('clientId', '==', sim.clientId).orderBy('createdAt', 'desc').limit(SIMULATION_PER_DAY + 6).get();
  const others = recent.docs.filter((d) => {
    if (d.id === sim.id) return false;
    const data = d.data();
    if (data.status === 'limited' || data.status === 'capped') return false;
    return ((data.createdAt as Timestamp | undefined)?.toMillis?.() ?? 0) >= since;
  }).length;
  if (others >= SIMULATION_PER_DAY) {
    await ref.update({ status: 'limited', processedAt: ts, updatedAt: ts });
    log(`simulação ${sim.id}: limite do cliente (${others} em 24 h)`);
    return;
  }

  // 2. Tecto global por dia (custo previsível): contagem por agregação.
  if (deps.dailyCap && deps.dailyCap > 0) {
    const total = (await db.collection('simulations').where('createdAt', '>=', Timestamp.fromMillis(since)).count().get()).data().count;
    if (total > deps.dailyCap) {
      await ref.update({ status: 'capped', processedAt: ts, updatedAt: ts });
      const alertId = await alertDailyCap(db, sim, total, deps.dailyCap, now);
      log(`simulação ${sim.id}: tecto diário (${total} em 24 h, tecto ${deps.dailyCap})${alertId ? ` — alerta à equipa ${alertId}` : ' — equipa já avisada hoje'}`);
      return;
    }
  }

  if (!deps.vertex) {
    await ref.update({ status: 'failed', error: 'Vertex AI não configurado', processedAt: ts, updatedAt: ts });
    log(`simulação ${sim.id}: Vertex AI não configurado — fica a comparação lado a lado`);
    return;
  }

  // 3. O modelo: foto do cliente + amostra → foto editada.
  const started = Date.now();
  try {
    const [photo, sample] = await Promise.all([fetchImage(modelInputUrl(sim.photo.url)), fetchImage(modelInputUrl(sim.source.photoUrl))]);
    const outcome = await generateEditedImage(deps.vertex, buildPrompt(sim.kind, sim.source), [photo, sample]);
    const durationMs = Date.now() - started;
    if (!outcome.image) {
      await ref.update({ status: 'failed', error: outcome.reason.slice(0, 300), model: deps.vertex.model, durationMs, processedAt: ts, updatedAt: ts });
      log(`simulação ${sim.id}: sem imagem (${outcome.reason}) em ${durationMs} ms`);
      return;
    }
    // 4. Guardar o resultado e entregar.
    const up = await uploadResult(deps, sim.id, outcome.image);
    const result = resultImage(deps.cloudName, up.public_id, up.version);
    await ref.update(clean({ status: 'done', result, model: deps.vertex.model, durationMs, processedAt: ts, updatedAt: ts, error: FieldValue.delete() }));
    log(`simulação ${sim.id} (${sim.kind}, ${sim.source.name}): pronta em ${durationMs} ms → ${result.publicId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ref.update({ status: 'failed', error: msg.slice(0, 300), model: deps.vertex.model, durationMs: Date.now() - started, processedAt: ts, updatedAt: ts });
    log(`simulação ${sim.id}: falhou — ${msg}`);
  }
}

// Um alerta interno por dia, não um por simulação.
async function alertDailyCap(db: Firestore, sim: Simulation, total: number, cap: number, now: Date): Promise<string | null> {
  const guard = db.doc(SIMULATION_GUARD_DOC);
  const ts = Timestamp.fromDate(now);
  const last = ((await guard.get()).data()?.dailyCapAlertAt as Timestamp | undefined)?.toMillis?.() ?? 0;
  if (now.getTime() - last < DAY_MS) {
    await guard.set({ cappedSinceAlert: FieldValue.increment(1), lastCappedAt: ts, updatedAt: ts }, { merge: true });
    return null;
  }
  const id = await createNotification(db, { clientId: sim.clientId, type: 'team_alert', ...GUARD_TEXTS.dailyCap(total, cap) }, now);
  await guard.set({ dailyCapAlertAt: ts, dailyCapAlertId: id, cappedSinceAlert: 1, lastCappedAt: ts, updatedAt: ts }, { merge: true });
  return id;
}

// Conta apagada (app ou retenção) → todas as simulações do cliente. Apagar
// o doc dispara a limpeza dos ficheiros (handleSimulationWritten).
export async function deleteClientSimulations(db: Firestore, clientId: string, log: Log = () => {}): Promise<number> {
  const snap = await db.collection('simulations').where('clientId', '==', clientId).get();
  for (const d of snap.docs) await d.ref.delete();
  if (snap.size) log(`simulações de ${clientId}: ${snap.size} apagada(s) (conta apagada)`);
  return snap.size;
}

// Pedido anonimizado (12 meses depois de fechado) → as simulações que lhe
// estavam ligadas seguem o mesmo prazo.
export async function deleteRequestSimulations(db: Firestore, requestId: string, log: Log = () => {}): Promise<number> {
  const snap = await db.collection('simulations').where('requestId', '==', requestId).get();
  for (const d of snap.docs) await d.ref.delete();
  if (snap.size) log(`simulações do pedido ${requestId}: ${snap.size} apagada(s)`);
  return snap.size;
}

// Job diário: simulações sem pedido de orçamento com mais de
// SIMULATION_RETENTION_DAYS. Apagar o doc dispara a limpeza no Cloudinary.
export async function runSimulationRetention(db: Firestore, now: Date, log: Log = () => {}): Promise<SimulationSummary> {
  const summary: SimulationSummary = { checked: 0, deleted: 0 };
  const cutoff = Timestamp.fromDate(addDays(now, -SIMULATION_RETENTION_DAYS));
  const snap = await db.collection('simulations').where('createdAt', '<=', cutoff).get();
  for (const d of snap.docs) {
    summary.checked++;
    if (d.data().requestId) continue;
    await d.ref.delete();
    summary.deleted++;
    log(`simulação ${d.id}: apagada (${SIMULATION_RETENTION_DAYS} dias sem pedido)`);
  }
  return summary;
}
