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
  // Pedidos de orçamento feitos pelo cliente na app (Secção 7). Ver
  // ServiceRequest. Os checkups (Secção 8) vivem em `vehicles.checkupRequest`.
  requests: 'requests',
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
// 'pending' = há um checkup por fazer (o lembrete saiu); 'ok' = em dia;
// 'declined' (Secção 8) = o cliente cancelou o pedido na app — decisão do
// Fábio: "considera que não quis fazer", a equipa não insiste. Pode voltar
// a pedir a partir do Perfil.
export type CheckupStatus = 'pending' | 'ok' | 'declined';

// ---------- Agendamento de checkup (Secção 8) ----------

export type CheckupPeriod = 'morning' | 'afternoon';

// Ciclo de um pedido de checkup, guardado no próprio carro/chão
// (`Vehicle.checkupRequest`). Quem escreve cada transição:
// - pending: o CLIENTE, na app ("Agendar agora" / "Alterar") — escreve o
//   mapa inteiro, com o dia e o período escolhidos entre a disponibilidade
//   da equipa (`settings/checkups`).
// - proposed: a EQUIPA (backoffice, Secção 7b) — o dia pedido não dá e
//   propõe outro (dia, período, hora opcional, nota). O cliente recebe um
//   alerta `message` e confirma ou escolhe outro dia.
// - approved: a EQUIPA aprova o pedido, ou o CLIENTE confirma a proposta.
//   O cliente recebe "Checkup agendado" (alerta + push).
// - cancelled: o CLIENTE cancela. A Cloud Function passa o carro/chão a
//   `checkupStatus: 'declined'` e avisa a equipa.
// Feito = a equipa "marca em dia" (`checkupStatus: 'ok'`, `checkupDoneAt`),
// como até aqui; o pedido fica como histórico.
export type CheckupRequestStatus = 'pending' | 'proposed' | 'approved' | 'cancelled';

export interface CheckupRequest {
  // Dia pedido/agendado, "AAAA-MM-DD" (calendário de Lisboa), e período.
  // Quando a equipa propõe outro dia, são os da proposta.
  day: string;
  period: CheckupPeriod;
  // Nota do cliente (opcional; CHECKUP_LIMITS.noteMax). Só o cliente escreve.
  note?: string;
  status: CheckupRequestStatus;
  // Quando o cliente pediu (esta ronda). Copiado para
  // `Vehicle.checkupRequestedAt`, que é o que o job de acompanhamento lê.
  requestedAt: Timestamp;
  // --- equipa (backoffice) ---
  // Hora concreta ao aprovar/propor ("HH:MM"), opcional; sem hora, fica
  // "de manhã"/"à tarde".
  time?: string;
  teamNote?: string;
  // Quando a equipa aprovou ou propôs.
  decidedAt?: Timestamp;
  // Quando o cliente confirmou a proposta da equipa (status → approved).
  confirmedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

export type CheckupWeekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
// Indexado por Date.getDay() (0 = domingo).
export const CHECKUP_WEEKDAYS: CheckupWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Documento único `settings/checkups`: quando a equipa faz checkups,
// definido no backoffice (Secção 7b). A app calcula daqui as opções que o
// cliente pode escolher (src/data/checkups.ts). Leitura pública como o
// resto de `settings`; escrita só da equipa. Ausente → CHECKUP_AVAILABILITY_DEFAULT.
export interface CheckupAvailability {
  id: 'checkups';
  // Períodos abertos em cada dia da semana. Dia ausente ou vazio = fechado.
  weekly: Partial<Record<CheckupWeekday, CheckupPeriod[]>>;
  // Dias fechados além do horário semanal (feriados, férias), "AAAA-MM-DD".
  closedDays: string[];
  // Quantas semanas à frente o cliente pode escolher.
  weeksAhead: number;
  // Antecedência mínima em dias (1 = a partir de amanhã).
  minDaysAhead: number;
  updatedAt?: Timestamp;
}

export const CHECKUP_AVAILABILITY_DEFAULT: Omit<CheckupAvailability, 'id' | 'updatedAt'> = {
  weekly: {
    mon: ['morning', 'afternoon'],
    tue: ['morning', 'afternoon'],
    wed: ['morning', 'afternoon'],
    thu: ['morning', 'afternoon'],
    fri: ['morning', 'afternoon'],
  },
  closedDays: [],
  weeksAhead: 3,
  minDaysAhead: 1,
};

// Limites partilhados entre a app (validação) e firestore.rules (que os
// impõe). Se mudares aqui, muda lá.
export const CHECKUP_LIMITS = {
  noteMax: 300,
  weeksAheadMax: 12,
} as const;

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
  // Quando o cliente pediu o checkup na app (Secção 8: "Agendar agora").
  // Igual a `checkupRequest.requestedAt`; o job de acompanhamento trata-o
  // como "o lembrete foi atendido" (não alerta a equipa para ligar).
  checkupRequestedAt?: Timestamp;
  // O pedido de agendamento em curso (Secção 8). Ausente = ainda não pediu.
  // Só o dono escreve os campos do cliente e só a equipa os dela — ver
  // `match /vehicles` em firestore.rules.
  checkupRequest?: CheckupRequest;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// "Produto usado" em texto livre — o modelo ANTERIOR à Secção 13. Só existe
// em trabalhos antigos ainda não migrados (scripts/migrate-work-tags.mjs);
// os novos levam `services` + `brands`. A app mostra-o quando não há tags.
export interface WorkProduct {
  brand: string;
  item: string;
}

// ---------- Tags nos trabalhos (Secção 13) ----------

// O sistema (chãos) ou serviço (carros, gráfico) de um trabalho, escolhido
// de uma lista fixa por categoria — pedido do Fábio (2026-09-04): "nos
// trabalhos de epoxy deve dar para meter 2 tags, a marca e o sistema; nos
// carros o serviço e depois a marca/marcas". Guarda-se o `id` (estável, é
// por ele que a Secção 12 traduz); o rótulo vem de WORK_SERVICES. A lista
// vive no código dos DOIS projetos, igual — acrescentar um sistema é uma
// linha aqui (e a cópia no backoffice) e uma versão nova da app.
export type WorkServiceId =
  // Automotive
  | 'ppf'
  | 'ppf-colour'
  | 'vinyl'
  | 'detailing'
  | 'ceramic'
  | 'starlight'
  // Epoxy Floors (os sistemas da Xtreme Polishing Systems)
  | 'metallic-epoxy'
  | 'solid-colour-epoxy'
  | 'quartz-epoxy'
  | 'flake-epoxy'
  // Graphic
  | 'brand-identity'
  | 'vehicle-graphics'
  | 'signage'
  | 'print'
  | 'social-media';

export interface WorkService {
  id: WorkServiceId;
  category: WorkCategory;
  label: string;
}

export const WORK_SERVICES: WorkService[] = [
  { id: 'ppf', category: 'Automotive', label: 'PPF' },
  { id: 'ppf-colour', category: 'Automotive', label: 'PPF colorido' },
  { id: 'vinyl', category: 'Automotive', label: 'Vinil' },
  { id: 'detailing', category: 'Automotive', label: 'Detailing' },
  { id: 'ceramic', category: 'Automotive', label: 'Proteção cerâmica' },
  { id: 'starlight', category: 'Automotive', label: 'Teto estrelado' },
  { id: 'metallic-epoxy', category: 'Epoxy Floors', label: 'Metallic Epoxy' },
  { id: 'solid-colour-epoxy', category: 'Epoxy Floors', label: 'Solid Colour Epoxy' },
  { id: 'quartz-epoxy', category: 'Epoxy Floors', label: 'Quartz Epoxy' },
  { id: 'flake-epoxy', category: 'Epoxy Floors', label: 'Flake Epoxy' },
  { id: 'brand-identity', category: 'Graphic', label: 'Identidade visual' },
  { id: 'vehicle-graphics', category: 'Graphic', label: 'Decoração de viaturas' },
  { id: 'signage', category: 'Graphic', label: 'Montras e sinalética' },
  { id: 'print', category: 'Graphic', label: 'Impressão' },
  { id: 'social-media', category: 'Graphic', label: 'Redes sociais' },
];

// Como a tag se chama em cada categoria (formulário do backoffice, Portfólio).
export const WORK_SERVICE_KIND: Record<WorkCategory, string> = {
  Automotive: 'Serviço',
  'Epoxy Floors': 'Sistema',
  Graphic: 'Serviço',
};

export function workServicesOf(category: WorkCategory | undefined): WorkService[] {
  return WORK_SERVICES.filter((s) => s.category === category);
}

export function workServiceLabel(id: string): string {
  return WORK_SERVICES.find((s) => s.id === id)?.label ?? id;
}

// Marcas sugeridas no formulário do backoffice (junta-se às já usadas
// noutros trabalhos). Texto livre, nomes próprios — não se traduzem.
export const WORK_BRAND_SUGGESTIONS = ['Xtreme Polishing Systems', 'Inozetek', 'Avery Dennison'];

export const WORK_TAG_LIMITS = {
  brandsMax: 8,
  brandMax: 60,
} as const;

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
  // Tags (Secção 13): o sistema/serviço (ids de WORK_SERVICES da mesma
  // `category`) e as marcas usadas (texto). Chips no Detalhe pela ordem
  // serviço → marcas (pedido do Fábio); filtro secundário no Portfólio.
  // Publicar sem serviço só avisa no backoffice (fica fora do filtro).
  services?: WorkServiceId[];
  brands?: string[];
  // Legado: "produtos usados" de antes da Secção 13. O backoffice apaga-o
  // ao guardar um trabalho com tags; a app só o mostra sem `services`/`brands`.
  products?: WorkProduct[];
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
  // Pedido de orçamento/checkup a que o alerta diz respeito (Secção 7): a
  // confirmação ao cliente e o alerta interno à equipa apontam para ele.
  relatedRequestId?: string;
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

// ---------- Pedidos (Secção 7) ----------

// 'quote' = pedido de orçamento (Secção 7). O agendamento de checkup
// (Secção 8) não passa por aqui — vive em `Vehicle.checkupRequest`; o
// valor 'checkup' que estava reservado saiu na Secção 7b (2026-09-06).
export type RequestType = 'quote';

// Fluxo da equipa: recebido → em contacto → fechado. Só o backoffice muda
// o estado (o cliente cria o pedido e lê os seus; nunca o altera).
export type RequestStatus = 'new' | 'contacted' | 'closed';

export type ContactPreference = 'call' | 'whatsapp' | 'email';

// Foto do carro/espaço juntada pelo cliente ao pedido (opcional, até 5).
// Sobe direto para o Cloudinary com o preset unsigned `marble-requests` e a
// tag `request_<id>`, que é como as Functions as apagam quando o pedido é
// anonimizado (src/media/cloudinary.ts → uploadRequestPhoto).
export interface RequestPhoto {
  url: string;
  thumbnailUrl: string;
  publicId: string;
}

// Um campo estruturado do formulário, guardado já com a etiqueta para o
// backoffice o mostrar sem conhecer o formulário de cada departamento
// (src/data/requestForms.ts). Ex: { key: 'car', label: 'Carro', value: 'BMW M4 2022' }.
export interface RequestField {
  key: string;
  label: string;
  value: string;
}

// Um pedido feito pelo cliente na app. Decisão do Fábio (2026-09-04): o
// pedido cria conta — quem não tem, fica com uma na hora, com os dados do
// formulário (AuthContext.createAccountFromRequest) — por isso `clientId` é
// sempre o uid de quem pediu e as regras exigem-no. Os contactos ficam
// copiados no pedido (o cliente pode mudar o perfil depois; a equipa
// precisa do que foi enviado). Os campos "da equipa" e "das Functions" só
// se escrevem pelo backoffice/Admin SDK; as regras recusam-nos na criação.
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
  // "Orçamento semelhante" a partir do Detalhe: o trabalho e o título na
  // altura (o trabalho pode ser despublicado depois).
  workId?: string;
  workTitle?: string;
  // Opções escolhidas (etiquetas, ex: "PPF", "Detailing").
  services: string[];
  fields: RequestField[];
  message: string;
  photos?: RequestPhoto[];
  platform?: 'android' | 'ios' | 'web';
  // --- equipa (backoffice) ---
  notes?: string;
  contactedAt?: Timestamp;
  closedAt?: Timestamp;
  // --- Cloud Function onRequestWritten ---
  // Marcado quando o mesmo cliente já fez 3 pedidos nas últimas 24 h
  // ('rate_limit') ou quando o projeto inteiro passou o tecto diário de
  // pedidos ('daily_cap', REQUEST_DAILY_CAP em functions/.env — Secção 11):
  // fica na página Pedidos com aviso, sem alerta interno nem email.
  flagged?: 'rate_limit' | 'daily_cap';
  processedAt?: Timestamp;
  teamAlertId?: string;
  confirmationId?: string;
  emailSentAt?: Timestamp;
  emailError?: string;
  // Dados pessoais apagados (12 meses depois de fechado, ou conta apagada).
  anonymizedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'Recebido',
  contacted: 'Em contacto',
  closed: 'Fechado',
};

export const CONTACT_PREFERENCE_LABEL: Record<ContactPreference, string> = {
  call: 'Chamada',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

// Limites partilhados entre a app (validação) e firestore.rules (que os
// impõe). Se mudares aqui, muda lá.
export const REQUEST_LIMITS = {
  messageMax: 2000,
  fieldMax: 200,
  photosMax: 5,
  servicesMax: 12,
  fieldsMax: 8,
  // Anti-spam mínimo: por dispositivo e dia (a app) e por cliente em 24 h
  // (a Cloud Function marca como suspeito).
  perDayMax: 3,
} as const;

// Prazo de resposta prometido ao cliente (ecrã de sucesso, alerta, email).
// Decisão do Fábio (2026-09-04): 1 dia útil.
export const REQUEST_RESPONSE_PROMISE = 'no prazo de 1 dia útil';
