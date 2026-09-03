import { Timestamp } from 'firebase/firestore';

// Nomes das coleções Firestore. Usa estas constantes em vez de escrever
// strings à mão nos ecrãs (Secção 4), para evitar erros de typo.
export const COLLECTIONS = {
  clients: 'clients',
  vehicles: 'vehicles',
  works: 'works',
  events: 'events',
  notifications: 'notifications',
} as const;

// Categorias tal como usadas no filtro do Portfólio (PortfolioScreen).
export type WorkCategory = 'Automotive' | 'Epoxy Floors' | 'Graphic';

// Prova de consentimento (RGPD, Secção 3). Guardamos QUANDO e QUE VERSÃO o
// cliente aceitou — sem isto não há como demonstrar o consentimento.
export interface ClientConsent {
  // Versão dos textos legais aceite (LEGAL_VERSION em src/legal/texts.ts).
  // Se for diferente da atual, o Perfil pede nova aceitação.
  termsVersion: string;
  termsAcceptedAt: Timestamp;
  // Opt-in explícito para ofertas e novidades. Desligado por defeito; o
  // cliente liga/desliga no Perfil. A Secção 6 só envia `offer`, `new_work`
  // e `event_reminder` a quem tem isto a true.
  marketing: boolean;
  marketingUpdatedAt: Timestamp | null;
}

export interface Client {
  // IMPORTANTE: o ID do documento em `clients` TEM de ser o `uid` do Firebase
  // Auth (não um ID aleatório). As regras em firestore.rules dependem disso
  // (request.auth.uid == clientId). A Secção 2 cria o doc com
  // setDoc(doc(db, 'clients', user.uid), ...).
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  clientSince: Timestamp;
  // Sub-preferências de MARKETING por categoria: que novidades do portfólio
  // interessam ao cliente. Só contam quando `consent.marketing` é true —
  // sem esse opt-in não se envia nada de marketing, seja qual for o valor
  // aqui. Lembretes de checkup são operacionais e não passam por isto.
  notificationPrefs: {
    automotive: boolean;
    epoxy: boolean;
    graphic: boolean;
  };
  // Ausente em contas criadas antes da Secção 3 — a app trata a ausência
  // como "ainda não aceitou" e pede aceitação no Perfil.
  consent?: ClientConsent;
  // Presente quando o cliente apagou a conta: name/email/phone ficam vazios,
  // o utilizador Auth já não existe, e o doc fica só para manter a ligação
  // (anónima) a vehicles/works. Ver AuthContext.deleteAccount.
  deletedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type VehicleType = 'car' | 'floor';
export type CheckupStatus = 'pending' | 'ok';

// Um carro ou um chão (piso epóxi) associado a um cliente.
export interface Vehicle {
  id: string;
  clientId: string;
  type: VehicleType;
  name: string; // ex: "BMW M4 — PPF Colorido"
  model?: string; // ex: "BMW M4"
  lastServiceAt?: Timestamp;
  checkupStatus: CheckupStatus;
  photoUrl?: string;
  createdAt: Timestamp;
}

export interface WorkProduct {
  brand: string;
  item: string;
}

// Um trabalho concluído, publicado no Portfólio.
export interface Work {
  id: string;
  title: string;
  category: WorkCategory;
  clientId?: string;
  vehicleId?: string;
  model?: string;
  description: string;
  photoUrl?: string;
  products: WorkProduct[];
  // Curadoria manual da equipa para o carrossel do Início (ver SPEC.md).
  featured: boolean;
  published: boolean;
  completedAt: Timestamp;
  createdAt: Timestamp;
}

export interface MarbleEvent {
  id: string;
  title: string;
  location: string;
  date: Timestamp;
  photoUrl?: string;
  createdAt: Timestamp;
}

export type NotificationType =
  | 'checkup_reminder' // +1 semana após trabalho — OPERACIONAL, não depende de consentimento
  | 'offer' // +1 mês, lavagem grátis — MARKETING, exige consent.marketing
  | 'new_work' // novo trabalho na categoria com opt-in — MARKETING, exige consent.marketing
  | 'event_reminder' // MARKETING, exige consent.marketing
  | 'team_alert'; // alerta interno à equipa (cliente não confirmou checkup) — Secção 6

// Tipos que só podem ser enviados com consent.marketing === true.
export const MARKETING_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  'offer',
  'new_work',
  'event_reminder',
]);

export interface AppNotification {
  id: string;
  clientId: string;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  // Miniatura opcional (ex: foto do trabalho publicado). Quem cria a
  // notificação (Secção 6 / backoffice) copia aqui o photoUrl do trabalho ou
  // evento relacionado; a app mostra um gradiente quando está vazio.
  photoUrl?: string;
  relatedWorkId?: string;
  relatedEventId?: string;
  relatedVehicleId?: string;
  createdAt: Timestamp;
}
