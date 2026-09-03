import { useMemo } from 'react';
import { collection, doc, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppNotification, COLLECTIONS } from '../firebase/models';
import { useFirestoreList, ListState } from './firestoreHooks';

// Alertas do cliente com sessão. `uid` a null (sem login) → lista vazia sem
// escuta. `team_alert` é interno à equipa e nunca se mostra ao cliente,
// mesmo que um dia venha com o clientId dele.
export function useNotifications(uid: string | null | undefined, max = 100): ListState<AppNotification> {
  const q = useMemo(
    () =>
      uid
        ? query(
            collection(db, COLLECTIONS.notifications),
            where('clientId', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(max)
          )
        : null,
    [uid, max]
  );
  const state = useFirestoreList<AppNotification>(q);
  const data = useMemo(() => state.data.filter((n) => n.type !== 'team_alert'), [state.data]);
  return { ...state, data };
}

export function useUnreadCount(uid: string | null | undefined): number {
  const { data } = useNotifications(uid);
  return data.filter((n) => !n.read).length;
}

// A única escrita que o cliente pode fazer em `notifications` (ver regras).
export function markNotificationRead(notificationId: string): Promise<void> {
  return updateDoc(doc(db, COLLECTIONS.notifications, notificationId), { read: true });
}
