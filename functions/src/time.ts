// Datas em hora de Lisboa. As Functions correm em UTC; o negócio vive em
// Portugal. Aqui só o que os jobs precisam: somar dias e comparar dias do
// calendário de Lisboa.

export const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

// "2026-09-12" no calendário de Lisboa.
export function lisbonDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
