import { Auth } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';
import { CloudinaryConfig } from '../cloudinary';
import { loadAppClients, runEventReminders } from './events';
import { JobLog, runFollowUps } from './followUps';
import { runReceipts } from './receipts';
import { runRetention } from './retention';
import { runRequestRetention } from '../requests';

// O job diário (10:00 Lisboa) — a ordem importa pouco, mas os recibos de
// ontem vão primeiro para tirar tokens mortos antes dos envios de hoje.
// Cada job apanha os seus próprios erros, para um falhar sem travar os
// outros; o erro fica nos logs da Function.

export type DailyDeps = {
  auth: Auth;
  cloudinary?: CloudinaryConfig;
  expoAccessToken?: string;
};

export type DailySummary = Record<string, unknown>;

export async function runDailyJobs(db: Firestore, deps: DailyDeps, now: Date, log: JobLog = () => {}, only?: string): Promise<DailySummary> {
  const summary: DailySummary = {};
  const run = async (name: string, fn: () => Promise<unknown>) => {
    if (only && only !== name) return;
    try {
      summary[name] = await fn();
      log(`[${name}] ${JSON.stringify(summary[name])}`);
    } catch (err) {
      summary[name] = { error: err instanceof Error ? err.message : String(err) };
      log(`[${name}] ERRO ${summary[name]}`);
    }
  };
  await run('receipts', () => runReceipts(db, log, deps.expoAccessToken));
  await run('followUps', () => runFollowUps(db, now, log));
  const clients = only && only !== 'events' && only !== 'retention' ? undefined : await loadAppClients(db);
  await run('events', () => runEventReminders(db, now, log, clients));
  await run('retention', () => runRetention(db, { auth: deps.auth, cloudinary: deps.cloudinary }, now, log, clients));
  // Pedidos de orçamento fechados há mais de 12 meses (Secção 7).
  await run('requests', () => runRequestRetention(db, now, log));
  return summary;
}
