import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arrayRemove, arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/models';
import { colors } from '../theme/theme';

// Notificações push no telemóvel (Secção 6): expo-notifications + Expo
// Push Service. O token deste telemóvel fica em clients/{uid}.pushTokens;
// as Cloud Functions enviam para lá quando nasce um doc em `notifications`.
//
// Regras desta camada:
// - A permissão do sistema NUNCA é pedida no arranque: só quando o cliente
//   toca em "Ativar notificações" no ecrã Alertas (enablePush). O sistema
//   só deixa perguntar uma vez (iOS) ou duas (Android 13+) — gastar isso
//   num arranque é perdê-lo.
// - Se a permissão já foi dada, ao entrar garante-se o token na conta sem
//   perguntar nada (syncPushToken). Ao terminar sessão tira-se (forget...),
//   senão o próximo cliente a entrar neste telemóvel recebia os alertas do
//   anterior.
// - Expo Go no Android já não recebe push remoto (SDK 53+): precisa da
//   development build (ver DEVELOPMENT.md). Aí `pushSupported` é false e a
//   interface não mostra nada.

export type PushPermission = 'unsupported' | 'undetermined' | 'denied' | 'granted';

export type PushOpenData = {
  notificationId?: string;
  type?: string;
  relatedWorkId?: string;
  relatedEventId?: string;
  relatedVehicleId?: string;
  relatedRequestId?: string;
};

const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
const inExpoGoOnAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const pushSupported = Device.isDevice && !!projectId && !inExpoGoOnAndroid;

// Como se mostra um push com a app ABERTA: banner + lista, com som. O
// ecrã Alertas já está em tempo real, por isso o badge não é preciso.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TOKEN_KEY = 'marble.pushToken';
const CHANNEL_ID = 'default';

// Android 8+: toda a notificação pertence a um canal. Tem de existir ANTES
// de pedir o token (Android 13+ só mostra o pedido de permissão depois).
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Alertas da Marble Studios',
    importance: Notifications.AndroidImportance.MAX,
    lightColor: colors.gold,
  });
}

function permissionFrom(p: Notifications.NotificationPermissionsStatus): PushPermission {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported) return 'unsupported';
  return permissionFrom(await Notifications.getPermissionsAsync());
}

async function saveToken(uid: string): Promise<void> {
  await ensureChannel();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const ref = doc(db, COLLECTIONS.clients, uid);
  // arrayUnion não duplica. Se o token deste telemóvel mudou, o antigo sai.
  await updateDoc(ref, { pushTokens: arrayUnion(token), pushTokensUpdatedAt: serverTimestamp() });
  const previous = await AsyncStorage.getItem(TOKEN_KEY);
  if (previous && previous !== token) await updateDoc(ref, { pushTokens: arrayRemove(previous) });
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

// Toque em "Ativar notificações": pede a permissão ao sistema (se ainda
// puder) e guarda o token. Devolve o estado final.
export async function enablePush(uid: string): Promise<PushPermission> {
  if (!pushSupported) return 'unsupported';
  await ensureChannel();
  let p = await Notifications.getPermissionsAsync();
  if (!p.granted && p.canAskAgain) p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return permissionFrom(p);
  await saveToken(uid);
  return 'granted';
}

// Ao entrar: se a permissão já existe, garante o token desta conta neste
// telemóvel. Sem prompts. Quem chama trata os erros (rede, etc.).
export async function syncPushToken(uid: string): Promise<void> {
  if (!pushSupported) return;
  const p = await Notifications.getPermissionsAsync();
  if (!p.granted) return;
  await saveToken(uid);
}

// Ao terminar sessão / apagar conta: este telemóvel deixa de receber os
// alertas desta conta.
export async function forgetPushToken(uid: string): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await updateDoc(doc(db, COLLECTIONS.clients, uid), { pushTokens: arrayRemove(token) });
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function openNotificationSettings(): void {
  Linking.openSettings().catch(() => {});
}

// Chama `onOpen` quando o cliente toca num push — com a app aberta, em
// segundo plano ou fechada (arranque a frio: o último toque fica guardado
// pelo sistema e lê-se aqui uma vez).
export function usePushOpens(onOpen: (data: PushOpenData) => void): void {
  const handled = useRef<string | null>(null);
  const callback = useRef(onOpen);
  callback.current = onOpen;

  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      callback.current((response.notification.request.content.data ?? {}) as PushOpenData);
    };
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        handle(r);
        if (r) Notifications.clearLastNotificationResponseAsync().catch(() => {});
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, []);
}
