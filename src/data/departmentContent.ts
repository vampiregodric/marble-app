import { DepartmentId } from '../firebase/models';

// Conteúdo estático das páginas de departamento (Secção 9). É texto de
// marketing que muda raramente, por isso vive no código e não no Firestore:
// não há coleção nova, nem ecrã no backoffice, nem regras. Para mudar um
// texto edita-se aqui e publica-se uma versão da app.
//
// A página em si é genérica (src/screens/DepartmentScreen.tsx): lê o
// conteúdo por `DepartmentId` e desenha sempre a mesma estrutura — foto do
// departamento em cima (a escolhida pela equipa em Destaques > Fotos dos
// serviços), título e headline, intro, "O que fazemos", "Como funciona",
// investimento, "Ver também" e um botão final. Para dar página a um
// departamento novo basta acrescentar uma entrada em CONTENT.pt — o cartão
// do Início passa a abri-la sozinho (HomeScreen usa hasDepartmentContent).
// Foi assim com a Xtreme Polishing Systems (Secção 10); a Inozetek tem o
// conteúdo preparado em INOZETEK_CONTENT_PT, no fim deste ficheiro, à
// espera de a parceria ser oficial.
//
// Idiomas: a app está só em português. A estrutura já é por idioma para a
// tradução ser "preencher CONTENT.en" quando a app inteira ganhar inglês;
// até lá, departmentContent() cai sempre para o português.

export type DepartmentLocale = 'pt' | 'en';
export const DEFAULT_LOCALE: DepartmentLocale = 'pt';

// O botão fixo no fim da página. `quote` abre o pedido de orçamento
// (ecrã RequestQuote, Secção 7) já com o departamento; `link` abre um URL
// externo (a loja online da Xtreme Polishing Systems, quando existir —
// ver a entrada `xps`).
export type DepartmentCta = { kind: 'quote'; label: string } | { kind: 'link'; label: string; url: string };

export interface DepartmentBlock {
  title: string;
  text: string;
}

// "Ver também" (Secção 10): cartão que abre a página de outro departamento
// — a Xtreme aponta para Epoxy Floors ("preferes que instalemos nós?") e
// a Epoxy para a Xtreme ("compra os materiais"). Só entre páginas com
// conteúdo; um id sem conteúdo não é mostrado.
export interface DepartmentLink {
  department: DepartmentId;
  title: string;
  text: string;
}

export interface DepartmentContent {
  // Frase curta por baixo do nome, sobre a foto. O nome vem de DEPARTMENTS.
  headline: string;
  intro: string;
  // "O que fazemos" (ou "O que vendemos", na distribuição): 3 a 5 blocos.
  services: DepartmentBlock[];
  // "Como funciona" / "Como comprar": passos numerados pela ordem da lista.
  steps: DepartmentBlock[];
  // "Investimento": uma frase. Sem valores enquanto for "sob consulta".
  pricing?: string;
  // Rótulos das secções quando os genéricos não servem (a distribuição
  // "vende", não "faz"). Sem isto: "O que fazemos" e "Como funciona".
  labels?: { services?: string; steps?: string };
  // "Ver também": ligações cruzadas para outras páginas de departamento.
  related?: DepartmentLink[];
  cta: DepartmentCta;
}

const PT: Partial<Record<DepartmentId, DepartmentContent>> = {
  automotive: {
    headline: 'Proteção e estética de nível premium',
    // A Inozetek é uma das marcas de PPF/vinil que a Marble aplica (Fábio,
    // 2026-09-04: "uma das marcas", há outras; a distribuição está em cima
    // da mesa mas ainda não é oficial). Por isso "marcas como a Inozetek",
    // não "distribuidores oficiais" — quando for, muda aqui e liga-se o
    // cartão (ROADMAP, Secção 10).
    intro:
      'Protegemos e transformamos o teu carro com PPF, vinil e detailing de estúdio, com películas de marcas de referência, como a Inozetek, e um acabamento que se vê ao pormenor.',
    services: [
      {
        title: 'PPF — Paint Protection Film',
        text: 'Película transparente ou colorida que protege a pintura de riscos, gravilha e raios UV. Autorregenerável e praticamente invisível.',
      },
      {
        title: 'Vinil e mudança de cor',
        text: 'Muda a cor do carro sem pintar: vinil de alta qualidade, com acabamento brilhante, mate ou acetinado. Totalmente reversível.',
      },
      {
        title: 'Detailing e correção de pintura',
        text: 'Polimento por fases, remoção de riscos e limpeza profunda do interior e do exterior. O carro volta a parecer novo.',
      },
      {
        title: 'Proteção cerâmica',
        text: 'Camada cerâmica que mantém o brilho, repele água e sujidade e torna cada lavagem mais fácil.',
      },
      {
        title: 'Tetos estrelados e personalização',
        text: 'Iluminação em fibra ótica no teto e outros acabamentos à medida, para um interior único.',
      },
    ],
    steps: [
      { title: 'Avaliação', text: 'Vemos o carro contigo, no estúdio ou por fotos, e percebemos o que queres.' },
      { title: 'Proposta', text: 'Recebes uma proposta com materiais, prazo e preço fechado.' },
      { title: 'Aplicação no estúdio', text: 'Trabalho feito em ambiente controlado, sem pó, com o tempo que cada fase exige.' },
      { title: 'Entrega e acompanhamento', text: 'Explicamos os cuidados a ter e lembramos-te do checkup pela app.' },
    ],
    pricing: 'Sob consulta. Depende do modelo, do material e da área a cobrir.',
    cta: { kind: 'quote', label: 'Pedir orçamento' },
  },

  epoxy: {
    headline: 'Pavimentos que impressionam e duram',
    intro:
      'Aplicamos pavimentos em resina epóxi para garagens, showrooms, lojas, indústria e habitação, com materiais Xtreme Polishing Systems, de que somos distribuidores oficiais.',
    services: [
      {
        title: 'Metallic epoxy',
        text: 'Efeito marmoreado tridimensional, único em cada aplicação. Ideal para showrooms, lojas e espaços de destaque.',
      },
      {
        title: 'Flake systems',
        text: 'Flocos decorativos sobre base epóxi, com acabamento antiderrapante. A escolha certa para garagens e oficinas.',
      },
      {
        title: 'Cores sólidas',
        text: 'Pavimento contínuo, sem juntas, numa cor à escolha. Limpo, resistente e fácil de manter.',
      },
      {
        title: 'Quartzo, comercial e industrial',
        text: 'Sistemas de quartzo e de alta resistência química e mecânica para armazéns, fábricas, cozinhas profissionais e zonas húmidas.',
      },
      {
        title: 'Preparação e reparação da base',
        text: 'Desbaste diamantado, reparação de fissuras e nivelamento antes de qualquer aplicação. É o que garante a durabilidade.',
      },
    ],
    steps: [
      { title: 'Visita e medição', text: 'Vamos ao local, medimos a área e avaliamos o estado do piso.' },
      { title: 'Proposta', text: 'Escolhes o sistema e a cor; recebes prazo e preço fechado.' },
      { title: 'Preparação do piso', text: 'Desbaste, reparações e primário, para a resina agarrar como deve.' },
      { title: 'Aplicação, cura e entrega', text: 'Aplicamos em camadas e o piso cura sem circulação. Entregamos com os cuidados a ter.' },
    ],
    pricing: 'Sob consulta. O preço é por metro quadrado e depende do sistema e do estado da base.',
    related: [
      {
        department: 'xps',
        title: 'Queres fazer o teu próprio chão?',
        text: 'Compra os mesmos materiais que usamos: resinas, pigmentos, flakes e ferramentas Xtreme Polishing Systems.',
      },
    ],
    cta: { kind: 'quote', label: 'Pedir orçamento' },
  },

  // Distribuição Xtreme Polishing Systems (Secção 10). Decisão do Fábio
  // (2026-09-04): o site da Marble vem primeiro e esta página passa depois a
  // espelhá-lo — até lá, categorias de produto com texto (sem lista de
  // produtos nem preços, que mudam demasiado para viverem no código) e
  // "Pedir cotação" em vez de "Comprar na loja", porque ainda não há loja
  // online. Quando houver: trocar o cta por { kind: 'link', label:
  // 'Comprar na loja', url } com o URL REAL da loja da Marble (não o site
  // do fabricante nos EUA, que tiraria a venda à Marble) e reescrever o
  // passo 2. FACTOS A CONFIRMAR pelo Fábio: envios/entregas, venda a
  // particulares, condições para profissionais, e se as cinco categorias
  // abaixo são o que há em stock.
  xps: {
    headline: 'Os mesmos materiais que usamos nos nossos pavimentos',
    intro:
      'Somos distribuidores oficiais da Xtreme Polishing Systems: vendemos as resinas, os pigmentos e as ferramentas que aplicamos nos nossos pavimentos, para profissionais e para quem quer fazer o seu próprio chão. Aconselhamos o sistema certo para cada caso e, se preferires, instalamos.',
    labels: { services: 'O que vendemos', steps: 'Como comprar' },
    services: [
      {
        title: 'Resinas epóxi',
        text: 'Bases, primários e camadas de acabamento para sistemas metallic, flake, quartzo e de cor sólida. Formulações profissionais, com ficha técnica.',
      },
      {
        title: 'Pigmentos metálicos',
        text: 'Pigmentos para o efeito marmoreado dos nossos trabalhos, em dezenas de cores que se combinam entre si.',
      },
      {
        title: 'Flakes e quartzo',
        text: 'Flocos decorativos em várias misturas e tamanhos, e quartzo colorido para pavimentos antiderrapantes e de grande resistência.',
      },
      {
        title: 'Acabamentos e selantes',
        text: 'Camadas finais transparentes, brilhantes ou mate, com proteção UV e opção antiderrapante.',
      },
      {
        title: 'Ferramentas e kits',
        text: 'Rolos, espátulas, sapatos de pregos, misturadores e kits completos por metro quadrado, para começares com tudo o que é preciso.',
      },
    ],
    steps: [
      { title: 'Escolhe o sistema', text: 'Diz-nos a área e o efeito que queres; aconselhamos o sistema e as quantidades certas.' },
      { title: 'Pede uma cotação', text: 'Envia o pedido pela app com as quantidades; confirmamos disponibilidade, preço e prazo.' },
      { title: 'Levantamento ou entrega', text: 'Levantas no estúdio ou combinamos contigo a entrega.' },
      { title: 'Apoio na aplicação', text: 'Ficamos disponíveis para dúvidas durante a aplicação. E se preferires, instalamos nós.' },
    ],
    pricing: 'Sob consulta. Pede uma cotação com as quantidades; condições para profissionais e encomendas de volume.',
    related: [
      {
        department: 'epoxy',
        title: 'Preferes que sejamos nós a instalar?',
        text: 'Vê os sistemas que aplicamos, como funciona e pede orçamento em Epoxy Floors.',
      },
    ],
    cta: { kind: 'quote', label: 'Pedir cotação' },
  },

  graphic: {
    headline: 'A tua marca, do ecrã à parede',
    intro:
      'Criamos a imagem da tua empresa e levamo-la para todo o lado: logótipo, impressão, vinil para montras e viaturas, sinalética e conteúdo para redes sociais.',
    services: [
      {
        title: 'Identidade visual',
        text: 'Logótipo, cores, tipografia e manual de marca. A base de tudo o resto.',
      },
      {
        title: 'Decoração de viaturas',
        text: 'Vinil e lettering para carros e carrinhas comerciais, com design e aplicação feitos por nós.',
      },
      {
        title: 'Montras e sinalética',
        text: 'Vinil para montras, placas, letras recortadas e sinalética interior e exterior.',
      },
      {
        title: 'Impressão',
        text: 'Cartões, flyers, catálogos, roll-ups e lonas, com acabamento profissional.',
      },
      {
        title: 'Conteúdo para redes sociais',
        text: 'Posts, stories e anúncios alinhados com a marca, prontos a publicar.',
      },
    ],
    steps: [
      { title: 'Briefing', text: 'Percebemos o negócio, o público e o que precisas de comunicar.' },
      { title: 'Proposta', text: 'Recebes o que vamos fazer, prazos e preço fechado.' },
      { title: 'Design e aprovação', text: 'Apresentamos propostas e afinamos contigo até estar certo.' },
      { title: 'Produção e aplicação', text: 'Imprimimos, cortamos e aplicamos. Entregas os ficheiros finais prontos a usar.' },
    ],
    pricing: 'Sob consulta. Orçamento fechado por trabalho, sem surpresas.',
    cta: { kind: 'quote', label: 'Pedir orçamento' },
  },

  ai: {
    headline: 'Inteligência artificial ao serviço do teu negócio',
    intro:
      'Ajudamos empresas a pôr a IA a trabalhar no dia a dia: menos tarefas repetitivas, respostas mais rápidas aos clientes e decisões com base em dados.',
    services: [
      {
        title: 'Diagnóstico e consultoria',
        text: 'Olhamos para os processos da tua empresa e identificamos onde a IA poupa tempo e dinheiro. Sais com um plano concreto, por prioridades.',
      },
      {
        title: 'Automação de processos',
        text: 'Ligamos as ferramentas que já usas (email, CRM, faturação, WhatsApp) e automatizamos o que hoje é feito à mão.',
      },
      {
        title: 'Assistentes e chatbots',
        text: 'Atendimento 24/7 no site, WhatsApp ou Instagram, treinado com a informação do teu negócio.',
      },
      {
        title: 'Ferramentas à medida',
        text: 'Quando não existe solução pronta, construímos uma: análise de dados, relatórios automáticos, geração de conteúdos.',
      },
      {
        title: 'Formação da equipa',
        text: 'Sessões práticas para a tua equipa usar a IA com confiança e segurança.',
      },
    ],
    steps: [
      { title: 'Conversa inicial', text: 'Percebemos o teu negócio e os problemas que queres resolver.' },
      { title: 'Proposta', text: 'Recebes um plano com o que vamos fazer, prazos e investimento.' },
      { title: 'Implementação', text: 'Construímos, testamos contigo e formamos a equipa.' },
      { title: 'Acompanhamento', text: 'Ficamos por perto para afinar e fazer evoluir a solução.' },
    ],
    pricing: 'Sob consulta. Cada projeto é diferente: pede uma proposta sem compromisso.',
    cta: { kind: 'quote', label: 'Pedir proposta' },
  },

  ads: {
    headline: 'Google Ads e Meta Ads que trazem clientes',
    intro:
      'Gerimos a publicidade paga da tua empresa no Google, no Facebook e no Instagram, para chegares a quem procura o que vendes, sem desperdiçar orçamento.',
    services: [
      {
        title: 'Google Ads',
        text: 'Campanhas de pesquisa, display e YouTube para apareceres quando alguém procura o teu serviço.',
      },
      {
        title: 'Meta Ads',
        text: 'Anúncios no Facebook e no Instagram, segmentados por localização, interesses e públicos semelhantes.',
      },
      {
        title: 'Criativos e textos',
        text: 'Imagens, vídeos e textos dos anúncios feitos por nós, alinhados com a tua marca.',
      },
      {
        title: 'Medição e conversão',
        text: 'Pixels, conversões e páginas de destino, para saberes o que cada euro traz.',
      },
      {
        title: 'Relatório mensal',
        text: 'Investimento, resultados e próximos passos, em linguagem clara.',
      },
    ],
    steps: [
      { title: 'Análise', text: 'Estudamos o teu mercado, a concorrência e os objetivos.' },
      { title: 'Estratégia e proposta', text: 'Definimos plataformas, orçamento e metas.' },
      { title: 'Lançamento', text: 'Criamos as campanhas e os anúncios. Ficam no ar em dias.' },
      { title: 'Otimização contínua', text: 'Ajustamos todas as semanas para baixar o custo por cliente.' },
    ],
    pricing: 'Sob consulta. O orçamento de anúncios é definido por ti; a gestão é uma avença mensal.',
    cta: { kind: 'quote', label: 'Pedir proposta' },
  },
};

// Inozetek (PPF e vinil para carros) — PREPARADO, NÃO LIGADO. Hoje a
// Inozetek é só uma das marcas que a Marble aplica; a distribuição em
// Portugal está em cima da mesa mas não é oficial (Fábio, 2026-09-04), e o
// SPEC diz "Futuro". Não há DepartmentId 'inozetek' (a lista vive também no
// backoffice), por isso este conteúdo fica fora de CONTENT.pt e não é
// usado por ninguém. Quando a parceria for oficial, os 3 passos para ligar
// o cartão estão no ROADMAP, Secção 10 — este objeto passa a ser a entrada
// `inozetek` de PT. Rascunho a partir do SPEC; factos (stock em Portugal,
// venda a aplicadores, formação) a confirmar pelo Fábio nessa altura.
export const INOZETEK_CONTENT_PT: DepartmentContent = {
  headline: 'Películas de proteção e vinil de cor, com a nossa experiência de aplicação',
  intro:
    'Distribuímos em Portugal as películas Inozetek: PPF transparente e colorido e vinil de mudança de cor, os mesmos materiais que aplicamos no estúdio. Vendemos a profissionais e aplicadores, com aconselhamento técnico.',
  labels: { services: 'O que vendemos', steps: 'Como comprar' },
  services: [
    {
      title: 'PPF transparente',
      text: 'Película de proteção de pintura autorregenerável, praticamente invisível, em rolos e em medidas para pré-corte.',
    },
    {
      title: 'PPF colorido',
      text: 'Proteção e mudança de cor numa só película: brilhante, mate ou acetinado, com a durabilidade do PPF.',
    },
    {
      title: 'Vinil de mudança de cor',
      text: 'Vinil fundido de alta qualidade, em cores sólidas, metálicas e especiais. Totalmente reversível.',
    },
    {
      title: 'Apoio técnico a aplicadores',
      text: 'Ajuda na escolha do material, técnicas de aplicação e resolução de problemas, com a experiência do nosso estúdio.',
    },
  ],
  steps: [
    { title: 'Escolhe o material', text: 'Diz-nos o carro, o acabamento e a cor; confirmamos disponibilidade e quantidades.' },
    { title: 'Pede uma cotação', text: 'Envia o pedido pela app; respondemos com preço e prazo.' },
    { title: 'Levantamento ou entrega', text: 'Levantas no estúdio ou combinamos contigo a entrega.' },
    { title: 'Apoio na aplicação', text: 'Ficamos disponíveis para dúvidas. E se preferires, aplicamos nós.' },
  ],
  pricing: 'Sob consulta. Condições para profissionais e aplicadores.',
  related: [
    {
      department: 'automotive',
      title: 'Preferes que sejamos nós a aplicar?',
      text: 'Vê o que fazemos em PPF, vinil e detailing e pede orçamento em Automotive Aesthetics.',
    },
  ],
  cta: { kind: 'quote', label: 'Pedir cotação' },
};

// Inglês: por preencher quando a app inteira for traduzida. Enquanto uma
// entrada faltar aqui, departmentContent() devolve o português.
const EN: Partial<Record<DepartmentId, DepartmentContent>> = {};

const CONTENT: Record<DepartmentLocale, Partial<Record<DepartmentId, DepartmentContent>>> = { pt: PT, en: EN };

export function departmentContent(id: DepartmentId, locale: DepartmentLocale = DEFAULT_LOCALE): DepartmentContent | undefined {
  return CONTENT[locale][id] ?? CONTENT[DEFAULT_LOCALE][id];
}

// O cartão do Início só abre a página quando há conteúdo — sem isto o
// cartão fica inerte (é o caso da Xtreme até à Secção 10).
export function hasDepartmentContent(id: DepartmentId): boolean {
  return departmentContent(id) !== undefined;
}
