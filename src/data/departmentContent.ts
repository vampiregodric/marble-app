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
// investimento e um botão final. Para dar página a um departamento novo
// (Secção 10: Xtreme Polishing Systems, Inozetek) basta acrescentar uma
// entrada em CONTENT.pt — o cartão do Início passa a abri-la sozinho
// (HomeScreen usa hasDepartmentContent).
//
// Idiomas: a app está só em português. A estrutura já é por idioma para a
// tradução ser "preencher CONTENT.en" quando a app inteira ganhar inglês;
// até lá, departmentContent() cai sempre para o português.

export type DepartmentLocale = 'pt' | 'en';
export const DEFAULT_LOCALE: DepartmentLocale = 'pt';

// O botão fixo no fim da página. `quote` abre o pedido de orçamento
// (ecrã RequestQuote, Secção 7) já com o departamento; `link` abre um URL
// externo (loja online da Xtreme Polishing Systems, Secção 10).
export type DepartmentCta = { kind: 'quote'; label: string } | { kind: 'link'; label: string; url: string };

export interface DepartmentBlock {
  title: string;
  text: string;
}

export interface DepartmentContent {
  // Frase curta por baixo do nome, sobre a foto. O nome vem de DEPARTMENTS.
  headline: string;
  intro: string;
  // "O que fazemos": 3 a 5 blocos.
  services: DepartmentBlock[];
  // "Como funciona": passos numerados pela ordem da lista.
  steps: DepartmentBlock[];
  // "Investimento": uma frase. Sem valores enquanto for "sob consulta".
  pricing?: string;
  cta: DepartmentCta;
}

const PT: Partial<Record<DepartmentId, DepartmentContent>> = {
  automotive: {
    headline: 'Proteção e estética de nível premium',
    intro:
      'Protegemos e transformamos o teu carro com PPF, vinil e detailing de estúdio, com materiais oficiais e um acabamento que se vê ao pormenor.',
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
        title: 'Comercial e industrial',
        text: 'Sistemas de alta resistência química e mecânica para armazéns, fábricas e cozinhas profissionais.',
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
    cta: { kind: 'quote', label: 'Pedir orçamento' },
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
