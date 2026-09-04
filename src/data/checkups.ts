import { useMemo } from 'react';
import { FirebaseError } from 'firebase/app';
import { doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  CHECKUP_AVAILABILITY_DEFAULT,
  CHECKUP_LIMITS,
  CHECKUP_WEEKDAYS,
  CheckupAvailability,
  CheckupPeriod,
  CheckupRequest,
  COLLECTIONS,
  Vehicle,
} from '../firebase/models';
import { useFirestoreDoc } from './firestoreHooks';
import { MONTHS_SHORT } from '../utils/dates';

// Agendamento de checkup (Secção 8): o que a app precisa de saber para o
// cliente escolher um dia — a disponibilidade da equipa (`settings/checkups`)
// transformada em opções concretas — e como ler o estado do pedido de um
// carro/chão para o Perfil.

export type Availability = Omit<CheckupAvailability, 'id' | 'updatedAt'>;

// Disponibilidade da equipa, em tempo real. Sem doc (a equipa ainda não
// definiu nada no backoffice) → o plano por defeito: seg–sex, manhã e
// tarde, 3 semanas, a partir de amanhã.
export function useCheckupAvailability(): { availability: Availability; loading: boolean } {
  const ref = useMemo(() => doc(db, COLLECTIONS.settings, 'checkups'), []);
  const { data, loading } = useFirestoreDoc<CheckupAvailability>(ref);
  const availability = useMemo<Availability>(() => {
    if (!data) return CHECKUP_AVAILABILITY_DEFAULT;
    return {
      weekly: data.weekly ?? CHECKUP_AVAILABILITY_DEFAULT.weekly,
      closedDays: Array.isArray(data.closedDays) ? data.closedDays : [],
      weeksAhead: clampInt(data.weeksAhead, 1, CHECKUP_LIMITS.weeksAheadMax, CHECKUP_AVAILABILITY_DEFAULT.weeksAhead),
      minDaysAhead: clampInt(data.minDaysAhead, 0, 30, CHECKUP_AVAILABILITY_DEFAULT.minDaysAhead),
    };
  }, [data]);
  return { availability, loading };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
}

// "2026-09-07" no calendário local do telemóvel (o cliente está em Portugal).
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// "2026-09-07" → Date local à meia-noite. null se o formato não bater.
export function parseDay(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type CheckupOption = { day: string; periods: CheckupPeriod[] };

// Os dias em que o cliente pode pedir checkup, a partir de hoje +
// antecedência mínima, até `weeksAhead` semanas: só os dias da semana com
// períodos abertos e que não estejam fechados.
export function checkupOptions(a: Availability, now: Date = new Date()): CheckupOption[] {
  const out: CheckupOption[] = [];
  const closed = new Set(a.closedDays);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + a.minDaysAhead);
  const total = a.weeksAhead * 7;
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const periods = a.weekly[CHECKUP_WEEKDAYS[d.getDay()]] ?? [];
    const key = dayKey(d);
    if (periods.length && !closed.has(key)) out.push({ day: key, periods: [...periods] });
  }
  return out;
}

export const PERIOD_LABEL: Record<CheckupPeriod, string> = { morning: 'Manhã', afternoon: 'Tarde' };

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// "seg, 7 set"
export function formatCheckupDay(day: string): string {
  const d = parseDay(day);
  if (!d) return day;
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`;
}

// Para os chips da folha: { "seg", "7 set" }.
export function splitCheckupDay(day: string): { weekday: string; date: string; weekdayLong: string } {
  const d = parseDay(day);
  if (!d) return { weekday: '', date: day, weekdayLong: day };
  return { weekday: WEEKDAYS_SHORT[d.getDay()], date: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`, weekdayLong: WEEKDAYS_LONG[d.getDay()] };
}

// "seg, 7 set, de manhã" ou, com hora da equipa, "seg, 7 set às 10:30" —
// o mesmo texto que as Cloud Functions escrevem nos alertas.
export function formatCheckupSlot(req: Pick<CheckupRequest, 'day' | 'period' | 'time'>): string {
  const day = formatCheckupDay(req.day);
  if (req.time) return `${day} às ${req.time}`;
  return `${day}, ${req.period === 'morning' ? 'de manhã' : 'à tarde'}`;
}

// O que o Perfil mostra para cada carro/chão:
// - 'ok': em dia, nada a fazer;
// - 'todo': há checkup por fazer e ainda não pediu → "Agendar agora";
// - 'requested': pediu, a equipa ainda não respondeu;
// - 'proposed': a equipa propôs outro dia — confirmar ou escolher outro;
// - 'scheduled': agendado (aprovado pela equipa ou confirmado pelo cliente);
// - 'declined': cancelou ("não quis") — sai do cartão "Ação pendente", mas
//   a linha do carro/chão deixa voltar a pedir.
export type CheckupState = 'ok' | 'todo' | 'requested' | 'proposed' | 'scheduled' | 'declined';

export function checkupState(v: Vehicle): CheckupState {
  if (v.checkupStatus === 'ok') return 'ok';
  const req = v.checkupRequest;
  if (req?.status === 'cancelled' || v.checkupStatus === 'declined') return 'declined';
  if (!req) return 'todo';
  if (req.status === 'pending') return 'requested';
  if (req.status === 'proposed') return 'proposed';
  return 'scheduled';
}

// Há algo que o cliente possa fazer com este carro/chão? (abre a folha ou
// as ações ao tocar na linha do Perfil)
export function checkupActionable(v: Vehicle): boolean {
  return checkupState(v) !== 'ok';
}

// Mensagem curta para quando gravar o pedido falha. `permission-denied` é o
// caso "as regras recusaram": quase sempre porque a equipa marcou o checkup
// em dia entretanto (o cartão desaparece em segundos) ou porque o pedido já
// não está no estado que a app pensava.
export function checkupErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : '';
  if (code === 'permission-denied') return 'Não foi possível guardar: o estado deste checkup mudou entretanto. Vê o cartão atualizado e tenta outra vez.';
  if (code === 'unavailable') return 'Sem ligação. Verifica a internet e tenta outra vez.';
  return 'Algo correu mal. Tenta outra vez.';
}

// O carro/chão do cartão "Ação pendente": primeiro o que precisa de uma
// decisão do cliente (proposta da equipa), depois o que ainda não pediu,
// depois os que já estão a andar. null quando está tudo em dia.
export function pendingCheckup(vehicles: Vehicle[]): Vehicle | null {
  const order: CheckupState[] = ['proposed', 'todo', 'requested', 'scheduled'];
  for (const s of order) {
    const v = vehicles.find((x) => checkupState(x) === s);
    if (v) return v;
  }
  return null;
}
