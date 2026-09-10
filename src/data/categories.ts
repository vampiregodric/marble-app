import { Client, WorkCategory } from '../firebase/models';

// Metadados de apresentação das 3 categorias do portfólio. O valor guardado
// no Firestore é a chave (`WorkCategory`); o que se mostra vem daqui.
export type CategoryMeta = {
  key: WorkCategory;
  // Nome curto para chips e selos (Portfólio).
  label: string;
  // Nome do departamento (Detalhe, Início).
  fullName: string;
  // Sub-preferência de marketing correspondente em clients.notificationPrefs.
  prefKey: keyof Client['notificationPrefs'];
};

// Ordem = ordem dos chips do Portfólio e das preferências de novidades no
// Perfil. Epoxy primeiro: é o negócio principal (Fábio, 2026-09-09).
export const CATEGORIES: CategoryMeta[] = [
  { key: 'Epoxy Floors', label: 'Epoxy Floors', fullName: 'Epoxy Floors', prefKey: 'epoxy' },
  { key: 'Automotive', label: 'Automotive', fullName: 'Automotive Aesthetics', prefKey: 'automotive' },
  { key: 'Graphic', label: 'Graphic', fullName: 'Graphic Solutions', prefKey: 'graphic' },
];

export function categoryMeta(key: string | undefined): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export function categoryFullName(key: string | undefined): string {
  return categoryMeta(key)?.fullName ?? key ?? 'Marble Studios';
}
