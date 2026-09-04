import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CloudinaryConfig, deleteAvatarFiles, publicIdFromUrl } from './cloudinary';
import { canReceive } from './consent';
import { notificationDoc } from './notify';
import { anonymizeClientRequests } from './requests';
import { TEXTS } from './texts';
import { Client, Work } from './types';

// Lógica dos triggers do Firestore, separada do "wiring" (index.ts) para
// poder correr localmente contra o dev com scripts/runJobs.ts, sem deploy.

export type Log = (msg: string) => void;

// works/{id} criado ou alterado.
// 1. Passou a publicado → alerta `new_work` a quem tem "Ofertas e
//    novidades" ligado E a categoria ligada. Uma vez por trabalho
//    (`newWorkNotifiedAt`): despublicar e voltar a publicar não repete.
// 2. Tem carro/chão ligado → a "última visita" do carro/chão passa a ser a
//    data de conclusão, se for mais recente (o Perfil mostra-a).
export async function handleWorkWritten(db: Firestore, before: Work | null, after: Work | null, now: Date, log: Log = () => {}): Promise<void> {
  if (!after) return;
  const ts = Timestamp.fromDate(now);

  const justPublished = after.published === true && before?.published !== true;
  if (justPublished && !after.newWorkNotifiedAt) {
    const clients = (await db.collection('clients').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
    const recipients = clients.filter((c) => canReceive(c, 'new_work', after.category).ok);
    const text = TEXTS.newWork(after);
    for (let i = 0; i < recipients.length; i += 450) {
      const batch = db.batch();
      for (const c of recipients.slice(i, i + 450)) {
        batch.set(db.collection('notifications').doc(), notificationDoc({ clientId: c.id, type: 'new_work', ...text, photoUrl: after.photoUrl, relatedWorkId: after.id }, now));
      }
      await batch.commit();
    }
    await db.collection('works').doc(after.id).update({ newWorkNotifiedAt: ts });
    log(`new_work "${after.title}" → ${recipients.length} cliente(s)`);
  }

  const vehicleChanged = after.vehicleId && (before?.vehicleId !== after.vehicleId || !before?.completedAt?.isEqual(after.completedAt ?? ts));
  if (after.vehicleId && after.completedAt && vehicleChanged) {
    const ref = db.collection('vehicles').doc(after.vehicleId);
    const v = await ref.get();
    if (v.exists) {
      const last = (v.data()?.lastServiceAt as Timestamp | undefined)?.toDate();
      const completed = after.completedAt.toDate();
      if (!last || last < completed) {
        await ref.update({ lastServiceAt: after.completedAt, updatedAt: ts });
        log(`vehicle ${after.vehicleId}: lastServiceAt ← ${completed.toISOString().slice(0, 10)}`);
      }
    }
  }
}

// clients/{uid} alterado:
// 1. a conta foi apagada (app ou job de retenção) → os pedidos de orçamento
//    do cliente perdem os dados pessoais (Secção 7);
// 2. a foto de perfil foi removida, trocada, ou a conta apagada (a app tira
//    `avatarUrl` ao anonimizar) → apagar no Cloudinary os ficheiros com a
//    tag do cliente, menos a foto atual (se trocou).
export async function handleClientUpdated(db: Firestore, cfg: CloudinaryConfig | null, uid: string, before: Client, after: Client, log: Log = () => {}): Promise<number> {
  if (after.deletedAt && !before.deletedAt) await anonymizeClientRequests(db, uid, new Date(), log);
  const prev = before.avatarUrl?.trim() || '';
  const next = after.avatarUrl?.trim() || '';
  if (prev === next) return 0;
  if (!cfg) {
    log(`cloudinary: sem credenciais — ficheiros de uid_${uid} ficam por apagar (manual, ver README do backoffice)`);
    return 0;
  }
  const keep = next ? publicIdFromUrl(next) : null;
  const n = await deleteAvatarFiles(cfg, uid, keep);
  log(`cloudinary uid_${uid}: ${n} ficheiro(s) apagado(s)${keep ? ` (mantida ${keep})` : ''}`);
  return n;
}

export function serverNow(): FieldValue {
  return FieldValue.serverTimestamp();
}
