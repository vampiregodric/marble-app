import { Timestamp } from 'firebase/firestore';

// Formatação de datas em português, partilhada pelos ecrãs. Tudo recebe
// Timestamp do Firestore (ou null/undefined) e devolve string pronta a mostrar.

export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function toDate(ts?: Timestamp | null): Date | null {
  return ts ? ts.toDate() : null;
}

// "30 Ago 2026"
export function formatDate(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// "Ago 2026" — usado em "Cliente desde".
export function formatMonthYear(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// "Há 2 horas", "Ontem", "Há 3 dias", "Há 2 semanas", "Há 4 meses".
export function timeAgo(ts?: Timestamp | null, now: Date = new Date()): string {
  const d = toDate(ts);
  if (!d) return '';
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Agora mesmo';
  if (min < 60) return `Há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return hours === 1 ? 'Há 1 hora' : `Há ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? 'Há 1 semana' : `Há ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months < 12) return months <= 1 ? 'Há 1 mês' : `Há ${months} meses`;
  const years = Math.floor(days / 365);
  return years <= 1 ? 'Há 1 ano' : `Há ${years} anos`;
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
