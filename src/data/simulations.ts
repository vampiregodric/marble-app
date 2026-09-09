import { useMemo } from 'react';
import { Platform } from 'react-native';
import { collection, deleteDoc, doc, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  COLLECTIONS,
  Sample,
  SIMULATION_LIMITS,
  Simulation,
  SimulationImage,
  SimulationKind,
  SimulationSource,
  Work,
  simulationKindOf,
} from '../firebase/models';
import { useFirestoreDoc, useFirestoreList, DocState, ListState } from './firestoreHooks';

// Simulações "como ficaria" (Secção 16). O cliente cria o doc com a foto já
// no Cloudinary e estado 'pending'; a Cloud Function onSimulationWritten
// gera o resultado e escreve `result`/`status`, que a app vê em tempo real
// (useSimulation). O cliente só volta a tocar no doc para o ligar a um
// pedido de orçamento (`requestId`) ou para o apagar. Ver Simulation em
// models.ts e a match /simulations em firestore.rules.

const simulationsCol = collection(db, COLLECTIONS.simulations);

// "As tuas simulações" no Perfil. `uid` a null → lista vazia sem escuta.
export function useMySimulations(uid: string | null | undefined, max = 30): ListState<Simulation> {
  const q = useMemo(
    () => (uid ? query(simulationsCol, where('clientId', '==', uid), orderBy('createdAt', 'desc'), limit(max)) : null),
    [uid, max]
  );
  return useFirestoreList<Simulation>(q);
}

// Uma simulação pelo ID, em tempo real — é assim que o ecrã vê o resultado
// chegar. `missing` cobre "não existe" e "não é tua".
export function useSimulation(id: string | undefined): DocState<Simulation> {
  const ref = useMemo(() => (id ? doc(simulationsCol, id) : null), [id]);
  return useFirestoreDoc<Simulation>(ref);
}

// O ID é gerado ANTES de gravar, para a foto subir com a tag
// `simulation_<id>` (é por ela que a Function apaga os ficheiros).
export function newSimulationId(): string {
  return doc(simulationsCol).id;
}

function platform(): Simulation['platform'] {
  return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : undefined;
}

function clean<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined && v !== '') out[k] = v;
  return out as T;
}

// A amostra escolhida, copiada para a simulação (a amostra pode ser
// despublicada depois e a simulação continua legível).
export function sourceFromSample(sample: Sample): SimulationSource {
  return clean({
    type: 'sample',
    id: sample.id,
    name: sample.name.slice(0, 120),
    photoUrl: sample.photoUrl,
    thumbnailUrl: sample.thumbnailUrl,
    service: sample.service,
    brand: sample.brand,
    finish: sample.finish,
  }) as SimulationSource;
}

// Um trabalho do portfólio como amostra ("Ver no meu chão/carro" no
// Detalhe): a capa é a referência. Só trabalhos de chãos ou carros com foto.
export function sourceFromWork(work: Work): SimulationSource | null {
  if (!work.photoUrl || !simulationKindOf(work.category)) return null;
  const cover = (work.media ?? []).find((m) => m.type === 'photo' && m.url === work.photoUrl);
  return clean({
    type: 'work',
    id: work.id,
    name: work.title.slice(0, 120),
    photoUrl: work.photoUrl,
    thumbnailUrl: cover?.thumbnailUrl,
    service: work.services?.[0],
    brand: work.brands?.[0],
  }) as SimulationSource;
}

export type NewSimulationInput = {
  kind: SimulationKind;
  photo: SimulationImage;
  source: SimulationSource;
};

// Grava a simulação com EXATAMENTE os campos que as regras aceitam na
// criação (validNewSimulation). O resto é da Function.
export async function createSimulation(id: string, uid: string, input: NewSimulationInput): Promise<void> {
  const data: Record<string, unknown> = {
    clientId: uid,
    kind: input.kind,
    photo: input.photo,
    source: input.source,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const p = platform();
  if (p) data.platform = p;
  await setDoc(doc(simulationsCol, id), data);
}

// Depois de enviar o pedido de orçamento com a simulação anexada: as
// regras só deixam o dono mudar `requestId` (+ updatedAt).
export async function attachSimulationToRequest(id: string, requestId: string): Promise<void> {
  await updateDoc(doc(simulationsCol, id), { requestId, updatedAt: serverTimestamp() });
}

// Apagar: a Function apaga os ficheiros no Cloudinary pela tag.
export async function deleteSimulation(id: string): Promise<void> {
  await deleteDoc(doc(simulationsCol, id));
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Quantas simulações o cliente pediu nas últimas 24 h (pela lista que o
// Perfil já escuta). A app avisa antes de gastar um upload; a Function é
// quem impõe o limite a sério (status 'limited').
export function simulationsInLastDay(list: Simulation[], now: number = Date.now()): number {
  const cutoff = now - DAY_MS;
  return list.filter((s) => (s.createdAt?.toMillis?.() ?? 0) >= cutoff && s.status !== 'limited' && s.status !== 'capped').length;
}

export function dailyLimitReached(list: Simulation[]): boolean {
  return simulationsInLastDay(list) >= SIMULATION_LIMITS.perDayMax;
}
