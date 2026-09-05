import { pt } from './pt';
import { en } from './en';
import { Locale, locale } from './locale';
import { Strings } from './types';

export { locale, languageTag, tx, LOCALES } from './locale';
export type { Locale, LocalizedText } from './locale';
export type { Strings } from './types';

// Idioma da app (Secção 12): PT + EN, escolhido pelo idioma do telemóvel
// (ver locale.ts). Como usar:
//
//   const T = useT();                 // num componente
//   <Text>{T.profile.signOut}</Text>
//   T.portfolio.count(works.length)   // texto com valores = função
//
// Fora de componentes (erros, formatação de datas) importa `S`:
//
//   import { S } from '../i18n';
//   throw new Error(S.errors.cameraDenied);
//
// Para acrescentar um texto: escreve-o em pt.ts (na secção do ecrã) e em
// en.ts com a mesma chave — sem a tradução, `npm run typecheck` falha.
// Textos legais ficam só em PT (src/legal/texts.ts); o conteúdo das
// páginas de departamento está em departmentContent.ts (CONTENT.pt/en) e
// os formulários de orçamento em requestForms.ts ({ pt, en } por opção).

const DICTS: Record<Locale, Strings> = { pt, en };

// O dicionário do idioma atual. É uma constante porque o idioma é decidido
// no arranque; se um dia houver seletor no Perfil, `useT()` passa a ler de
// um estado e os ecrãs não mudam.
export const S: Strings = DICTS[locale];

export function useT(): Strings {
  return S;
}
