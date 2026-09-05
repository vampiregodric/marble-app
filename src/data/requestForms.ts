import { DepartmentId } from '../firebase/models';
import { LocalizedText, tx } from '../i18n';

// O formulário de pedido de orçamento (Secção 7) muda com o departamento:
// um carro pede modelo e fotos; um chão pede o tipo de espaço e os m²; a
// AI Business e a Marble Ads pedem a empresa. Tudo o que é específico de um
// departamento vive AQUI — o ecrã (RequestQuoteScreen) é genérico.
//
// Idiomas (Secção 12): cada texto existe em PT e EN ({ pt, en }); o ecrã
// mostra o do idioma da app (`requestForm(department)`). O que fica GUARDADO
// no pedido (`services`, `fields[].label`) é SEMPRE o texto em português —
// o backoffice e o email à equipa continuam a ler PT, seja qual for o
// idioma do cliente, e não precisam de conhecer este ficheiro. Corrige as
// listas à vontade; pedidos antigos não mudam.

type Option = LocalizedText;

type FieldDef = {
  key: string;
  label: LocalizedText;
  placeholder?: LocalizedText;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url';
  // Com `options`, o campo é uma escolha única (chips) em vez de texto.
  options?: Option[];
};

type FormDef = {
  // Uma frase a explicar o que ajuda a orçamentar.
  lead: LocalizedText;
  servicesLabel: LocalizedText;
  services: Option[];
  fields: FieldDef[];
  // Presente quando fotos fazem sentido (carro, chão, referências).
  photos?: { label: LocalizedText; hint: LocalizedText };
  messagePlaceholder: LocalizedText;
};

// ---------- O que o ecrã recebe, já no idioma da app ----------

// Uma opção de chips: `value` é o que se guarda (PT), `label` o que se vê.
export type RequestOption = { value: string; label: string };

export type RequestFormField = {
  key: string;
  // Etiqueta mostrada.
  label: string;
  // Etiqueta guardada no pedido (PT).
  storedLabel: string;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url';
  options?: RequestOption[];
};

export type RequestForm = {
  lead: string;
  servicesLabel: string;
  services: RequestOption[];
  fields: RequestFormField[];
  photos?: { label: string; hint: string };
  messagePlaceholder: string;
};

const t = (pt: string, en: string): LocalizedText => ({ pt, en });

const COMPANY_FIELDS: FieldDef[] = [
  { key: 'company', label: t('Empresa', 'Company'), placeholder: t('Nome da empresa', 'Company name'), required: true },
  { key: 'website', label: t('Site ou redes sociais', 'Website or social media'), placeholder: t('Opcional', 'Optional'), keyboardType: 'url' },
];

const OTHER = t('Outro', 'Other');

const FORMS: Record<DepartmentId, FormDef> = {
  automotive: {
    lead: t('Diz-nos que carro é e o que queres fazer. Fotos ajudam a afinar o orçamento.', 'Tell us which car it is and what you want done. Photos help us fine-tune the quote.'),
    servicesLabel: t('O que pretendes?', 'What are you after?'),
    services: [
      t('PPF', 'PPF'),
      t('Vinil / wrap', 'Vinyl / wrap'),
      t('Detailing', 'Detailing'),
      t('Polimento', 'Polishing'),
      t('Vidros', 'Windows'),
      t('Interior', 'Interior'),
      t('Teto estrelado', 'Starlight headliner'),
      OTHER,
    ],
    fields: [{ key: 'car', label: t('Carro', 'Car'), placeholder: t('Marca, modelo e ano (ex: BMW M4 2022)', 'Make, model and year (e.g. BMW M4 2022)'), required: true }],
    photos: { label: t('Fotos do carro', 'Photos of the car'), hint: t('Opcional, até 5. Ajudam a ver o estado e as zonas a tratar.', 'Optional, up to 5. They help us see the condition and the areas to treat.') },
    messagePlaceholder: t('O que queres fazer, cor ou acabamento, prazos, dúvidas…', 'What you want done, colour or finish, timing, questions…'),
  },
  epoxy: {
    lead: t('Diz-nos que espaço é e a área aproximada. Fotos do chão atual ajudam.', 'Tell us what the space is and the approximate area. Photos of the current floor help.'),
    servicesLabel: t('Que acabamento?', 'Which finish?'),
    services: [t('Metallic epoxy', 'Metallic epoxy'), t('Flake', 'Flake'), t('Cor sólida', 'Solid colour'), t('Comercial / industrial', 'Commercial / industrial'), t('Ainda não sei', 'Not sure yet')],
    fields: [
      {
        key: 'space',
        label: t('Espaço', 'Space'),
        options: [t('Garagem', 'Garage'), t('Casa', 'Home'), t('Loja / escritório', 'Shop / office'), t('Armazém / indústria', 'Warehouse / industrial'), OTHER],
        required: true,
      },
      { key: 'area', label: t('Área aproximada (m²)', 'Approximate area (m²)'), placeholder: t('ex: 40', 'e.g. 40'), keyboardType: 'numeric' },
    ],
    photos: { label: t('Fotos do espaço', 'Photos of the space'), hint: t('Opcional, até 5. O chão atual e o espaço em geral.', 'Optional, up to 5. The current floor and the space in general.') },
    messagePlaceholder: t('Estado do chão atual, cores que gostas, prazos, dúvidas…', 'Condition of the current floor, colours you like, timing, questions…'),
  },
  graphic: {
    lead: t('Conta-nos o projeto. Referências ou fotos do espaço ajudam a perceber o que procuras.', 'Tell us about the project. References or photos of the space help us understand what you are looking for.'),
    servicesLabel: t('O que pretendes?', 'What are you after?'),
    services: [
      t('Identidade / logótipo', 'Branding / logo'),
      t('Impressão', 'Print'),
      t('Sinalética', 'Signage'),
      t('Vinil de montra', 'Shopfront vinyl'),
      t('Decoração de viatura', 'Vehicle graphics'),
      OTHER,
    ],
    fields: [{ key: 'project', label: t('Projeto', 'Project'), placeholder: t('ex: cartões e lona para a loja nova', 'e.g. business cards and a banner for the new shop'), required: true }],
    photos: { label: t('Referências ou fotos', 'References or photos'), hint: t('Opcional, até 5. Exemplos de que gostas, ou o espaço a decorar.', 'Optional, up to 5. Examples you like, or the space to decorate.') },
    messagePlaceholder: t('Quantidades, medidas, prazos, dúvidas…', 'Quantities, sizes, timing, questions…'),
  },
  ai: {
    lead: t('Diz-nos que empresa é e onde a IA te pode poupar tempo. Respondemos com uma proposta.', 'Tell us about your company and where AI could save you time. We reply with a proposal.'),
    servicesLabel: t('Em que te podemos ajudar?', 'How can we help?'),
    services: [t('Automação de processos', 'Process automation'), t('Assistente / chatbot', 'Assistant / chatbot'), t('Consultoria', 'Consulting'), t('Formação da equipa', 'Team training'), OTHER],
    fields: COMPANY_FIELDS,
    messagePlaceholder: t('O que fazes hoje à mão, que ferramentas usas, o que gostavas de automatizar…', 'What you do by hand today, which tools you use, what you would like to automate…'),
  },
  ads: {
    lead: t('Diz-nos que empresa é e o que queres alcançar com anúncios. Respondemos com uma proposta.', 'Tell us about your company and what you want to achieve with ads. We reply with a proposal.'),
    servicesLabel: t('Que plataformas?', 'Which platforms?'),
    services: [t('Google Ads', 'Google Ads'), t('Meta Ads (Instagram / Facebook)', 'Meta Ads (Instagram / Facebook)'), t('Gestão completa', 'Full management'), t('Auditoria de campanhas', 'Campaign audit'), OTHER],
    fields: [...COMPANY_FIELDS, { key: 'budget', label: t('Orçamento mensal aproximado', 'Approximate monthly budget'), placeholder: t('Opcional (ex: 500 €)', 'Optional (e.g. €500)') }],
    messagePlaceholder: t('Objetivo (mais contactos, vendas, notoriedade), zona, já fizeste anúncios antes?…', 'Goal (more leads, sales, awareness), area, have you run ads before?…'),
  },
  xps: {
    lead: t('Diz-nos que produto procuras e em que quantidade.', 'Tell us which product you are looking for and how much.'),
    servicesLabel: t('O que procuras?', 'What are you looking for?'),
    services: [t('Resina epóxi', 'Epoxy resin'), t('Flakes e pigmentos', 'Flakes and pigments'), t('Primários e vernizes', 'Primers and topcoats'), t('Ferramentas', 'Tools'), OTHER],
    fields: [{ key: 'product', label: t('Produto e quantidade', 'Product and quantity'), placeholder: t('ex: 20 kg de metallic epoxy, cor prata', 'e.g. 20 kg of metallic epoxy, silver'), required: true }],
    messagePlaceholder: t('Para que projeto, prazos, dúvidas…', 'Which project it is for, timing, questions…'),
  },
};

function option(o: Option): RequestOption {
  return { value: o.pt, label: tx(o) };
}

// O formulário de um departamento no idioma da app.
export function requestForm(department: DepartmentId): RequestForm {
  const f = FORMS[department];
  return {
    lead: tx(f.lead),
    servicesLabel: tx(f.servicesLabel),
    services: f.services.map(option),
    fields: f.fields.map((d) => ({
      key: d.key,
      label: tx(d.label),
      storedLabel: d.label.pt,
      placeholder: d.placeholder ? tx(d.placeholder) : undefined,
      required: d.required,
      keyboardType: d.keyboardType,
      options: d.options?.map(option),
    })),
    photos: f.photos ? { label: tx(f.photos.label), hint: tx(f.photos.hint) } : undefined,
    messagePlaceholder: tx(f.messagePlaceholder),
  };
}
