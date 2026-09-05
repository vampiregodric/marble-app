import { DepartmentId } from '../firebase/models';

// O formulário de pedido de orçamento (Secção 7) muda com o departamento:
// um carro pede modelo e fotos; um chão pede o tipo de espaço e os m²; a
// AI Business e a Marble Ads pedem a empresa. Tudo o que é específico de um
// departamento vive AQUI — o ecrã (RequestQuoteScreen) é genérico. As
// listas de opções são texto: o que o cliente escolhe fica guardado tal
// como se lê (`services`, `fields[].label`), para o backoffice e o email à
// equipa não precisarem de conhecer este ficheiro. Corrige as listas à
// vontade; pedidos antigos não mudam.

export type RequestFormField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url';
  // Com `options`, o campo é uma escolha única (chips) em vez de texto.
  options?: string[];
};

export type RequestForm = {
  // Uma frase a explicar o que ajuda a orçamentar.
  lead: string;
  servicesLabel: string;
  services: string[];
  fields: RequestFormField[];
  // Presente quando fotos fazem sentido (carro, chão, referências).
  photos?: { label: string; hint: string };
  messagePlaceholder: string;
};

const COMPANY_FIELDS: RequestFormField[] = [
  { key: 'company', label: 'Empresa', placeholder: 'Nome da empresa', required: true },
  { key: 'website', label: 'Site ou redes sociais', placeholder: 'Opcional', keyboardType: 'url' },
];

export const REQUEST_FORMS: Record<DepartmentId, RequestForm> = {
  automotive: {
    lead: 'Diz-nos que carro é e o que queres fazer. Fotos ajudam a afinar o orçamento.',
    servicesLabel: 'O que pretendes?',
    services: ['PPF', 'Vinil / wrap', 'Detailing', 'Polimento', 'Vidros', 'Interior', 'Teto estrelado', 'Outro'],
    fields: [{ key: 'car', label: 'Carro', placeholder: 'Marca, modelo e ano (ex: BMW M4 2022)', required: true }],
    photos: { label: 'Fotos do carro', hint: 'Opcional, até 5. Ajudam a ver o estado e as zonas a tratar.' },
    messagePlaceholder: 'O que queres fazer, cor ou acabamento, prazos, dúvidas…',
  },
  epoxy: {
    lead: 'Diz-nos que espaço é e a área aproximada. Fotos do chão atual ajudam.',
    servicesLabel: 'Que acabamento?',
    services: ['Metallic epoxy', 'Flake', 'Cor sólida', 'Comercial / industrial', 'Ainda não sei'],
    fields: [
      { key: 'space', label: 'Espaço', options: ['Garagem', 'Casa', 'Loja / escritório', 'Armazém / indústria', 'Outro'], required: true },
      { key: 'area', label: 'Área aproximada (m²)', placeholder: 'ex: 40', keyboardType: 'numeric' },
    ],
    photos: { label: 'Fotos do espaço', hint: 'Opcional, até 5. O chão atual e o espaço em geral.' },
    messagePlaceholder: 'Estado do chão atual, cores que gostas, prazos, dúvidas…',
  },
  graphic: {
    lead: 'Conta-nos o projeto. Referências ou fotos do espaço ajudam a perceber o que procuras.',
    servicesLabel: 'O que pretendes?',
    services: ['Identidade / logótipo', 'Impressão', 'Sinalética', 'Vinil de montra', 'Decoração de viatura', 'Outro'],
    fields: [{ key: 'project', label: 'Projeto', placeholder: 'ex: cartões e lona para a loja nova', required: true }],
    photos: { label: 'Referências ou fotos', hint: 'Opcional, até 5. Exemplos de que gostas, ou o espaço a decorar.' },
    messagePlaceholder: 'Quantidades, medidas, prazos, dúvidas…',
  },
  ai: {
    lead: 'Diz-nos que empresa é e onde a IA te pode poupar tempo. Respondemos com uma proposta.',
    servicesLabel: 'Em que te podemos ajudar?',
    services: ['Automação de processos', 'Assistente / chatbot', 'Consultoria', 'Formação da equipa', 'Outro'],
    fields: COMPANY_FIELDS,
    messagePlaceholder: 'O que fazes hoje à mão, que ferramentas usas, o que gostavas de automatizar…',
  },
  ads: {
    lead: 'Diz-nos que empresa é e o que queres alcançar com anúncios. Respondemos com uma proposta.',
    servicesLabel: 'Que plataformas?',
    services: ['Google Ads', 'Meta Ads (Instagram / Facebook)', 'Gestão completa', 'Auditoria de campanhas', 'Outro'],
    fields: [...COMPANY_FIELDS, { key: 'budget', label: 'Orçamento mensal aproximado', placeholder: 'Opcional (ex: 500 €)' }],
    messagePlaceholder: 'Objetivo (mais contactos, vendas, notoriedade), zona, já fizeste anúncios antes?…',
  },
  xps: {
    lead: 'Diz-nos que produto procuras e em que quantidade.',
    servicesLabel: 'O que procuras?',
    services: ['Resina epóxi', 'Flakes e pigmentos', 'Primários e vernizes', 'Ferramentas', 'Outro'],
    fields: [{ key: 'product', label: 'Produto e quantidade', placeholder: 'ex: 20 kg de metallic epoxy, cor prata', required: true }],
    messagePlaceholder: 'Para que projeto, prazos, dúvidas…',
  },
};
