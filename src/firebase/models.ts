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

export interface Client {
  // IMPORTANTE: o ID do documento em `clients` TEM de ser o `uid` do Firebase
  // Auth (não um ID aleatório). As regras em firestore.rules dependem disso
  // (request.auth.uid == clientId). A Secção 2 deve criar o doc com
  // setDoc(doc(db, 'clients', user.uid), ...).
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  clientSince: Timestamp;
  // Preferências operacionais por categoria (ProfileScreen).
  // Consentimento de marketing é separado — ver Secção 3 (RGPD).
  notificationPrefs: {
    automotive: boolean;
    epoxy: boolean;
    graphic: boolean;
  };
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
  | 'checkup_reminder' // +1 semana após trabalho
  | 'offer' // +1 mês, lavagem grátis
  | 'new_work' // novo trabalho na categoria com opt-in do cliente
  | 'event_reminder'
  | 'team_alert'; // alerta interno à equipa (cliente não confirmou checkup) — Secção 6

export interface AppNotification {
  id: string;
  clientId: string;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  relatedWorkId?: string;
  relatedEventId?: string;
  relatedVehicleId?: string;
  createdAt: Timestamp;
}
