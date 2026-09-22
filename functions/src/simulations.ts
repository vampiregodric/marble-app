import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CloudinaryConfig, deleteFilesByTag } from './cloudinary';
import { createNotification } from './notify';
import { addDays } from './time';
import { Sample, Simulation, SimulationError, SimulationErrorCode, SimulationImage, SimulationSource, Work } from './types';
import { generateEditedImage, ImageInput, VertexConfig } from './vertex';

// Simulador "como ficaria" (Secção 16). Reage a `simulations/{id}`:
// - criado (pela app, com a foto do cliente já no Cloudinary e estado
//   'pending') → consentimento, entradas, tectos (por cliente e global, por
//   dia de Lisboa, em contadores que o cliente não apaga), pede ao modelo
//   de imagem (Vertex AI) a foto com a amostra aplicada, guarda o resultado
//   no Cloudinary (upload unsigned, o mesmo preset da app, com a tag da
//   simulação) e escreve `result`/`status` — a app escuta o doc;
// - apagado (equipa, retenção, conta apagada) → ficheiros fora do
//   Cloudinary pela tag `simulation_<id>`.
// E o job diário: simulações escondidas pelo cliente ("Apagar simulação"
// na app é um `hiddenAt`, não um delete) ou sem pedido de orçamento há
// mais de 90 dias são apagadas (RETENTION.simulationDays em
// src/legal/texts.ts da app); 'pending' há mais de 1 h fica 'failed'.
// Decisões do Fábio (2026-09-09): 5 por cliente e dia, 90 dias, Vertex AI,
// a equipa vê todas (backoffice, página Simulações).
// Endurecido a 2026-09-13 (auditoria 2026-09-12, Pacote 5): SEG-A-01,
// SEG-A-06, SEG-A-07, SEG-A-13, SEG-A-18, RGPD-07, QUA-01.

export type Log = (msg: string) => void;

export const SIMULATION_PER_DAY = 5;
export const SIMULATION_RETENTION_DAYS = 90;
// 'pending' há mais de isto sem a Function acabar → 'failed' (timeout) no
// job diário (SEG-A-18: a Function pode morrer aos 180 s sem escrever).
export const SIMULATION_STALE_MS = 60 * 60 * 1000;
// Prazo interno da Function para imagens + modelo + upload: escreve
// `failed: 'timeout'` antes de o Firebase a matar aos 180 s.
export const SIMULATION_DEADLINE_MS = 150_000;
// Cada imagem de entrada: 15 s e 10 MB no máximo (a app sobe a 1600 px;
// a versão que vai ao modelo é ainda mais pequena).
const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Dias de contadores guardados por cliente/global (os antigos apagam-se ao
// escrever); o que interessa é só o dia de hoje.
const USAGE_KEEP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// Os tectos contam por dia civil em Lisboa ("as simulações de hoje" na app).
export const SIMULATION_TIME_ZONE = 'Europe/Lisbon';
// Lado maior das imagens enviadas ao modelo: chega para o resultado a 1K e
// mantém o pedido pequeno (a foto da app já vem a 1600 px).
const INPUT_WIDTH = 1024;

// Contadores dos tectos (SEG-A-01): fora de `simulations`, onde o cliente
// não chega (a coleção `system` recusa tudo nas regras). O global vive em
// `system/simulationGuard.days.{AAAA-MM-DD}` (com o estado do alerta
// diário à equipa, como `system/requestGuard` nos pedidos); o de cada
// cliente em `system/simulationUsage/clients/{uid}.days.{AAAA-MM-DD}`.
// Incrementam-se numa transação ANTES de chamar o Vertex — apagar ou
// esconder simulações não os altera.
export const SIMULATION_GUARD_DOC = 'system/simulationGuard';
export const SIMULATION_USAGE_COLLECTION = 'system/simulationUsage/clients';

export function simulationTag(id: string): string {
  return `simulation_${id}`;
}

export type SimulationDeps = {
  // null = Vertex não configurado (sem projeto): a simulação fica 'failed'.
  vertex: VertexConfig | null;
  // Só para APAGAR ficheiros (tag). Sem segredos, fica registado nos logs.
  cloudinary: CloudinaryConfig | null;
  // Cloud name do Cloudinary da Marble: só imagens daqui vão ao modelo.
  cloudName: string;
  // Upload unsigned do resultado — o mesmo preset que a app usa.
  uploadPreset: string;
  // Tecto global por dia (SIMULATION_DAILY_CAP); 0/ausente = desligado.
  dailyCap?: number | null;
};

export type SimulationSummary = { checked: number; deleted: number; hidden: number; stale: number };

const GUARD_TEXTS = {
  dailyCap(total: number, cap: number) {
    return {
      title: `Simulador no limite: ${total} simulações hoje`,
      description:
        `Acima do tecto de ${cap} por dia (SIMULATION_DAILY_CAP). Até amanhã (hora de Lisboa), as simulações novas ficam sem resultado ` +
        '("limite de hoje" na app, com a comparação lado a lado). Se for uso real, sobe o tecto em functions/.env e faz deploy.',
    };
  },
};

function clean(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) out[k] = v;
  return out;
}

// "AAAA-MM-DD" do dia civil em Lisboa: a chave dos contadores.
export function dayKey(now: Date, timeZone: string = SIMULATION_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function cloudinaryPrefix(cloudName: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/`;
}

// Só URLs de entrega do Cloudinary da Marble entram na Function (SEG-A-06):
// nada de ir buscar o que o cliente escrever. As regras impõem o mesmo
// prefixo na criação; isto é a segunda barreira (docs antigos, Admin SDK).
export function isMarbleImageUrl(url: unknown, cloudName: string): url is string {
  return typeof url === 'string' && url.length <= 600 && url.startsWith(cloudinaryPrefix(cloudName)) && url.length > cloudinaryPrefix(cloudName).length;
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
// INPUT_WIDTH px, em JPEG. Quem chama já verificou o prefixo
// (isMarbleImageUrl); outros URLs voltam como estão.
export function modelInputUrl(url: string): string {
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!m) return url;
  let rest = m[2];
  const first = rest.split('/')[0];
  if (/^(?:[a-z]{1,2}_[^/,]+)(?:,[a-z]{1,2}_[^/,]+)*$/.test(first) && /(^|,)[cwhqfgl]_/.test(first)) rest = rest.slice(first.length + 1);
  return `${m[1]}c_limit,w_${INPUT_WIDTH},q_auto:good,f_jpg/${rest}`;
}

// Vai buscar uma imagem ao Cloudinary com prazo e tecto de tamanho
// (SEG-A-06). Lança SimulationError('fetch_failed') com o detalhe para os
// logs; um abort vindo de `signal` (prazo interno) sobe tal como está.
async function fetchImage(url: string, signal?: AbortSignal): Promise<ImageInput> {
  const short = url.slice(0, 120);
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(FETCH_TIMEOUT_MS), ...(signal ? [signal] : [])]) });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SimulationError('fetch_failed', `não foi possível obter a imagem (${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}): ${short}`);
  }
  if (!res.ok) throw new SimulationError('fetch_failed', `não foi possível obter a imagem (${res.status}): ${short}`);
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_IMAGE_BYTES) throw new SimulationError('fetch_failed', `imagem com ${declared} bytes (máximo ${MAX_IMAGE_BYTES}): ${short}`);
  const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!mimeType.startsWith('image/')) throw new SimulationError('fetch_failed', `content-type ${mimeType} não é imagem: ${short}`);
  const data = Buffer.from(await res.arrayBuffer());
  if (data.byteLength > MAX_IMAGE_BYTES) throw new SimulationError('fetch_failed', `imagem com ${data.byteLength} bytes (máximo ${MAX_IMAGE_BYTES}): ${short}`);
  return { data, mimeType };
}

// A amostra ou o trabalho de verdade, lidos pela Function (SEG-A-07): o
// texto que entra na instrução ao modelo e a foto de referência são os da
// EQUIPA (samples/{id} ou works/{id} publicado), não a cópia que o cliente
// escreveu em `source`. Sem doc, não publicado, de outra categoria ou com
// foto fora do Cloudinary → SimulationError('bad_source').
export async function resolveSource(db: Firestore, sim: Simulation, cloudName: string): Promise<SimulationSource> {
  const src = sim.source ?? ({} as SimulationSource);
  const col = src.type === 'work' ? 'works' : src.type === 'sample' ? 'samples' : null;
  if (!col || typeof src.id !== 'string' || !src.id) throw new SimulationError('bad_source', `source inválida (${JSON.stringify(src).slice(0, 120)})`);
  const snap = await db.collection(col).doc(src.id).get();
  if (!snap.exists) throw new SimulationError('bad_source', `${col}/${src.id} não existe`);
  const expected = sim.kind === 'floor' ? 'Epoxy Floors' : 'Automotive';
  if (col === 'works') {
    const work = snap.data() as Work;
    if (work.published !== true) throw new SimulationError('bad_source', `works/${src.id} não está publicado`);
    if (work.category !== expected) throw new SimulationError('bad_source', `works/${src.id} é de ${work.category}, não de ${expected}`);
    if (!isMarbleImageUrl(work.photoUrl, cloudName)) throw new SimulationError('bad_source', `works/${src.id}: capa fora do Cloudinary da Marble`);
    return withTags({ type: 'work', id: src.id, name: String(work.title ?? '').slice(0, 120), photoUrl: work.photoUrl }, { service: work.services?.[0], brand: work.brands?.[0] });
  }
  const sample = snap.data() as Sample;
  if (sample.published !== true) throw new SimulationError('bad_source', `samples/${src.id} não está publicada`);
  if (sample.category !== expected) throw new SimulationError('bad_source', `samples/${src.id} é de ${sample.category}, não de ${expected}`);
  if (!isMarbleImageUrl(sample.photoUrl, cloudName)) throw new SimulationError('bad_source', `samples/${src.id}: foto fora do Cloudinary da Marble`);
  return withTags({ type: 'sample', id: src.id, name: String(sample.name ?? '').slice(0, 120), photoUrl: sample.photoUrl }, { service: sample.service, brand: sample.brand, finish: sample.finish });
}

// Junta as tags que existem (sem `undefined`, que o Firestore recusa).
function withTags(base: SimulationSource, tags: Pick<SimulationSource, 'service' | 'brand' | 'finish'>): SimulationSource {
  const out: SimulationSource = { ...base };
  if (typeof tags.service === 'string' && tags.service) out.service = tags.service.slice(0, 40);
  if (typeof tags.brand === 'string' && tags.brand) out.brand = tags.brand.slice(0, 60);
  if (tags.finish === 'gloss' || tags.finish === 'satin' || tags.finish === 'matte') out.finish = tags.finish;
  return out;
}

// Ids de WORK_SERVICES ('metallic-epoxy', 'ppf-colour') como texto.
function serviceWords(id: string | undefined): string | null {
  return id ? id.replace(/-/g, ' ') : null;
}

// A instrução ao modelo, em inglês (é o que os modelos seguem melhor).
// Primeira imagem = a foto do cliente; segunda = a amostra (ou a capa de
// um trabalho real, quando o cliente veio do Detalhe). `source` é a versão
// resolvida pela Function (resolveSource) — texto da equipa, nunca do
// cliente.
export function buildPrompt(kind: Simulation['kind'], source: SimulationSource): string {
  const what = [source.name, serviceWords(source.service), source.finish ? `${source.finish} finish` : null, source.brand ? `by ${source.brand}` : null]
    .filter(Boolean)
    .join(', ');
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
async function uploadResult(deps: SimulationDeps, id: string, image: ImageInput, signal?: AbortSignal): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', `data:${image.mimeType};base64,${image.data.toString('base64')}`);
  form.append('upload_preset', deps.uploadPreset);
  form.append('tags', `simulation,${simulationTag(id)},result`);
  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${deps.cloudName}/image/upload`, { method: 'POST', body: form, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SimulationError('upload_failed', `Cloudinary (upload do resultado): ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 200);
    try {
      const body = JSON.parse(text) as { error?: { message?: string } };
      if (body.error?.message) msg = body.error.message;
    } catch {
      /* sem JSON */
    }
    throw new SimulationError('upload_failed', `Cloudinary (upload do resultado) respondeu ${res.status}: ${msg}`);
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

export type SlotOutcome = { status: 'ok'; used: number; total: number } | { status: 'limited'; used: number } | { status: 'capped'; total: number };

// Chaves de dias com mais de USAGE_KEEP_DAYS, para apagar ao escrever.
function staleDayKeys(days: Record<string, unknown> | undefined, today: string): string[] {
  if (!days) return [];
  const cutoff = new Date(`${today}T00:00:00Z`).getTime() - USAGE_KEEP_DAYS * DAY_MS;
  return Object.keys(days).filter((k) => {
    const t = new Date(`${k}T00:00:00Z`).getTime();
    return Number.isFinite(t) && t < cutoff;
  });
}

// Reserva um lugar nos tectos do dia (por cliente e global) numa transação:
// lê os dois contadores, recusa se algum está cheio, senão incrementa os
// dois. Cinco pedidos em paralelo ficam em fila aqui — só passam os que
// cabem. Nada disto depende dos docs em `simulations` existirem.
export async function reserveSimulationSlot(db: Firestore, clientId: string, day: string, cap: number, now: Date): Promise<SlotOutcome> {
  const usageRef = db.collection(SIMULATION_USAGE_COLLECTION).doc(clientId);
  const guardRef = db.doc(SIMULATION_GUARD_DOC);
  const ts = Timestamp.fromDate(now);
  return db.runTransaction(async (tx) => {
    const [usage, guard] = await Promise.all([tx.get(usageRef), tx.get(guardRef)]);
    const usageDays = usage.data()?.days as Record<string, unknown> | undefined;
    const guardDays = guard.data()?.days as Record<string, unknown> | undefined;
    const used = Number(usageDays?.[day] ?? 0);
    if (used >= SIMULATION_PER_DAY) return { status: 'limited', used };
    const total = Number(guardDays?.[day] ?? 0);
    if (cap > 0 && total >= cap) return { status: 'capped', total };
    const usagePatch: Record<string, unknown> = { [day]: FieldValue.increment(1) };
    for (const k of staleDayKeys(usageDays, day)) usagePatch[k] = FieldValue.delete();
    const guardPatch: Record<string, unknown> = { [day]: FieldValue.increment(1) };
    for (const k of staleDayKeys(guardDays, day)) guardPatch[k] = FieldValue.delete();
    tx.set(usageRef, { days: usagePatch, total: FieldValue.increment(1), lastAt: ts, updatedAt: ts }, { merge: true });
    tx.set(guardRef, { days: guardPatch, total: FieldValue.increment(1), lastAt: ts, updatedAt: ts }, { merge: true });
    return { status: 'ok', used: used + 1, total: total + 1 };
  });
}

export async function handleSimulationCreated(db: Firestore, sim: Simulation, deps: SimulationDeps, now: Date, log: Log = () => {}): Promise<void> {
  const ref = db.collection('simulations').doc(sim.id);
  // O trigger pode repetir-se: relê e sai se já foi processado.
  const fresh = await ref.get();
  if (!fresh.exists || fresh.data()?.processedAt || fresh.data()?.status !== 'pending') return;
  const ts = Timestamp.fromDate(now);
  // Falha com código curto no doc (o cliente lê-o) e o detalhe só no log.
  const fail = async (code: SimulationErrorCode, detail: string, extra: Record<string, unknown> = {}) => {
    await ref.update(clean({ status: 'failed', error: code, processedAt: ts, updatedAt: ts, ...extra }));
    log(`simulação ${sim.id}: failed (${code}) — ${detail}`);
  };

  // 1. Consentimento (RGPD-07): a base legal é o consentimento gravado em
  //    clients/{uid}.consent.simulatorVersion pela app. Sem ele, a foto
  //    não sai daqui — venha o doc de onde vier.
  const client = await db.collection('clients').doc(sim.clientId).get();
  const consent = client.data()?.consent as { simulatorVersion?: unknown } | undefined;
  if (!client.exists || typeof consent?.simulatorVersion !== 'string' || !consent.simulatorVersion) {
    await fail('no_consent', 'sem consentimento do simulador registado em clients/{uid}.consent.simulatorVersion');
    return;
  }

  // 2. Entradas (SEG-A-06/07): a foto do cliente tem de estar no Cloudinary
  //    da Marble; a amostra/trabalho é lida daqui (texto e foto da equipa).
  if (!isMarbleImageUrl(sim.photo?.url, deps.cloudName)) {
    await fail('bad_photo', `photo.url fora do Cloudinary da Marble: ${String(sim.photo?.url).slice(0, 120)}`);
    return;
  }
  let source: SimulationSource;
  try {
    source = await resolveSource(db, sim, deps.cloudName);
  } catch (err) {
    if (err instanceof SimulationError) {
      await fail(err.code, err.message);
      return;
    }
    throw err;
  }

  // 3. Tectos (SEG-A-01): SIMULATION_PER_DAY por cliente e SIMULATION_DAILY_CAP
  //    no projeto, por dia de Lisboa, em contadores fora do alcance do
  //    cliente. Reservam-se ANTES de gastar dinheiro; 'limited'/'capped'
  //    não gastam nada.
  const day = dayKey(now);
  const slot = await reserveSimulationSlot(db, sim.clientId, day, deps.dailyCap ?? 0, now);
  if (slot.status === 'limited') {
    await ref.update({ status: 'limited', processedAt: ts, updatedAt: ts });
    log(`simulação ${sim.id}: limite do cliente (${slot.used} em ${day})`);
    return;
  }
  if (slot.status === 'capped') {
    await ref.update({ status: 'capped', processedAt: ts, updatedAt: ts });
    const alertId = await alertDailyCap(db, sim, slot.total, deps.dailyCap ?? 0, now);
    log(`simulação ${sim.id}: tecto diário (${slot.total} em ${day}, tecto ${deps.dailyCap})${alertId ? ` — alerta à equipa ${alertId}` : ' — equipa já avisada hoje'}`);
    return;
  }

  if (!deps.vertex) {
    await fail('vertex_unavailable', 'Vertex AI não configurado — fica a comparação lado a lado');
    return;
  }

  // 4. O modelo: foto do cliente + amostra → foto editada, com um prazo
  //    interno (SEG-A-18) que aborta imagens, modelo e upload de uma vez.
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIMULATION_DEADLINE_MS);
  const durationMs = () => Date.now() - started;
  try {
    const [photo, sample] = await Promise.all([fetchImage(modelInputUrl(sim.photo.url), controller.signal), fetchImage(modelInputUrl(source.photoUrl), controller.signal)]);
    const outcome = await generateEditedImage(deps.vertex, buildPrompt(sim.kind, source), [photo, sample], controller.signal);
    if (!outcome.image) {
      await fail(outcome.code, `sem imagem (${outcome.reason}) em ${durationMs()} ms`, { model: deps.vertex.model, durationMs: durationMs() });
      return;
    }
    // 5. Guardar o resultado e entregar.
    const up = await uploadResult(deps, sim.id, outcome.image, controller.signal);
    const result = resultImage(deps.cloudName, up.public_id, up.version);
    await ref.update(clean({ status: 'done', result, model: deps.vertex.model, durationMs: durationMs(), processedAt: ts, updatedAt: ts, error: FieldValue.delete() }));
    log(`simulação ${sim.id} (${sim.kind}, ${source.name}): pronta em ${durationMs()} ms → ${result.publicId}`);
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const code: SimulationErrorCode = controller.signal.aborted ? 'timeout' : err instanceof SimulationError ? err.code : 'error';
    await fail(code, `${code === 'timeout' ? `prazo interno de ${SIMULATION_DEADLINE_MS / 1000} s excedido — ` : ''}${msg}`, { model: deps.vertex.model, durationMs: durationMs() });
  } finally {
    clearTimeout(timer);
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

// Job diário, três passos:
// - escondidas pelo cliente ("Apagar simulação" na app = `hiddenAt`) e sem
//   pedido de orçamento → apagadas de facto (o doc e, pelo trigger, os
//   ficheiros); com pedido, ficam até o pedido ser anonimizado;
// - sem pedido há mais de SIMULATION_RETENTION_DAYS → apagadas;
// - 'pending' há mais de SIMULATION_STALE_MS (a Function morreu sem
//   escrever) → 'failed' com `timeout`, para deixarem de aparecer "a gerar".
export async function runSimulationRetention(db: Firestore, now: Date, log: Log = () => {}): Promise<SimulationSummary> {
  const summary: SimulationSummary = { checked: 0, deleted: 0, hidden: 0, stale: 0 };
  const ts = Timestamp.fromDate(now);
  const gone = new Set<string>();

  const hidden = await db.collection('simulations').where('hiddenAt', '<=', ts).get();
  for (const d of hidden.docs) {
    if (d.data().requestId) continue;
    await d.ref.delete();
    gone.add(d.id);
    summary.hidden++;
    log(`simulação ${d.id}: apagada (escondida pelo cliente, sem pedido)`);
  }

  const cutoff = Timestamp.fromDate(addDays(now, -SIMULATION_RETENTION_DAYS));
  const old = await db.collection('simulations').where('createdAt', '<=', cutoff).get();
  for (const d of old.docs) {
    if (gone.has(d.id)) continue;
    summary.checked++;
    if (d.data().requestId) continue;
    await d.ref.delete();
    gone.add(d.id);
    summary.deleted++;
    log(`simulação ${d.id}: apagada (${SIMULATION_RETENTION_DAYS} dias sem pedido)`);
  }

  const staleBefore = now.getTime() - SIMULATION_STALE_MS;
  const pending = await db.collection('simulations').where('status', '==', 'pending').get();
  for (const d of pending.docs) {
    if (gone.has(d.id) || d.data().processedAt) continue;
    const created = (d.data().createdAt as Timestamp | undefined)?.toMillis?.() ?? 0;
    if (created > staleBefore) continue;
    await d.ref.update({ status: 'failed', error: 'timeout', processedAt: ts, updatedAt: ts });
    summary.stale++;
    log(`simulação ${d.id}: 'pending' desde ${new Date(created).toISOString()} → failed (timeout)`);
  }
  return summary;
}
