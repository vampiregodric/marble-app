import { Timestamp } from 'firebase/firestore';
import { S } from '../i18n';

// Formatação de datas no idioma da app (Secção 12: tabelas de meses e dias
// por idioma em src/i18n/pt.ts e en.ts, não o Intl do sistema — o
// resultado é igual nos três lados e bate certo com os alertas escritos
// pelas Cloud Functions). Tudo recebe Timestamp do Firestore (ou
// null/undefined) e devolve string pronta a mostrar.

export function monthShort(monthIndex: number): string {
  return S.dates.monthsShort[monthIndex] ?? '';
}

export function toDate(ts?: Timestamp | null): Date | null {
  return ts ? ts.toDate() : null;
}

// "30 Ago 2026" / "30 Aug 2026"
export function formatDate(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return '';
  return `${d.getDate()} ${monthShort(d.getMonth())} ${d.getFullYear()}`;
}

// "Ago 2026" — usado em "Cliente desde".
export function formatMonthYear(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return '';
  return `${monthShort(d.getMonth())} ${d.getFullYear()}`;
}

// "Há 2 horas", "Ontem", "Há 3 dias", "Há 2 semanas", "Há 4 meses".
export function timeAgo(ts?: Timestamp | null, now: Date = new Date()): string {
  const d = toDate(ts);
  if (!d) return '';
  const t = S.dates;
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo(min);
  const hours = Math.floor(min / 60);
  if (hours < 24) return t.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days === 1) return t.yesterday;
  if (days < 7) return t.daysAgo(days);
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t.weeksAgo(weeks);
  const months = Math.floor(days / 30);
  if (months < 12) return t.monthsAgo(months);
  const years = Math.floor(days / 365);
  return t.yearsAgo(years);
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
