import { useMemo } from 'react';
import { collection, doc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CHECKUP_LIMITS, CheckupPeriod, COLLECTIONS, Vehicle } from '../firebase/models';
import { useFirestoreList, ListState } from './firestoreHooks';

export { pendingCheckup } from './checkups';

// Carros e chãos do cliente com sessão, mais recentes primeiro.
export function useVehicles(uid: string | null | undefined): ListState<Vehicle> {
  const q = useMemo(
    () =>
      uid
        ? query(collection(db, COLLECTIONS.vehicles), where('clientId', '==', uid), orderBy('createdAt', 'desc'))
        : null,
    [uid]
  );
  return useFirestoreList<Vehicle>(q);
}

// ---------- Escritas do cliente (Secção 8) ----------
// As únicas escritas do cliente em `vehicles`: o pedido de checkup. As
// regras (firestore.rules → ownerCheckupWrite) só deixam passar exatamente
// estas três formas; qualquer outro campo é recusado.

export type CheckupRequestInput = { day: string; period: CheckupPeriod; note?: string };

// Pedir o checkup (ou alterar o pedido): escreve o mapa inteiro, com
// status 'pending'. `checkupRequestedAt` é o que o job de acompanhamento
// lê para saber que o lembrete foi atendido.
export async function requestCheckup(vehicleId: string, input: CheckupRequestInput): Promise<void> {
  const note = input.note?.trim().slice(0, CHECKUP_LIMITS.noteMax);
  await updateDoc(doc(db, COLLECTIONS.vehicles, vehicleId), {
    checkupRequest: {
      day: input.day,
      period: input.period,
      ...(note ? { note } : {}),
      status: 'pending',
      requestedAt: serverTimestamp(),
    },
    checkupRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Confirmar o dia que a equipa propôs: 'proposed' → 'approved'.
export async function confirmCheckupProposal(vehicleId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.vehicles, vehicleId), {
    'checkupRequest.status': 'approved',
    'checkupRequest.confirmedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Cancelar o pedido (decisão do Fábio: "considera que não quis fazer"). A
// Cloud Function avisa a equipa e tira o carro/chão dos checkups pendentes.
export async function cancelCheckupRequest(vehicleId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.vehicles, vehicleId), {
    'checkupRequest.status': 'cancelled',
    'checkupRequest.cancelledAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
