// Notificações push — versão WEB (o Metro escolhe push.native.ts em
// iOS/Android). No browser não há push nesta app: tudo aqui é inerte e a
// interface esconde o cartão "Ativar notificações". Mantém a MESMA
// assinatura que push.native.ts.

export type PushPermission = 'unsupported' | 'undetermined' | 'denied' | 'granted';

// Dados que viajam no push e a app lê ao tocar (Cloud Functions → push.ts).
export type PushOpenData = {
  notificationId?: string;
  type?: string;
  relatedWorkId?: string;
  relatedEventId?: string;
  relatedVehicleId?: string;
};

export const pushSupported = false;

export async function getPushPermission(): Promise<PushPermission> {
  return 'unsupported';
}

export async function enablePush(_uid: string): Promise<PushPermission> {
  return 'unsupported';
}

export async function syncPushToken(_uid: string): Promise<void> {}

export async function forgetPushToken(_uid: string): Promise<void> {}

export function openNotificationSettings(): void {}

// Hook: no web nunca há toques em push.
export function usePushOpens(_onOpen: (data: PushOpenData) => void): void {}
