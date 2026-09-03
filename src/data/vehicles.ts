import { useMemo } from 'react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, Vehicle } from '../firebase/models';
import { useFirestoreList, ListState } from './firestoreHooks';

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

// O que aparece no cartão "Ação pendente" do Perfil: o carro/chão com checkup
// por confirmar mais recente. null quando está tudo em dia.
export function pendingCheckup(vehicles: Vehicle[]): Vehicle | null {
  return vehicles.find((v) => v.checkupStatus === 'pending') ?? null;
}
