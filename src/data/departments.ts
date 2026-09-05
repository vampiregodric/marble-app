import { DepartmentId, WorkCategory } from '../firebase/models';
import { S } from '../i18n';

// Os seis departamentos do ecrã Início. São a estrutura do negócio, não
// conteúdo — ficam fixos no código (o backoffice tem a mesma lista em
// src/utils/departments.ts). A FOTO de cada cartão é conteúdo: a equipa
// escolhe-a no backoffice (Destaques > Fotos dos serviços) e fica em
// settings/home.departmentCovers (ver useHomeSettings).
//
// Idiomas (Secção 12): o nome é marca e não se traduz; a tagline e o selo
// vêm de src/i18n (S.departments) no idioma da app.
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
  { id: 'automotive', name: 'Automotive Aesthetics', tagline: S.departments.tagline.automotive, category: 'Automotive' },
  { id: 'epoxy', name: 'Epoxy Floors', tagline: S.departments.tagline.epoxy, category: 'Epoxy Floors' },
  { id: 'graphic', name: 'Graphic Solutions', tagline: S.departments.tagline.graphic, category: 'Graphic' },
  { id: 'ai', name: 'AI Business', tagline: S.departments.tagline.ai },
  { id: 'ads', name: 'Marble Ads', tagline: S.departments.tagline.ads },
  { id: 'xps', name: 'Xtreme Polishing Systems', tagline: S.departments.tagline.xps, category: 'Epoxy Floors', badge: S.departments.badgeOfficial },
  // Inozetek (PPF e vinil): SEM cartão enquanto a parceria não for oficial
  // (SPEC "Futuro"). Os passos para o ligar estão no ROADMAP, Secção 10.
];
