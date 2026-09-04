import { DepartmentId, WorkCategory } from '../firebase/models';

// Os seis departamentos do ecrã Início. São a estrutura do negócio, não
// conteúdo — ficam fixos no código (o backoffice tem a mesma lista em
// src/utils/departments.ts). A FOTO de cada cartão é conteúdo: a equipa
// escolhe-a no backoffice (Destaques > Fotos dos serviços) e fica em
// settings/home.departmentCovers (ver useHomeSettings).
export type Department = {
  id: DepartmentId;
  name: string;
  tagline: string;
  // Todos os cartões abrem a página de serviços do departamento (Secção 9,
  // conteúdo em departmentContent.ts). Os que têm `category` mostram lá os
  // trabalhos recentes dessa categoria e ligam ao Portfólio filtrado — é só
  // isso que o campo faz (o cartão do Início já não abre o Portfólio). A
  // Xtreme usa a categoria Epoxy Floors: os pavimentos feitos com os
  // produtos dela são a melhor montra (decisão do Fábio, Secção 10).
  category?: WorkCategory;
  badge?: string;
};

export const DEPARTMENTS: Department[] = [
  { id: 'automotive', name: 'Automotive Aesthetics', tagline: 'PPF, vinil & detailing', category: 'Automotive' },
  { id: 'epoxy', name: 'Epoxy Floors', tagline: 'Metallic, flake & solid', category: 'Epoxy Floors' },
  { id: 'graphic', name: 'Graphic Solutions', tagline: 'Identidade & impressão', category: 'Graphic' },
  { id: 'ai', name: 'AI Business', tagline: 'Consultoria & automação com IA' },
  { id: 'ads', name: 'Marble Ads', tagline: 'Google Ads & Meta Ads' },
  { id: 'xps', name: 'Xtreme Polishing Systems', tagline: 'Buy your epoxy here', category: 'Epoxy Floors', badge: 'Oficial' },
  // Inozetek (PPF e vinil): SEM cartão enquanto a parceria não for oficial
  // (SPEC "Futuro"). Os passos para o ligar estão no ROADMAP, Secção 10.
];
