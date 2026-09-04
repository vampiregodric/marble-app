import { Auth } from 'firebase-admin/auth';
import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CloudinaryConfig, deleteAvatarFiles } from '../cloudinary';
import { hasAppAccount } from '../consent';
import { createNotification } from '../notify';
import { TEXTS } from '../texts';
import { addDays } from '../time';
import { Client } from '../types';
import { JobLog } from './followUps';

// Retenção (RGPD, Secção 3 → src/legal/texts.ts RETENTION): contas sem
// qualquer atividade há 3 anos são apagadas da mesma forma que "Apagar
// conta" na app — o doc é anonimizado (o histórico de trabalhos fica sem
// ligação a pessoa nenhuma), o utilizador Auth desaparece e os ficheiros da
// foto de perfil saem do Cloudinary. 30 dias antes vai um aviso (alerta
// operacional + push); abrir a app nesse mês cancela tudo.
//
// "Atividade" = a data mais recente entre: última abertura da app com
// sessão (`lastActiveAt`), alterações ao perfil, aceitação de termos, e
// serviços feitos (carros/chãos e trabalhos ligados ao cliente).

export const INACTIVE_YEARS = 3;
export const WARNING_DAYS = 30;

export type RetentionSummary = { checked: number; warned: number; deleted: number; unwarned: number };

export type RetentionDeps = {
  auth: Auth;
  cloudinary?: CloudinaryConfig;
};

function latest(...dates: (Timestamp | Date | null | undefined)[]): Date | null {
  let best: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    const date = d instanceof Date ? d : d.toDate();
    if (!best || date > best) best = date;
  }
  return best;
}

async function lastServiceByClient(db: Firestore): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  const bump = (clientId: string | undefined, d: Timestamp | undefined) => {
    if (!clientId || !d) return;
    const date = d.toDate();
    const cur = map.get(clientId);
    if (!cur || date > cur) map.set(clientId, date);
  };
  const [vehicles, works] = await Promise.all([db.collection('vehicles').get(), db.collection('works').get()]);
  vehicles.docs.forEach((v) => bump(v.data().clientId, v.data().lastServiceAt ?? v.data().createdAt));
  works.docs.forEach((w) => bump(w.data().clientId, w.data().completedAt));
  return map;
}

export async function anonymizeClient(db: Firestore, deps: RetentionDeps, client: Client, now: Date, log: JobLog): Promise<void> {
  const ts = Timestamp.fromDate(now);
  await db.collection('clients').doc(client.id).update({
    name: '',
    email: '',
    phone: '',
    avatarUrl: FieldValue.delete(),
    pushTokens: FieldValue.delete(),
    notes: FieldValue.delete(),
    notificationPrefs: { automotive: false, epoxy: false, graphic: false },
    'consent.marketing': false,
    'consent.marketingUpdatedAt': ts,
    deletedAt: ts,
    deletedBy: 'retention',
    updatedAt: ts,
  });
  try {
    await deps.auth.deleteUser(client.id);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;
  }
  if (deps.cloudinary) {
    const n = await deleteAvatarFiles(deps.cloudinary, client.id);
    if (n) log(`  cloudinary: ${n} ficheiro(s) apagado(s)`);
  } else {
    log('  cloudinary: sem credenciais — ficheiros da foto de perfil ficam por apagar');
  }
}

export async function runRetention(db: Firestore, deps: RetentionDeps, now: Date, log: JobLog = () => {}, clients?: Client[]): Promise<RetentionSummary> {
  const summary: RetentionSummary = { checked: 0, warned: 0, deleted: 0, unwarned: 0 };
  const all = clients ?? (await db.collection('clients').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
  const services = await lastServiceByClient(db);
  const deleteCutoff = addDays(now, -INACTIVE_YEARS * 365);
  const warnCutoff = addDays(deleteCutoff, WARNING_DAYS);

  for (const client of all) {
    if (!hasAppAccount(client)) continue;
    summary.checked++;
    const activity = latest(
      client.lastActiveAt,
      client.updatedAt,
      client.createdAt,
      client.clientSince,
      client.consent?.termsAcceptedAt,
      client.consent?.marketingUpdatedAt,
      services.get(client.id)
    );
    if (!activity || activity > warnCutoff) {
      // Ativo. Se tinha aviso pendente, voltou — limpa.
      if (client.retentionWarnedAt) {
        await db.collection('clients').doc(client.id).update({ retentionWarnedAt: FieldValue.delete() });
        summary.unwarned++;
        log(`aviso cancelado (voltou) · ${client.email || client.id}`);
      }
      continue;
    }
    if (!client.retentionWarnedAt) {
      const deleteOn = addDays(now, WARNING_DAYS);
      await createNotification(db, { clientId: client.id, type: 'message', ...TEXTS.retentionWarning(deleteOn) }, now);
      await db.collection('clients').doc(client.id).update({ retentionWarnedAt: Timestamp.fromDate(now) });
      summary.warned++;
      log(`aviso de eliminação → ${client.email || client.id} (inativo desde ${activity.toISOString().slice(0, 10)})`);
      continue;
    }
    if (activity <= deleteCutoff && addDays(client.retentionWarnedAt.toDate(), WARNING_DAYS) <= now) {
      log(`a apagar por inatividade · ${client.email || client.id}`);
      await anonymizeClient(db, deps, client, now, log);
      summary.deleted++;
    }
  }
  return summary;
}
