import type { Timestamp } from 'firebase-admin/firestore';

// Subconjunto do modelo de dados partilhado (src/firebase/models.ts na app,
// cópia no backoffice) com os campos que as Functions leem e escrevem. A
// fonte de verdade continua a ser a app — quando um campo muda lá, muda
// aqui. Os tipos usam o Timestamp do Admin SDK (o mesmo formato no wire).

export type WorkCategory = 'Automotive' | 'Epoxy Floors' | 'Graphic';
export type VehicleType = 'car' | 'floor';
export type CheckupStatus = 'pending' | 'ok';

export type NotificationType = 'checkup_reminder' | 'offer' | 'new_work' | 'event_reminder' | 'message' | 'team_alert';

// Só com consent.marketing === true (RGPD, Secção 3).
export const MARKETING_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  'offer',
  'new_work',
  'event_reminder',
]);

export type PrefKey = 'automotive' | 'epoxy' | 'graphic';

export const CATEGORY_PREF: Record<WorkCategory, PrefKey> = {
  Automotive: 'automotive',
  'Epoxy Floors': 'epoxy',
  Graphic: 'graphic',
};

export const CATEGORY_NAME: Record<WorkCategory, string> = {
  Automotive: 'Automotive Aesthetics',
  'Epoxy Floors': 'Epoxy Floors',
  Graphic: 'Graphic Solutions',
};

export interface ClientConsent {
  termsVersion: string;
  termsAcceptedAt: Timestamp;
  marketing: boolean;
  marketingUpdatedAt: Timestamp | null;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  clientSince?: Timestamp;
  createdByTeam?: boolean;
  mergedInto?: string;
  notificationPrefs?: Partial<Record<PrefKey, boolean>>;
  consent?: ClientConsent;
  deletedAt?: Timestamp;
  pushTokens?: string[];
  lastActiveAt?: Timestamp;
  retentionWarnedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Vehicle {
  id: string;
  clientId: string;
  type: VehicleType;
  name: string;
  model?: string;
  lastServiceAt?: Timestamp;
  checkupStatus: CheckupStatus;
  checkupDoneAt?: Timestamp;
  checkupRequestedAt?: Timestamp;
  photoUrl?: string;
  updatedAt?: Timestamp;
}

export interface WorkFollowUp {
  checkupDays?: number | null;
  teamAlertDays?: number | null;
  offerDays?: number | null;
  active: boolean;
  checkupSentAt?: Timestamp;
  checkupConfirmedAt?: Timestamp;
  teamAlertSentAt?: Timestamp;
  offerSentAt?: Timestamp;
  offerSkipped?: 'no_consent' | 'no_account';
}

export interface Work {
  id: string;
  title: string;
  category: WorkCategory;
  clientId?: string;
  vehicleId?: string;
  model?: string;
  description: string;
  photoUrl?: string;
  published: boolean;
  completedAt?: Timestamp;
  followUp?: WorkFollowUp;
  newWorkNotifiedAt?: Timestamp;
}

export interface MarbleEvent {
  id: string;
  title: string;
  location: string;
  date: Timestamp;
  photoUrl?: string;
  reminderSentAt?: Timestamp;
}

export interface NotificationPush {
  status: 'sent' | 'no_device' | 'skipped' | 'error';
  at: Timestamp;
  devices?: number;
  error?: string;
  tickets?: string[];
  pendingReceipt?: boolean;
  receiptError?: string;
}

export interface AppNotification {
  id: string;
  clientId: string;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  photoUrl?: string;
  relatedWorkId?: string;
  relatedEventId?: string;
  relatedVehicleId?: string;
  createdAt: Timestamp;
  push?: NotificationPush;
}
