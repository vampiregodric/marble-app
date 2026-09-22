import { Auth } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';
import { CloudinaryConfig } from '../cloudinary';
import { runEventReminders } from './events';
import { JobLog, runFollowUps } from './followUps';
import { runReceipts } from './receipts';
import { runRetention } from './retention';
import { runRequestRetention } from '../requests';
import { runSimulationRetention } from '../simulations';

// O job diário (10:00 Lisboa) — a ordem importa pouco, mas os recibos de
// ontem vão primeiro para tirar tokens mortos antes dos envios de hoje.
// Cada job apanha os seus próprios erros, para um falhar sem travar os
// outros; o erro fica nos logs da Function. Cada job faz as suas próprias
// leituras, filtradas na query (auditoria 2026-09-12, Pacote 10) — nenhum
// lê uma coleção inteira.

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
  await run('events', () => runEventReminders(db, now, log));
  await run('retention', () => runRetention(db, { auth: deps.auth, cloudinary: deps.cloudinary }, now, log));
  // Pedidos de orçamento fechados há mais de 12 meses (Secção 7).
  await run('requests', () => runRequestRetention(db, now, log));
  // Simulações "como ficaria" sem pedido há mais de 90 dias (Secção 16).
  await run('simulations', () => runSimulationRetention(db, now, log));
  return summary;
}
