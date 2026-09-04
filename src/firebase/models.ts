import { Timestamp } from 'firebase/firestore';

// Nomes das coleções Firestore. Usa estas constantes em vez de escrever
// strings à mão nos ecrãs (Secção 4), para evitar erros de typo.
export const COLLECTIONS = {
  clients: 'clients',
  vehicles: 'vehicles',
  works: 'works',
  events: 'events',
  notifications: 'notifications',
  // Definições escolhidas pela equipa (por agora só `settings/home`).
  settings: 'settings',
} as const;

// Categorias tal como usadas no filtro do Portfólio (PortfolioScreen).
export type WorkCategory = 'Automotive' | 'Epoxy Floors' | 'Graphic';

// Os seis cartões de departamento do ecrã Início. A lista com nomes e
// taglines vive no código (app: src/data/departments.ts; backoffice:
// src/utils/departments.ts) — só a foto de cada um é conteúdo.
export type DepartmentId = 'automotive' | 'epoxy' | 'graphic' | 'ai' | 'ads' | 'xps';

// Foto de fundo de um cartão de departamento, escolhida pela equipa no
// backoffice (Destaques > Fotos dos serviços): carregada para o Cloudinary
// ou copiada da capa de um trabalho publicado. A app usa `thumbnailUrl`
// quando existe (o cartão é pequeno) e cai para `photoUrl`.
export interface DepartmentCover {
  photoUrl: string;
  thumbnailUrl?: string;
  publicId?: string;
}

// Documento único `settings/home` (Secção 5b): o que a equipa define para
// o ecrã Início além do carrossel. Leitura pública, escrita só da equipa.
// Ausente ou sem `departmentCovers` → os cartões mostram o gradiente.
export interface HomeSettings {
  id: 'home';
  departmentCovers?: Partial<Record<DepartmentId, DepartmentCover>>;
  updatedAt?: Timestamp;
}

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
  // Foto de perfil escolhida pelo cliente na app (Secção 5b): URL de
  // entrega do Cloudinary já recortado em quadrado (src/media/cloudinary.ts).
  // Vazio ou ausente = sem foto (a app mostra as iniciais). É o único
  // ficheiro que o cliente carrega; "Apagar conta" remove o campo.
  avatarUrl?: string;
  clientSince: Timestamp;
  // Preenchido pelo backoffice (Secção 5) em fichas criadas pela equipa
  // para clientes SEM conta na app (o ID do doc é aleatório, não é um uid).
  // Ausente nos docs criados pela app no registo. Estes clientes não veem
  // alertas — não têm onde os ler.
  createdByTeam?: boolean;
  // Notas internas da equipa (só o backoffice lê e escreve).
  notes?: string;
  // Presente quando a equipa juntou esta ficha (sem conta) à conta da app
  // do mesmo cliente: carros, trabalhos e alertas passaram para `mergedInto`
  // e este doc ficou anonimizado com `deletedAt`. Ver backoffice.
  mergedInto?: string;
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
  // Tokens do Expo Push Service dos telemóveis onde o cliente ativou as
  // notificações (Secção 6). A app acrescenta o do dispositivo ao ativar e
  // ao entrar, remove-o ao terminar sessão; as Cloud Functions tiram os que
  // o Expo diz já não existirem. Vários = vários telemóveis.
  pushTokens?: string[];
  // Última vez que o cliente abriu a app com sessão (a app grava no máximo
  // uma vez por dia). O job de retenção (Secção 6) conta a inatividade daqui.
  lastActiveAt?: Timestamp;
  // O job de retenção já avisou que a conta vai ser apagada por inatividade.
  // Limpa-se sozinho se o cliente voltar a abrir a app.
  retentionWarnedAt?: Timestamp;
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
  // Matrícula (carros). Só a equipa vê; a app não a mostra.
  plate?: string;
  lastServiceAt?: Timestamp;
  // 'pending' aparece como "Ação pendente" no Perfil. A Cloud Function do
  // lembrete de checkup (Secção 6) põe-no a 'pending'; a equipa volta a
  // 'ok' no backoffice ("Marcar em dia").
  checkupStatus: CheckupStatus;
  // Quando a equipa marcou o checkup como feito. O job de acompanhamento
  // usa-o para saber que o lembrete foi atendido (não alerta a equipa).
  checkupDoneAt?: Timestamp;
  // Quando o cliente confirmou/pediu o checkup na app. Reservado à
  // Secção 8 (o botão "Agendar agora"); o job já o respeita.
  checkupRequestedAt?: Timestamp;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkProduct {
  brand: string;
  item: string;
}

// Um item da galeria de um trabalho (pedido do Fábio, 2026-09-03: um
// trabalho pode ter várias fotos e vídeo). A equipa carrega-os no backoffice
// (Secção 5), que também decide o alojamento. `thumbnailUrl` é obrigatório
// para vídeo (a app mostra a miniatura e só carrega o vídeo ao tocar).
export interface WorkMedia {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  // Ordem na galeria (0 = primeiro).
  order?: number;
  // ID do ficheiro no alojamento (Cloudinary), para o backoffice conseguir
  // gerar variantes e, um dia, apagar. A app não precisa dele.
  publicId?: string;
}

// Acompanhamento pós-serviço de um trabalho (Secção 6). A equipa define-o
// no backoffice ao registar o trabalho concluído — decisão do Fábio
// (2026-09-04): é por trabalho, porque um PPF completo tem checkup e um
// detail não. Cada passo tem um prazo em dias; ausente ou null = passo
// desligado. Os campos `*At`/`offerSkipped` são escritos SÓ pelas Cloud
// Functions (job diário às 10:00 de Lisboa); o backoffice preserva-os.
export interface WorkFollowUp {
  // Lembrete de checkup ao cliente, N dias depois de `completedAt`
  // (operacional, vai sempre). Ao enviar, o carro/chão fica 'pending'. Se o
  // cliente não tem conta na app, vira logo um alerta interno para ligar.
  checkupDays?: number | null;
  // Alerta interno à equipa se o checkup continuar por confirmar N dias
  // depois do lembrete. Só conta com `checkupDays`.
  teamAlertDays?: number | null;
  // Oferta de lavagem grátis, N dias depois de `completedAt`. Só carros
  // (chãos não têm oferta — decisão do Fábio). Marketing: exige
  // consent.marketing; sem ele fica `offerSkipped`.
  offerDays?: number | null;
  // true enquanto houver passos por executar — o job só lê estes trabalhos.
  active: boolean;
  checkupSentAt?: Timestamp;
  // O job viu o checkup feito/pedido depois do lembrete — o alerta interno
  // deixa de fazer sentido.
  checkupConfirmedAt?: Timestamp;
  teamAlertSentAt?: Timestamp;
  offerSentAt?: Timestamp;
  // Porque é que a oferta não foi enviada quando chegou a data.
  offerSkipped?: 'no_consent' | 'no_account';
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
  // Capa: aparece nos cartões do Portfólio e no carrossel do Início.
  photoUrl?: string;
  // Galeria completa, mostrada no Detalhe (Secção 5b: deslizável no topo e
  // visualizador em ecrã inteiro com vídeo). Ausente ou vazio = só a capa.
  media?: WorkMedia[];
  products: WorkProduct[];
  // Curadoria manual da equipa para o carrossel do Início (ver SPEC.md).
  featured: boolean;
  // Posição no carrossel do Início (0 = primeiro). Definida no ecrã
  // "Destaques" do backoffice. OBRIGATÓRIA quando `featured` é true: a app
  // ordena o carrossel por este campo e o Firestore exclui docs sem ele.
  featuredOrder?: number;
  published: boolean;
  completedAt: Timestamp;
  // Acompanhamento pós-serviço (checkup, alerta interno, oferta). Ausente =
  // nenhum. Só faz sentido com `vehicleId`.
  followUp?: WorkFollowUp;
  // Quando a publicação gerou os alertas `new_work` (Cloud Function). Não
  // se repete se o trabalho for despublicado e publicado outra vez.
  newWorkNotifiedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface MarbleEvent {
  id: string;
  title: string;
  location: string;
  date: Timestamp;
  photoUrl?: string;
  // O job diário já enviou o lembrete "amanhã" (Cloud Function, Secção 6).
  reminderSentAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type NotificationType =
  | 'checkup_reminder' // +1 semana após trabalho — OPERACIONAL, não depende de consentimento
  | 'offer' // +1 mês, lavagem grátis — MARKETING, exige consent.marketing
  | 'new_work' // novo trabalho na categoria com opt-in — MARKETING, exige consent.marketing
  | 'event_reminder' // MARKETING, exige consent.marketing
  | 'message' // mensagem direta da equipa sobre o serviço do cliente (backoffice) — OPERACIONAL
  | 'team_alert'; // alerta interno à equipa (ex: cliente não confirmou o checkup) — nunca vai ao cliente

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
  // Resultado do push para o telemóvel, escrito pela Cloud Function que
  // reage à criação do doc (Secção 6). Ausente = ainda não processado, ou
  // `team_alert` (não há push interno). O doc é sempre a fonte de verdade —
  // o push é um acréscimo; sem telemóvel registado o alerta fica só na app.
  push?: NotificationPush;
}

export interface NotificationPush {
  // sent = entregue ao Expo; no_device = cliente sem telemóvel com
  // notificações ativas; skipped = consentimento em falta ou conta sem app;
  // error = o Expo recusou.
  status: 'sent' | 'no_device' | 'skipped' | 'error';
  at: Timestamp;
  // Quantos telemóveis receberam (status sent).
  devices?: number;
  error?: string;
  // IDs dos tickets do Expo, para o job diário confirmar a entrega e tirar
  // tokens de telemóveis onde a app foi desinstalada.
  tickets?: string[];
  pendingReceipt?: boolean;
  // O Expo aceitou mas o telemóvel não recebeu (ex: DeviceNotRegistered).
  receiptError?: string;
}
