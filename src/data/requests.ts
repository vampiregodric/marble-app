import { useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  COLLECTIONS,
  ContactPreference,
  DepartmentId,
  REQUEST_LIMITS,
  RequestField,
  RequestPhoto,
  ServiceRequest,
} from '../firebase/models';
import { useFirestoreList, ListState } from './firestoreHooks';

// Pedidos de orçamento (Secção 7). O cliente cria e lê os seus; o resto é
// da equipa (backoffice) e das Cloud Functions. Ver ServiceRequest em
// models.ts e a match /requests em firestore.rules.

// "Os teus pedidos" no Perfil. `uid` a null → lista vazia sem escuta.
export function useMyRequests(uid: string | null | undefined, max = 20): ListState<ServiceRequest> {
  const q = useMemo(
    () =>
      uid
        ? query(collection(db, COLLECTIONS.requests), where('clientId', '==', uid), orderBy('createdAt', 'desc'), limit(max))
        : null,
    [uid, max]
  );
  return useFirestoreList<ServiceRequest>(q);
}

// O ID é gerado ANTES de gravar, para as fotos subirem com a tag
// `request_<id>` (é assim que as Functions as apagam mais tarde).
export function newRequestId(): string {
  return doc(collection(db, COLLECTIONS.requests)).id;
}

export type NewRequestInput = {
  department: DepartmentId;
  name: string;
  email: string;
  phone: string;
  contactPreference: ContactPreference;
  services: string[];
  fields: RequestField[];
  message: string;
  photos: RequestPhoto[];
  workId?: string;
  workTitle?: string;
};

function platform(): ServiceRequest['platform'] {
  return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : undefined;
}

// Grava o pedido com EXATAMENTE os campos que as regras aceitam na criação
// (keys().hasOnly). Campos opcionais ausentes não vão (o Firestore recusa
// `undefined`).
export async function createRequest(id: string, uid: string, input: NewRequestInput): Promise<void> {
  const data: Record<string, unknown> = {
    type: 'quote',
    status: 'new',
    clientId: uid,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    contactPreference: input.contactPreference,
    department: input.department,
    services: input.services.slice(0, REQUEST_LIMITS.servicesMax),
    fields: input.fields.slice(0, REQUEST_LIMITS.fieldsMax),
    message: input.message.trim().slice(0, REQUEST_LIMITS.messageMax),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.photos.length) data.photos = input.photos.slice(0, REQUEST_LIMITS.photosMax);
  if (input.workId) data.workId = input.workId;
  if (input.workTitle) data.workTitle = input.workTitle;
  const p = platform();
  if (p) data.platform = p;
  await setDoc(doc(db, COLLECTIONS.requests, id), data);
}

// Anti-spam mínimo no próprio dispositivo: no máximo REQUEST_LIMITS.perDayMax
// pedidos em 24 h, guardados em AsyncStorage (localStorage no web). Não é
// segurança — é para travar toques repetidos e testes involuntários; a
// Cloud Function marca do lado dela quem excede o mesmo limite por cliente.
const SENT_KEY = 'marble:requests:sentAt';
const DAY_MS = 24 * 60 * 60 * 1000;

async function recentSends(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(SENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    const cutoff = Date.now() - DAY_MS;
    return Array.isArray(list) ? list.filter((t): t is number => typeof t === 'number' && t > cutoff) : [];
  } catch {
    return [];
  }
}

export async function deviceLimitReached(): Promise<boolean> {
  return (await recentSends()).length >= REQUEST_LIMITS.perDayMax;
}

export async function recordDeviceSend(): Promise<void> {
  try {
    const list = await recentSends();
    list.push(Date.now());
    await AsyncStorage.setItem(SENT_KEY, JSON.stringify(list));
  } catch {
    /* sem armazenamento (ex: modo privado) — o limite fica só do lado da Function */
  }
}
