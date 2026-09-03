// Textos legais da app: política de privacidade e termos de utilização.
//
// Este ficheiro NÃO importa nada (nem Firebase, nem React) de propósito: é
// lido pela app (ecrã Legal, aceitação no registo) e pelo script
// `npm run build:legal`, que gera as páginas HTML públicas em docs/legal/
// (as lojas exigem um URL público da política — ver Secção 11 do ROADMAP).
//
// Sempre que alterares o texto de forma material (novas finalidades, novos
// destinatários, prazos diferentes), sobe a LEGAL_VERSION: a app pede a todos
// os clientes que voltem a aceitar os termos na próxima vez que abrirem o
// Perfil. Correções de ortografia não precisam de nova versão.
//
// Isto cobre a proteção de dados pessoais na app. Não é aconselhamento
// jurídico: confirma com um advogado/contabilista antes do lançamento.

export const LEGAL_VERSION = '2026-09-03';

// Dados da empresa (preenchidos pelo Fábio a 2026-09-03). A marca é
// "Marble Studios"; a entidade legal é a Cacto Elegante, Lda. Se algum
// destes mudar, corre `npm run build:legal` para regenerar docs/legal/.
export const COMPANY = {
  brand: 'Marble Studios',
  legalName: 'Cacto Elegante, Lda.',
  nif: '519355849',
  address: 'Rua Quinta das Rosas 12A, 2840-131 Paio Pires',
  // Recebe pedidos de acesso/apagamento/etc. (prazo legal de resposta: um
  // mês). Alguém da equipa tem de ler esta caixa com regularidade.
  privacyEmail: 'app@marble.pt',
};

export type LegalDoc = 'privacy' | 'terms';

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  // Parágrafos depois da lista, quando há.
  after?: string[];
};

export type LegalText = {
  title: string;
  shortTitle: string;
  intro: string;
  sections: LegalSection[];
};

// Prazos da política de retenção (Secção 3, decisão do Fábio a 2026-09-03).
// Usados nos textos e, mais tarde, pelo job de limpeza da Secção 6.
export const RETENTION = {
  inactiveAccountYears: 3,
  // Prazo legal de conservação de documentos de faturação em Portugal.
  invoicingYears: 10,
};

const PRIVACY: LegalText = {
  title: 'Política de Privacidade',
  shortTitle: 'Privacidade',
  intro:
    `A app ${COMPANY.brand} guarda dados pessoais de clientes de um negócio na União Europeia. ` +
    'Esta política explica, sem rodeios, que dados recolhemos, para quê, durante quanto tempo e ' +
    'que direitos tens sobre eles, conforme o Regulamento Geral sobre a Proteção de Dados (RGPD) ' +
    'e a Lei n.º 58/2019.',
  sections: [
    {
      title: '1. Quem é o responsável pelos teus dados',
      paragraphs: [
        `${COMPANY.legalName}, NIF ${COMPANY.nif}, com sede em ${COMPANY.address} (adiante "${COMPANY.brand}").`,
        `Para qualquer assunto sobre os teus dados, escreve para ${COMPANY.privacyEmail}.`,
      ],
    },
    {
      title: '2. Que dados recolhemos',
      paragraphs: ['Recolhemos apenas o necessário para a app funcionar e para a equipa te acompanhar:'],
      bullets: [
        'Dados da conta, que tu nos dás no registo: nome, email, número de telemóvel e password. A password é guardada de forma cifrada pelo serviço de autenticação, e nunca é visível para a equipa.',
        'Dados de serviço, registados pela equipa quando fazes um trabalho connosco: o teu carro ou chão (modelo, e matrícula quando for necessária para o serviço), o trabalho realizado, produtos aplicados, datas de checkup e fotografias do trabalho.',
        'Preferências: que notificações queres receber, e se aceitaste receber ofertas e novidades.',
        'Dados técnicos mínimos: um identificador do dispositivo para entregar notificações push (só se as ativares no telemóvel) e registos de erros da app, sem conteúdo pessoal.',
      ],
      after: ['Não recolhemos localização, contactos, fotografias do teu telemóvel nem dados de pagamento. A app não tem pagamentos.'],
    },
    {
      title: '3. Para que usamos os dados e com que base legal',
      paragraphs: ['Cada utilização tem uma base legal prevista no RGPD:'],
      bullets: [
        `Criar e gerir a tua conta, mostrar-te os teus carros, chãos e histórico de trabalhos: execução do contrato de prestação de serviços entre ti e a ${COMPANY.brand}.`,
        'Lembrar-te de checkups e contactar-te (por notificação ou telefone) sobre um trabalho teu: execução do contrato e interesse legítimo em garantir a qualidade do serviço. Estas comunicações são operacionais, não são publicidade.',
        'Enviar-te ofertas e novidades (novos trabalhos no portfólio, eventos, promoções): apenas com o teu consentimento, que dás e retiras no Perfil, em "Ofertas e novidades". Está desligado por defeito.',
        'Emitir faturas e cumprir obrigações fiscais e de garantia: obrigação legal.',
        'Manter a app segura e prevenir abusos: interesse legítimo.',
      ],
    },
    {
      title: '4. Notificações: operacionais e de marketing',
      paragraphs: [
        'Distinguimos dois tipos de notificação. As operacionais dizem respeito a um trabalho teu (por exemplo, o lembrete de checkup do teu PPF uma semana depois da aplicação) e fazem parte do serviço. As de marketing (ofertas, novidades do portfólio, eventos) só são enviadas se tiveres ligado "Ofertas e novidades" no Perfil, e podes escolher as categorias que te interessam.',
        'Podes desligar todas as notificações push nas definições do teu telemóvel. Nesse caso, a equipa pode ainda contactar-te por telefone sobre trabalhos teus.',
      ],
    },
    {
      title: '5. Com quem partilhamos os dados',
      paragraphs: [
        'Não vendemos nem cedemos os teus dados a terceiros para fins próprios deles. Usamos apenas fornecedores técnicos que atuam por nossa conta (subcontratantes):',
      ],
      bullets: [
        'Google Firebase (Google Ireland Ltd.): autenticação, base de dados e alojamento da app. A base de dados está em servidores na União Europeia (região "eur3", Europa). O serviço de autenticação pode processar dados fora da UE ao abrigo das cláusulas contratuais-tipo aprovadas pela Comissão Europeia e dos termos de tratamento de dados da Google.',
        'Expo (Expo, Inc., EUA): serviço de entrega de notificações push, apenas quando as ativares. Recebe o identificador do dispositivo e o texto da notificação.',
      ],
      after: ['Podemos ainda partilhar dados quando a lei o exigir, por exemplo com a Autoridade Tributária no âmbito da faturação.'],
    },
    {
      title: '6. Durante quanto tempo guardamos os dados',
      paragraphs: [],
      bullets: [
        'Enquanto a tua conta existir, guardamos os dados da conta e o histórico de serviço, para que os possas consultar e para a equipa te acompanhar.',
        'Quando apagas a conta (Perfil > Apagar conta), o teu nome, email e telemóvel são removidos de imediato do registo de cliente e deixas de poder entrar. O histórico de trabalhos fica guardado de forma anonimizada, ou seja, sem qualquer ligação a ti, para efeitos de garantia, portfólio e estatística.',
        `Contas sem qualquer atividade durante ${RETENTION.inactiveAccountYears} anos são apagadas da mesma forma.`,
        `Faturas e documentos fiscais são conservados fora da app pelo prazo legal de ${RETENTION.invoicingYears} anos.`,
      ],
    },
    {
      title: '7. Os teus direitos',
      paragraphs: ['Tens direito a:'],
      bullets: [
        'Aceder aos teus dados e receber uma cópia.',
        'Retificar dados errados. Nome e telemóvel corrigem-se em Perfil > Dados pessoais.',
        'Apagar a conta e os dados, em Perfil > Apagar conta, ou pedindo-nos por email.',
        'Retirar o consentimento para marketing a qualquer momento, em Perfil > Ofertas e novidades. Isso não afeta a legalidade do que foi feito antes.',
        'Opor-te ou pedir a limitação do tratamento, e receber os teus dados num formato de uso corrente (portabilidade).',
        'Apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em www.cnpd.pt.',
      ],
      after: [
        `Para exercer qualquer destes direitos, escreve para ${COMPANY.privacyEmail} a partir do email da tua conta. Respondemos no prazo máximo de um mês.`,
      ],
    },
    {
      title: '8. Idade mínima',
      paragraphs: ['A app destina-se a clientes com 18 anos ou mais. Se soubermos que uma conta pertence a um menor, apagamo-la.'],
    },
    {
      title: '9. Segurança',
      paragraphs: [
        'Toda a comunicação entre a app e os servidores é cifrada (HTTPS). As regras de acesso à base de dados garantem que só tu, com a tua sessão, consegues ler os teus dados; o portfólio e os eventos são públicos por natureza. A equipa acede aos dados de clientes apenas através de ferramentas internas com credenciais próprias.',
      ],
    },
    {
      title: '10. Alterações a esta política',
      paragraphs: [
        `Esta versão é de ${LEGAL_VERSION}. Se fizermos alterações relevantes, a app pede-te que leias e aceites a nova versão na próxima vez que abrires o Perfil.`,
      ],
    },
  ],
};

const TERMS: LegalText = {
  title: 'Termos de Utilização',
  shortTitle: 'Termos',
  intro:
    `Estes termos regulam a utilização da app ${COMPANY.brand}. Ao criar conta, aceita-los. ` +
    'Lê também a Política de Privacidade, que explica o que fazemos com os teus dados.',
  sections: [
    {
      title: '1. O que é a app',
      paragraphs: [
        `A app ${COMPANY.brand} é disponibilizada por ${COMPANY.legalName}, NIF ${COMPANY.nif}, com sede em ${COMPANY.address}. Serve para os clientes acompanharem os trabalhos feitos nos seus carros e chãos, receberem lembretes de checkup, verem o portfólio e os eventos, e pedirem orçamentos.`,
        'A app é gratuita e não tem pagamentos. Qualquer serviço que contrates é combinado, faturado e pago diretamente com a equipa, fora da app.',
      ],
    },
    {
      title: '2. A tua conta',
      paragraphs: [],
      bullets: [
        'Tens de ter 18 anos ou mais para criar conta.',
        'Os dados que dás no registo têm de ser verdadeiros e teus. O telemóvel é obrigatório porque a equipa te liga para confirmar checkups e marcações.',
        'A conta é pessoal. És responsável por manter a password segura e por tudo o que for feito com a tua sessão.',
        'Podes apagar a conta a qualquer momento em Perfil > Apagar conta.',
      ],
    },
    {
      title: '3. Marcações, orçamentos e ofertas',
      paragraphs: [
        'Os pedidos que fazes na app (agendar um checkup, pedir um orçamento) são pedidos: só ficam confirmados quando a equipa te responder. Um orçamento apresentado na app não é vinculativo até ser confirmado por escrito pela equipa.',
        'As ofertas enviadas pela app (por exemplo, uma lavagem gratuita) são válidas nas condições e prazos indicados em cada oferta, e podem ser retiradas se houver abuso.',
      ],
    },
    {
      title: '4. Notificações',
      paragraphs: [
        'A app envia notificações operacionais sobre os teus trabalhos (checkups, respostas a pedidos). Notificações de marketing (ofertas, novidades, eventos) só são enviadas se as ligares no Perfil. Podes desligar tudo nas definições do telemóvel.',
      ],
    },
    {
      title: '5. Portfólio e fotografias',
      paragraphs: [
        `As fotografias dos trabalhos publicadas no portfólio pertencem à ${COMPANY.brand}. Ao contratar um serviço, aceitas que o resultado possa ser fotografado e publicado no portfólio da app e nas redes sociais da ${COMPANY.brand}, sem identificar o proprietário e com a matrícula ocultada. Se não quiseres que o teu carro ou chão apareça, basta dizê-lo à equipa antes ou depois do trabalho, e retiramos as fotografias.`,
      ],
    },
    {
      title: '6. Propriedade intelectual',
      paragraphs: [
        `O nome, o logótipo, o design da app e os seus conteúdos são da ${COMPANY.brand} ou dos seus licenciadores. Podes usar a app para os fins a que se destina; não podes copiar, alterar ou redistribuir os seus conteúdos sem autorização.`,
      ],
    },
    {
      title: '7. Disponibilidade e responsabilidade',
      paragraphs: [
        'Fazemos o possível para a app estar sempre disponível, mas não garantimos que funcione sem interrupções ou erros. Podemos alterar, suspender ou descontinuar funcionalidades. A app é uma ferramenta de acompanhamento: a informação sobre o estado de um trabalho ou a data de um checkup é indicativa e não substitui a comunicação direta com a equipa.',
        `Na medida permitida pela lei, a ${COMPANY.brand} não responde por danos indiretos resultantes da utilização da app. Nada nestes termos limita os direitos que tens como consumidor.`,
      ],
    },
    {
      title: '8. Suspensão e cancelamento',
      paragraphs: [
        'Podemos suspender ou apagar uma conta em caso de utilização abusiva, dados falsos ou incumprimento destes termos. Tu podes apagar a tua conta a qualquer momento. Em ambos os casos aplica-se o que a Política de Privacidade diz sobre conservação de dados.',
      ],
    },
    {
      title: '9. Alterações aos termos',
      paragraphs: [
        `Esta versão é de ${LEGAL_VERSION}. Se alterarmos os termos de forma relevante, a app pede-te que aceites a nova versão. Se não aceitares, podes continuar a usar as partes públicas da app (Início, Portfólio, Eventos) e apagar a conta.`,
      ],
    },
    {
      title: '10. Lei aplicável e resolução de conflitos',
      paragraphs: [
        'Aplica-se a lei portuguesa. Em caso de litígio de consumo, podes recorrer a uma entidade de resolução alternativa de litígios; a lista está em www.consumidor.gov.pt. Nos termos da lei, existe livro de reclamações físico e eletrónico (www.livroreclamacoes.pt).',
        `Dúvidas sobre estes termos: ${COMPANY.privacyEmail}.`,
      ],
    },
  ],
};

export const LEGAL: Record<LegalDoc, LegalText> = { privacy: PRIVACY, terms: TERMS };

// Devolve true enquanto houver marcadores por preencher nos dados da empresa.
export function hasCompanyPlaceholders(): boolean {
  return Object.values(COMPANY).some((v) => v.includes('[A PREENCHER'));
}
