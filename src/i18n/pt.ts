import { DepartmentId, WorkServiceId } from '../firebase/models';

// Todos os textos da interface em PORTUGUÊS — a fonte de verdade (Secção
// 12). O inglês está em en.ts, com EXATAMENTE as mesmas chaves: o tipo
// `Strings` (index.ts) é `typeof pt`, por isso uma tradução em falta ou
// com outra forma é erro de `npm run typecheck`. Regras:
// - Texto com valores dentro é uma função ((n) => `…${n}…`), não um
//   template com marcadores — sem motor de interpolação para manter.
// - Os textos legais NÃO vivem aqui (src/legal/texts.ts, só em PT).
// - O conteúdo das páginas de departamento também não (departmentContent.ts,
//   por idioma) nem os formulários de orçamento (requestForms.ts).
// - Organização por ecrã/componente; `common` para o que se repete.
export const pt = {
  common: {
    back: 'Voltar',
    close: 'Fechar',
    cancel: 'Cancelar',
    loading: 'A carregar…',
    share: 'Partilhar',
    closeMenu: 'Fechar menu',
    brand: 'Marble Studios',
    // Mensagem genérica para erros sem tradução própria.
    somethingWrong: 'Algo correu mal. Tenta outra vez.',
    offline: 'Sem ligação. Verifica a internet e tenta outra vez.',
  },

  tabs: {
    home: 'Início',
    portfolio: 'Portfólio',
    events: 'Eventos',
    alerts: 'Alertas',
    profile: 'Perfil',
  },

  home: {
    alertsA11y: (unread: number) => (unread > 0 ? `Alertas, ${unread} por ler` : 'Alertas'),
    profileA11y: 'Perfil',
    featuredSoon: 'Os nossos trabalhos em destaque chegam em breve.',
    // "{categoria} · Concluído" no carrossel.
    completed: 'Concluído',
    servicesLabel: 'OS NOSSOS SERVIÇOS',
  },

  // Os seis cartões do Início: o nome é marca (não se traduz); a tagline e
  // o selo sim. Ver src/data/departments.ts.
  departments: {
    tagline: {
      automotive: 'PPF, vinil & detailing',
      epoxy: 'Metallic, flake & solid',
      graphic: 'Identidade & impressão',
      ai: 'Consultoria & automação com IA',
      ads: 'Google Ads & Meta Ads',
      xps: 'Buy your epoxy here',
    } satisfies Record<DepartmentId, string>,
    badgeOfficial: 'Oficial',
  },

  portfolio: {
    title: 'Portfólio',
    all: 'Todos',
    count: (n: number) => (n === 1 ? '1 trabalho publicado' : `${n} trabalhos publicados`),
    emptyAll: 'Ainda não há trabalhos publicados.',
    emptyCategory: 'Ainda não há trabalhos nesta categoria.',
    emptyDesc: 'Assim que a equipa publicar um trabalho novo, aparece aqui.',
    seeAll: 'Ver todos',
    // Filtro secundário pelo sistema/serviço (Secção 13).
    emptyService: 'Ainda não há trabalhos com este serviço.',
    seeCategory: 'Ver toda a categoria',
  },

  events: {
    title: 'Eventos',
    subtitle: 'Onde nos vais encontrar',
    upcoming: 'Próximos',
    past: 'Passados',
    statusDone: 'Concluído',
    statusToday: 'Hoje',
    statusSoon: 'Em breve',
    emptyPast: 'Ainda não há eventos passados.',
    emptyPastDesc: 'Os eventos em que já estivemos ficam aqui como memória.',
    emptyUpcoming: 'Não há eventos marcados por agora.',
    emptyUpcomingDesc: 'Anunciamos aqui feiras, car meets e open days assim que estiverem confirmados.',
  },

  alerts: {
    title: 'Alertas',
    allRead: 'Tudo lido',
    unread: (n: number) => (n === 1 ? '1 por ler' : `${n} por ler`),
    unreadA11y: ', por ler',
    pushTitle: 'Recebe os alertas no telemóvel',
    pushDesc:
      'Sabe logo quando há um checkup a confirmar ou uma resposta da equipa, mesmo com a app fechada. Ofertas e novidades só se as ligares no Perfil.',
    pushDeniedTitle: 'Notificações desligadas',
    pushDeniedDesc: 'Liga-as nas definições do telemóvel para saberes dos checkups e das respostas da equipa mesmo com a app fechada.',
    enable: 'Ativar notificações',
    openSettings: 'Abrir definições',
    enableError: 'Não foi possível ativar as notificações. Tenta outra vez.',
    emptyTitle: 'Sem alertas por agora.',
    emptyDesc: 'Quando houver um checkup a confirmar, um trabalho novo ou uma oferta para ti, aparece aqui.',
    // Nome do canal de notificações no Android (Definições > Notificações).
    channelName: 'Alertas da Marble Studios',
  },

  // Passo "Recebe os alertas no telemóvel" (Secção 15), uma vez por conta,
  // logo a seguir ao registo. O cartão de push reutiliza `alerts.*`
  // (Ativar notificações, desligadas, Abrir definições, erro) e o
  // interruptor reutiliza `profile.marketingLabel/marketingHint`.
  onboarding: {
    eyebrowNew: 'Bem-vindo',
    eyebrow: 'Notificações',
    title: 'Recebe os alertas no telemóvel',
    lead: 'Os lembretes de checkup e as respostas da equipa fazem parte do serviço e vão sempre. Ofertas e novidades só se quiseres — decides aqui e mudas no Perfil quando quiseres.',
    pushTitle: 'Notificações no telemóvel',
    pushDesc: 'Sabe logo quando há um checkup a confirmar, um dia proposto pela equipa ou uma resposta ao teu pedido — mesmo com a app fechada.',
    pushActive: 'Ativas neste telemóvel',
    marketingError: 'Não foi possível guardar a tua escolha. Tenta outra vez ou muda-a no Perfil.',
    notNow: 'Agora não',
    continue: 'Continuar',
  },

  work: {
    unavailableTitle: 'Este trabalho já não está disponível.',
    unavailableDesc: 'Pode ter sido retirado do portfólio. Vê os outros trabalhos publicados.',
    completedOn: (date: string) => `Concluído: ${date}`,
    requestSimilar: 'Pedir orçamento semelhante',
    // Leitores de ecrã, nos chips das tags (Secção 13).
    serviceA11y: (s: string) => `Serviço: ${s}`,
    brandA11y: (b: string) => `Marca: ${b}`,
  },

  gallery: {
    seeVideo: 'Ver vídeo',
    itemA11y: (kind: 'photo' | 'video', i: number, n: number) =>
      `${kind === 'video' ? 'Vídeo' : 'Foto'} ${i} de ${n}. Abrir em ecrã inteiro`,
    photoFailed: 'Não foi possível carregar esta foto.',
  },

  department: {
    unavailableTitle: 'Esta página não está disponível.',
    unavailableDesc: 'Volta ao Início para ver os nossos serviços.',
    whatWeDo: 'O que fazemos',
    howItWorks: 'Como funciona',
    recentWorks: 'Trabalhos recentes',
    seePortfolio: 'Ver portfólio',
    // Cartão de "O que fazemos" que abre o Portfólio filtrado pelo serviço
    // (Secção 14). Só aparece quando há trabalhos publicados com ele.
    seeWorks: 'Ver trabalhos',
    recentEmpty: 'Ainda não há trabalhos publicados nesta categoria.',
    seeAlso: 'Ver também',
    pricing: 'Investimento',
  },

  login: {
    login: { eyebrow: 'A tua conta', title: 'Entrar', lead: 'Vê os teus carros e chãos, confirma checkups e recebe os alertas da Marble Studios.', cta: 'Entrar' },
    register: { eyebrow: 'Bem-vindo', title: 'Criar conta', lead: 'Fica com o histórico dos teus trabalhos e lembretes de manutenção num só sítio.', cta: 'Criar conta' },
    reset: { eyebrow: 'Recuperar acesso', title: 'Nova password', lead: 'Enviamos-te um email com um link para definires uma password nova.', cta: 'Enviar email' },
    name: 'Nome',
    namePlaceholder: 'O teu nome',
    email: 'Email',
    emailPlaceholder: 'nome@exemplo.pt',
    phone: 'Telemóvel',
    phoneHint: 'Para a equipa te ligar sobre checkups e marcações.',
    phonePlaceholder: '912 345 678',
    password: 'Password',
    passwordPlaceholderNew: 'Mínimo 6 caracteres',
    passwordPlaceholder: 'A tua password',
    termsRequired: 'Tens de aceitar os termos e a política de privacidade para criar conta.',
    resetSent: 'Se existir conta com esse email, vais receber o link nos próximos minutos.',
    forgot: 'Esqueceste-te da password?',
    noAccount: 'Ainda não tens conta? ',
    createAccount: 'Criar conta',
    haveAccount: 'Já tens conta? ',
    enter: 'Entrar',
    // Checkbox dos termos: "Li e aceito os {Termos} e a {Política}."
    acceptPrefix: 'Li e aceito os ',
    acceptMiddle: ' e a ',
    acceptSuffix: '.',
    termsLink: 'Termos de utilização',
    privacyLink: 'Política de privacidade',
  },

  form: {
    showPassword: 'Mostrar password',
    hidePassword: 'Ocultar password',
  },

  photoPicker: {
    add: 'Adicionar',
    addA11y: 'Adicionar foto',
    removeA11y: (i: number) => `Remover foto ${i}`,
    fromLibrary: 'Escolher da galeria',
    takePhoto: 'Tirar foto',
    addTitle: 'Adicionar foto',
    pickFailed: 'Não foi possível escolher a foto.',
  },

  profile: {
    since: (monthYear: string) => `Cliente desde ${monthYear}`,
    avatarA11yChange: 'Mudar ou remover a foto de perfil',
    avatarA11yPick: 'Escolher foto de perfil',
    avatarUploading: 'A enviar a foto…',
    avatarSaveFailed: 'Não foi possível guardar a foto.',
    avatarMenuTitle: 'Foto de perfil',
    removePhoto: 'Remover foto',
    termsUpdatedTitle: 'Termos e privacidade atualizados',
    termsUpdatedPrefix: 'Para continuares a usar a tua conta precisamos que leias e aceites a versão atual dos ',
    termsUpdatedMiddle: ' e da ',
    termsUpdatedSuffix: '.',
    termsAccept: 'Li e aceito',
    vehiclesTitle: 'Os teus carros & chãos',
    vehiclesError: 'Não foi possível carregar os teus carros e chãos.',
    vehiclesEmpty: 'Ainda não tens carros ou chãos registados.',
    vehiclesEmptyDesc: 'A equipa associa-os à tua conta quando fizeres um trabalho connosco — e a partir daí acompanhas aqui os checkups.',
    // Linha secundária de um carro/chão.
    installed: (date: string) => `Instalado: ${date}`,
    lastVisit: (date: string) => `Última visita: ${date}`,
    registered: (date: string) => `Registado: ${date}`,
    requestsTitle: 'Os teus pedidos',
    requestsEmpty: 'Ainda não pediste nenhum orçamento.',
    requestsEmptyDesc: 'Pede a partir de um trabalho do Portfólio ("Pedir orçamento semelhante") ou aqui.',
    requestQuote: 'Pedir orçamento',
    similarTo: (title: string) => `Semelhante a: ${title}`,
    notificationsTitle: 'Notificações',
    operationalLabel: 'Lembretes dos teus carros e chãos',
    operationalHint: 'Checkups e contactos sobre trabalhos teus. Fazem parte do serviço.',
    always: 'Sempre',
    marketingLabel: 'Ofertas e novidades',
    marketingHint: 'Novos trabalhos no portfólio, eventos e ofertas. Podes desligar quando quiseres.',
    accountTitle: 'Conta',
    personalData: 'Dados pessoais',
    privacy: 'Política de privacidade',
    terms: 'Termos de utilização',
    signOut: 'Terminar sessão',
    deleteAccount: 'Apagar a minha conta e dados',
  },

  // Sistema/serviço das tags dos trabalhos (Secção 13). Os rótulos PT de
  // WORK_SERVICES em models.ts ficam para o backoffice; a app mostra estes.
  // Os sistemas de epóxi são nomes da Xtreme e não se traduzem.
  workServices: {
    ppf: 'PPF',
    'ppf-colour': 'PPF colorido',
    vinyl: 'Vinil',
    detailing: 'Detailing',
    ceramic: 'Proteção cerâmica',
    starlight: 'Teto estrelado',
    'metallic-epoxy': 'Metallic Epoxy',
    'solid-colour-epoxy': 'Solid Colour Epoxy',
    'quartz-epoxy': 'Quartz Epoxy',
    'flake-epoxy': 'Flake Epoxy',
    'brand-identity': 'Identidade visual',
    'vehicle-graphics': 'Decoração de viaturas',
    signage: 'Montras e sinalética',
    print: 'Impressão',
    'social-media': 'Redes sociais',
  } satisfies Record<WorkServiceId, string>,

  // Estados de um pedido de orçamento (REQUEST_STATUS_LABEL em models.ts
  // fica em PT para o backoffice; a app mostra estes).
  requestStatus: {
    new: 'Recebido',
    contacted: 'Em contacto',
    closed: 'Fechado',
  },

  contactPreference: {
    call: 'Chamada',
    whatsapp: 'WhatsApp',
    email: 'Email',
  },

  checkup: {
    // Etiquetas de estado na linha do carro/chão (CheckupState).
    rowStatus: {
      ok: 'Em dia',
      todo: 'Checkup',
      requested: 'Pedido',
      proposed: 'Proposta',
      scheduled: 'Agendado',
      declined: 'Sem checkup',
    },
    // Etiqueta do cartão "Ação pendente" por estado.
    cardTag: {
      ok: '',
      todo: 'Ação pendente',
      requested: 'A aguardar aprovação',
      proposed: 'Proposta da equipa',
      scheduled: 'Agendado',
      declined: '',
    },
    rowA11y: (name: string, status: string) => `${name}: ${status.toLowerCase()} — opções de checkup`,
    // Linha secundária.
    subRequested: (slot: string) => `Checkup pedido: ${slot}`,
    subProposed: (slot: string) => `Proposta da equipa: ${slot}`,
    subScheduled: (slot: string) => `Checkup: ${slot}`,
    subDeclined: 'Checkup cancelado · toca para voltar a pedir',
    // Cartão.
    cardTitleTodo: (isFloor: boolean) => `Checkup ${isFloor ? 'do teu chão' : 'do teu carro'}`,
    cardDescTodo: (name: string, completedAgo: string | null) =>
      `${name}${completedAgo ? ` · trabalho concluído ${completedAgo.toLowerCase()}` : ''}. Escolhe o dia que te dá jeito para o checkup gratuito — a equipa confirma.`,
    cardTitleRequested: (slot: string) => `Checkup pedido: ${slot}`,
    cardDescRequested: (name: string, note: string | undefined) =>
      `${name}. A equipa vai confirmar em breve — recebes um alerta quando estiver agendado.${note ? ` A tua nota: "${note}".` : ''}`,
    cardTitleProposed: (slot: string) => `A equipa propõe ${slot}`,
    cardDescProposed: (name: string, teamNote: string) => `${name}. ${teamNote || 'O dia que pediste não dá. Confirma esta proposta ou escolhe outro dia.'}`,
    cardTitleScheduled: (slot: string) => `Checkup agendado: ${slot}`,
    cardDescScheduled: (name: string, teamNote: string) => `${name}. ${teamNote || 'Até lá! Se precisares de mudar o dia, altera aqui.'}`,
    scheduleNow: 'Agendar agora',
    confirm: 'Confirmar',
    confirmA11y: 'Confirmar a proposta',
    chooseAnotherDay: 'Escolher outro dia',
    change: 'Alterar',
    changeDay: 'Alterar o dia',
    cancelRequest: 'Cancelar pedido',
    cancelRequestLong: 'Cancelar o pedido',
    cancelCheckup: 'Cancelar o checkup',
    confirmSlot: (slot: string | null) => `Confirmar ${slot ?? 'a proposta'}`,
    cancelTitle: (name: string) => `Cancelar o checkup do ${name}?`,
    cancelYes: 'Sim, cancelar o checkup',
    // Folha de agendamento.
    sheetEditTitle: 'Alterar o pedido',
    sheetNewTitle: 'Checkup gratuito',
    sheetCloseA11y: 'Fechar agendamento',
    sheetNoDays: 'Ainda não há dias abertos para checkups.',
    sheetNoDaysDesc: 'A equipa está a organizar a agenda. Tenta mais tarde ou liga-nos para marcar.',
    sheetIntro: 'Escolhe o dia e o período que te dão jeito. A equipa confirma e recebes um alerta quando estiver agendado.',
    day: 'Dia',
    dayA11y: (weekdayLong: string, date: string) => `Dia ${weekdayLong}, ${date}`,
    period: 'Período',
    periodA11y: (period: string) => `Período ${period}`,
    periodClosed: ' · fechado',
    morning: 'Manhã',
    afternoon: 'Tarde',
    // "seg, 7 set, de manhã" / "seg, 7 set às 10:30"
    slotMorning: 'de manhã',
    slotAfternoon: 'à tarde',
    slotAt: 'às',
    noteLabel: 'Nota para a equipa (opcional)',
    noteA11y: 'Nota para a equipa',
    notePlaceholder: 'Ex.: só depois das 15h, ou o carro tem um risco novo',
    save: 'Guardar alteração',
    request: 'Pedir checkup',
    errorChanged: 'Não foi possível guardar: o estado deste checkup mudou entretanto. Vê o cartão atualizado e tenta outra vez.',
  },

  request: {
    title: 'Pedir orçamento',
    doneEyebrow: 'Pedido enviado',
    doneTitle: 'Recebemos o teu pedido.',
    // "A equipa … responde no prazo de 1 dia útil, por WhatsApp (912…)."
    responsePromise: 'no prazo de 1 dia útil',
    doneText: (promise: string, contact: string, detail: string) => `A equipa da Marble Studios responde ${promise}, por ${contact} (${detail}).`,
    doneAccountCreated: (email: string) =>
      `Criámos-te uma conta na app com estes dados — já estás com sessão iniciada neste dispositivo e podes acompanhar o pedido no Perfil. Enviámos um email para ${email} para definires a tua password (se não aparecer, vê o spam).`,
    doneFollow: 'Podes acompanhar o estado do pedido no teu Perfil, em "Os teus pedidos".',
    seeMyRequests: 'Ver os meus pedidos',
    backHome: 'Voltar ao início',
    similarTo: 'Orçamento semelhante a',
    workUnavailable: 'Trabalho já não disponível',
    department: 'Departamento',
    chooseDepartment: 'Escolhe o departamento.',
    chooseOption: 'Escolhe uma opção.',
    fillField: 'Preenche este campo.',
    maxChars: (n: number) => `No máximo ${n} caracteres.`,
    messageShort: 'Conta-nos um pouco mais sobre o que pretendes.',
    message: 'Mensagem',
    contactHow: 'Como preferes que te contactemos?',
    missing: 'Falta-nos',
    yourData: 'Os teus dados',
    loginLead: 'Entra com a tua conta para enviares o pedido e o acompanhares na app.',
    createLead: 'Com estes dados criamos-te uma conta na app, para acompanhares o pedido e receberes a resposta. Recebes um email para definires a password.',
    passwordPlaceholder: 'A password da tua conta',
    passwordHint: 'Esqueceste-te dela? No Perfil > Entrar podes pedir uma nova.',
    phoneHint: 'É por aqui que a equipa te contacta sobre o orçamento.',
    // Checkbox: "Li e aceito os {Termos} e a {Política}, e que a app crie a minha conta com estes dados."
    acceptSuffix: ', e que a app crie a minha conta com estes dados.',
    termsRequired: 'Para criarmos a tua conta precisamos que aceites os termos e a política de privacidade.',
    contactLine: (phone: string, email: string) => `Contactamos-te por ${phone}${email ? ` · ${email}` : ''}. `,
    edit: 'Alterar',
    loginAndSend: 'Entrar e enviar',
    send: 'Enviar pedido',
    legalNote: 'Um orçamento só é vinculativo depois de confirmado por escrito pela equipa.',
    busyLogin: 'A entrar…',
    busyCreating: 'A criar a tua conta…',
    busyPhoto: (i: number, n: number) => `A enviar foto ${i} de ${n}…`,
    busySending: 'A enviar o pedido…',
    emailExists: 'Já existe uma conta com este email. Escreve a tua password para entrar e enviar o pedido.',
    dailyLimit: (n: number) =>
      `Já enviaste ${n} pedidos nas últimas 24 horas. Se quiseres acrescentar algo, espera pela nossa resposta ou fala connosco diretamente.`,
    sendFailed: (code: string) => `Não foi possível enviar o pedido. Tenta outra vez.${code ? ` (${code})` : ''}`,
  },

  personalData: {
    title: 'Dados pessoais',
    name: 'Nome',
    phone: 'Telemóvel',
    phoneHint: 'Para a equipa te ligar sobre checkups e marcações.',
    email: 'Email',
    emailHint: 'Para mudar o email de acesso, fala com a Marble Studios.',
    saved: 'Dados guardados.',
    save: 'Guardar',
    passwordTitle: 'Password',
    passwordDesc: 'Por segurança a password muda-se por email: recebes um link para definir uma nova.',
    sendResetLink: 'Enviar link para alterar password',
    resetSent: (email: string) => `Enviámos um link para ${email} para definires uma password nova.`,
  },

  deleteAccount: {
    title: 'Apagar conta',
    doneEyebrow: 'Conta apagada',
    doneTitle: 'Até à próxima',
    doneLead: 'Os teus dados pessoais foram removidos. Obrigado por teres sido cliente da Marble Studios — as portas ficam abertas.',
    backHome: 'Voltar ao início',
    eyebrow: 'Isto é definitivo',
    heading: 'Apagar a minha conta e dados',
    lead: 'Antes de confirmares, o que vai acontecer:',
    consequences: [
      'Deixas de conseguir entrar. Não há como recuperar a conta depois.',
      'O teu nome, email e telemóvel são removidos do nosso registo de imediato.',
      'O histórico de trabalhos nos teus carros e chãos fica guardado sem ligação a ti, para efeitos de garantia e portfólio.',
      'Deixas de receber notificações e a equipa deixa de ter o teu contacto.',
    ],
    passwordLabel: 'Confirma com a tua password',
    passwordPlaceholder: 'A tua password',
    passwordRequired: 'Escreve a tua password para confirmar.',
    confirm: 'Apagar definitivamente',
    keep: 'Afinal não, manter a conta',
  },

  legal: {
    version: (date: string) => `Versão de ${date}`,
    // Só aparece em EN: os textos legais existem só em português (a revisão
    // jurídica é de um texto).
    portugueseOnly: '',
  },

  errors: {
    auth: {
      invalidEmail: 'Esse email não parece válido.',
      missingPassword: 'Escreve a tua password.',
      wrongCredentials: 'Email ou password errados.',
      emailInUse: 'Já existe uma conta com este email. Entra ou recupera a password.',
      weakPassword: 'A password tem de ter pelo menos 6 caracteres.',
      tooManyRequests: 'Demasiadas tentativas. Espera uns minutos e tenta outra vez.',
      userDisabled: 'Esta conta foi desativada. Fala com a Marble Studios.',
      recentLogin: 'Por segurança, termina sessão e volta a entrar antes de fazer isto.',
      termsRequired: 'Tens de aceitar os termos para criar conta.',
    },
    loadFailed: 'Não foi possível carregar. Tenta outra vez daqui a pouco.',
    cameraDenied: 'Sem acesso à câmara. Dá permissão à app nas definições do telemóvel.',
    avatarNotConfigured: 'O alojamento de fotos ainda não está configurado nesta versão da app.',
    requestUploadNotConfigured: 'O envio de fotos ainda não está configurado nesta versão da app.',
    requestPresetMissing: 'O envio de fotos ainda não está ativo nesta versão da app. Remove as fotos e envia o pedido sem elas — a equipa pede-tas depois.',
    uploadNetwork: 'Falha de rede ao enviar a foto. Verifica a internet e tenta outra vez.',
    uploadTimeout: 'O envio demorou demasiado. Tenta outra vez com melhor ligação.',
    uploadStatus: (status: number) => `O alojamento de fotos respondeu ${status}.`,
  },

  validation: {
    emailRequired: 'Escreve o teu email.',
    emailInvalid: 'Esse email não parece válido.',
    passwordRequired: 'Escreve uma password.',
    passwordShort: 'A password tem de ter pelo menos 6 caracteres.',
    nameRequired: 'Escreve o teu nome.',
    phoneRequired: 'Escreve o teu telemóvel — é como a equipa te contacta.',
    phoneShort: 'Esse número parece curto demais.',
  },

  dates: {
    monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    weekdaysShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    weekdaysLong: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    // Nos textos de checkup o mês vai em minúsculas ("seg, 7 set"), como
    // nos alertas escritos pelas Cloud Functions.
    lowercaseMonthInSlot: true,
    justNow: 'Agora mesmo',
    minutesAgo: (n: number) => `Há ${n} min`,
    hoursAgo: (n: number) => (n === 1 ? 'Há 1 hora' : `Há ${n} horas`),
    yesterday: 'Ontem',
    daysAgo: (n: number) => `Há ${n} dias`,
    weeksAgo: (n: number) => (n === 1 ? 'Há 1 semana' : `Há ${n} semanas`),
    monthsAgo: (n: number) => (n <= 1 ? 'Há 1 mês' : `Há ${n} meses`),
    yearsAgo: (n: number) => (n <= 1 ? 'Há 1 ano' : `Há ${n} anos`),
  },
};
