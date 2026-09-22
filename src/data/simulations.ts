import { useMemo } from 'react';
import { Platform } from 'react-native';
import { collection, doc, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
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
// (useSimulation). Depois disso o cliente só volta a tocar no doc para o
// esconder ("Apagar simulação" = `hiddenAt`; o job diário apaga de facto).
// A ligação ao pedido de orçamento (`requestId`) é escrita pela Function
// quando o pedido é criado. Ver Simulation em models.ts e a
// match /simulations em firestore.rules.

const simulationsCol = collection(db, COLLECTIONS.simulations);

// "As tuas simulações" no Perfil. `uid` a null → lista vazia sem escuta.
// Vem TUDO, escondidas incluídas — os ecrãs mostram `visibleSimulations`
// e o aviso do limite diário conta todas (a Function também conta).
export function useMySimulations(uid: string | null | undefined, max = 30): ListState<Simulation> {
  const q = useMemo(
    () => (uid ? query(simulationsCol, where('clientId', '==', uid), orderBy('createdAt', 'desc'), limit(max)) : null),
    [uid, max]
  );
  return useFirestoreList<Simulation>(q);
}

// Uma simulação pelo ID, em tempo real — é assim que o ecrã vê o resultado
// chegar. `missing` cobre "não existe" e "não é tua"; escondida é o ecrã
// que trata (isHidden).
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
// despublicada depois e a simulação continua legível). A Function relê a
// amostra pelo `id` para a instrução ao modelo — esta cópia é para mostrar.
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

// "Apagar simulação": esconde (a única escrita que as regras deixam ao
// dono depois de criar). Deixa de aparecer na app; o job diário das
// Functions apaga o doc e os ficheiros no Cloudinary. Assim apagar não
// zera o limite diário nem tira a um pedido de orçamento as imagens que ele
// mostra (auditoria 2026-09-12, SEG-A-01 e QUA-01).
export async function hideSimulation(id: string): Promise<void> {
  await updateDoc(doc(simulationsCol, id), { hiddenAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

// Escondida = tem `hiddenAt`. Logo a seguir a esconder, a cache local dá o
// campo a `null` até o servidor confirmar o serverTimestamp — também conta.
export function isHidden(s: Simulation): boolean {
  return s.hiddenAt !== undefined;
}

export function visibleSimulations(list: Simulation[]): Simulation[] {
  return list.filter((s) => !isHidden(s));
}

// "AAAA-MM-DD" do dia civil em Lisboa — o mesmo dia que a Function usa nos
// contadores. Sem Intl (não deve acontecer no Hermes do SDK 57), o dia local.
export function lisbonDay(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  } catch {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

// Quantas simulações o cliente pediu hoje (dia de Lisboa), pela lista que o
// Perfil já escuta — escondidas incluídas, que a Function também as contou.
// As que ficaram 'limited'/'capped' não gastaram nada e não contam. A app
// avisa antes de gastar um upload; a Function é quem impõe o limite a sério
// (status 'limited').
export function simulationsToday(list: Simulation[], now: number = Date.now()): number {
  const today = lisbonDay(now);
  return list.filter((s) => {
    const created = s.createdAt?.toMillis?.();
    // Sem createdAt ainda (escrita pendente) = acabada de pedir = hoje.
    return (created === undefined || lisbonDay(created) === today) && s.status !== 'limited' && s.status !== 'capped';
  }).length;
}

export function dailyLimitReached(list: Simulation[]): boolean {
  return simulationsToday(list) >= SIMULATION_LIMITS.perDayMax;
}
