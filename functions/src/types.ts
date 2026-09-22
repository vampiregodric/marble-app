import type { Timestamp } from 'firebase-admin/firestore';

// Subconjunto do modelo de dados partilhado (src/firebase/models.ts na app,
// cópia no backoffice) com os campos que as Functions leem e escrevem. A
// fonte de verdade continua a ser a app — quando um campo muda lá, muda
// aqui. Os tipos usam o Timestamp do Admin SDK (o mesmo formato no wire).

export type WorkCategory = 'Automotive' | 'Epoxy Floors' | 'Graphic';
export type VehicleType = 'car' | 'floor';
// Idioma da app no telemóvel do cliente (Secção 12b): `clients.locale`,
// gravado pela app; ausente = PT. As Functions escrevem os alertas
// automáticos ao cliente neste idioma (texts.ts → clientLocale).
export type Locale = 'pt' | 'en';
// 'declined' (Secção 8): o cliente cancelou o pedido de checkup na app.
export type CheckupStatus = 'pending' | 'ok' | 'declined';

// Agendamento de checkup (Secção 8) — ver Vehicle.checkupRequest em
// src/firebase/models.ts para quem escreve cada estado.
export type CheckupPeriod = 'morning' | 'afternoon';
export type CheckupRequestStatus = 'pending' | 'proposed' | 'approved' | 'cancelled';

export interface CheckupRequest {
  day: string; // "AAAA-MM-DD"
  period: CheckupPeriod;
  note?: string;
  status: CheckupRequestStatus;
  requestedAt: Timestamp;
  time?: string; // "HH:MM", opcional (equipa)
  teamNote?: string;
  decidedAt?: Timestamp;
  confirmedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

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
  // Simulador "como ficaria" (Secção 16): versão dos textos legais em que
  // o cliente autorizou o uso das fotos. A Function onSimulationWritten
  // recusa gerar sem isto (auditoria 2026-09-12, RGPD-07).
  simulatorVersion?: string;
  simulatorAcceptedAt?: Timestamp | null;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  locale?: Locale;
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
  checkupRequest?: CheckupRequest;
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
  // Tags da Secção 13 (ids de WORK_SERVICES da app) e marcas; o simulador
  // usa a primeira de cada na instrução ao modelo.
  services?: string[];
  brands?: string[];
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
  relatedRequestId?: string;
  createdAt: Timestamp;
  push?: NotificationPush;
}

// ---------- Pedidos (Secção 7) ----------

export type DepartmentId = 'automotive' | 'epoxy' | 'graphic' | 'ai' | 'ads' | 'xps';

export const DEPARTMENT_NAME: Record<DepartmentId, string> = {
  automotive: 'Automotive Aesthetics',
  epoxy: 'Epoxy Floors',
  graphic: 'Graphic Solutions',
  ai: 'AI Business',
  ads: 'Marble Ads',
  xps: 'Xtreme Polishing Systems',
};

// Só orçamentos: o agendamento de checkup vive em `Vehicle.checkupRequest`.
export type RequestType = 'quote';
export type RequestStatus = 'new' | 'contacted' | 'closed';
export type ContactPreference = 'call' | 'whatsapp' | 'email';

export const CONTACT_PREFERENCE_LABEL: Record<ContactPreference, string> = {
  call: 'chamada',
  whatsapp: 'WhatsApp',
  email: 'email',
};

export interface RequestPhoto {
  url: string;
  thumbnailUrl: string;
  publicId: string;
}

export interface RequestField {
  key: string;
  label: string;
  value: string;
}

export interface ServiceRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  contactPreference: ContactPreference;
  department: DepartmentId;
  workId?: string;
  workTitle?: string;
  services: string[];
  fields: RequestField[];
  message: string;
  photos?: RequestPhoto[];
  // Simulação "como ficaria" anexada (Secção 16): cópia do essencial.
  simulation?: { id: string; name: string; photoUrl: string; resultUrl?: string; thumbnailUrl?: string };
  platform?: string;
  notes?: string;
  contactedAt?: Timestamp;
  closedAt?: Timestamp;
  // 'rate_limit' = 3+ pedidos do mesmo cliente em 24 h; 'daily_cap' = o
  // projeto inteiro passou REQUEST_DAILY_CAP (Secção 11). Ver requests.ts.
  flagged?: 'rate_limit' | 'daily_cap';
  processedAt?: Timestamp;
  teamAlertId?: string;
  confirmationId?: string;
  emailSentAt?: Timestamp;
  emailError?: string;
  anonymizedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ---------- Simulador "como ficaria" (Secção 16) ----------

export type SimulationKind = 'floor' | 'car';
export type SimulationStatus = 'pending' | 'done' | 'failed' | 'limited' | 'capped';

// Motivo de um 'failed', em código curto (auditoria 2026-09-12, SEG-A-13):
// o cliente lê o doc, por isso a mensagem completa do Vertex/Cloudinary
// fica só nos logs da Function. A app mostra sempre o mesmo texto; o
// backoffice traduz o código (SIMULATION_ERROR_LABEL em utils/format.ts).
// - no_consent: clients/{uid}.consent.simulatorVersion em falta (RGPD-07)
// - bad_photo: photo.url fora do Cloudinary da Marble (SEG-A-06)
// - bad_source: amostra/trabalho inexistente, não publicado, de outra
//   categoria ou com foto fora do Cloudinary (SEG-A-06/07)
// - fetch_failed: não foi possível obter uma das imagens (estado, tamanho,
//   15 s)
// - vertex_unavailable: Vertex AI não configurado ou a responder erro
// - blocked: filtros de segurança da Google
// - no_image: resposta sem imagem
// - upload_failed: o resultado não subiu para o Cloudinary
// - timeout: prazo interno da Function (150 s) ou 'pending' há mais de
//   1 h fechado pelo job diário (SEG-A-18)
// - error: qualquer outra coisa
export type SimulationErrorCode =
  | 'no_consent'
  | 'bad_photo'
  | 'bad_source'
  | 'fetch_failed'
  | 'vertex_unavailable'
  | 'blocked'
  | 'no_image'
  | 'upload_failed'
  | 'timeout'
  | 'error';

// Erro com código: quem apanha grava `code` em `simulations.error` e a
// mensagem no log.
export class SimulationError extends Error {
  readonly code: SimulationErrorCode;
  constructor(code: SimulationErrorCode, message: string) {
    super(message);
    this.name = 'SimulationError';
    this.code = code;
  }
}

export interface SimulationImage {
  url: string;
  thumbnailUrl: string;
  publicId: string;
}

// Amostra do simulador (página Amostras do backoffice; Sample na app). A
// Function lê-a para pôr na instrução ao modelo o texto da EQUIPA, e não a
// cópia que o cliente escreveu em `simulations.source`.
export interface Sample {
  id: string;
  name: string;
  category: WorkCategory;
  service?: string;
  brand?: string;
  finish?: 'gloss' | 'satin' | 'matte';
  photoUrl: string;
  thumbnailUrl?: string;
  published: boolean;
}

// A amostra (ou a capa de um trabalho) aplicada — cópia na altura.
export interface SimulationSource {
  type: 'sample' | 'work';
  id: string;
  name: string;
  photoUrl: string;
  thumbnailUrl?: string;
  service?: string;
  brand?: string;
  finish?: 'gloss' | 'satin' | 'matte';
}

export interface Simulation {
  id: string;
  clientId: string;
  kind: SimulationKind;
  photo: SimulationImage;
  source: SimulationSource;
  status: SimulationStatus;
  platform?: string;
  result?: SimulationImage;
  error?: SimulationErrorCode | string;
  model?: string;
  durationMs?: number;
  processedAt?: Timestamp;
  // Escrito pela Function onRequestWritten quando o pedido de orçamento
  // com esta simulação é criado (QUA-01) — nunca pela app.
  requestId?: string;
  // "Apagar simulação" na app: o cliente só esconde (regras); o job diário
  // apaga de facto o doc e os ficheiros. Assim apagar não zera os tectos
  // (SEG-A-01) nem tira ao pedido as imagens que ele mostra (QUA-01).
  hiddenAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
