import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';

// Idioma da app (Secção 12). Decisão do Fábio (2026-09-05): escolhido SÓ
// pelo idioma do telemóvel, sem seletor próprio — telemóvel em português →
// PT; qualquer outro idioma → EN. É decidido uma vez, no arranque (o
// sistema reinicia a app quando o cliente muda o idioma nas Definições).
//
// No browser, `?lang=en` (ou `?lang=pt`) no URL força o idioma — serve para
// testar a app web nos dois idiomas sem mudar o idioma do sistema.

export type Locale = 'pt' | 'en';

export const LOCALES: readonly Locale[] = ['pt', 'en'];

function fromUrl(): Locale | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const m = /[?&#]lang=(pt|en)\b/i.exec(`${window.location.search}${window.location.hash}`);
  return m ? (m[1].toLowerCase() as Locale) : null;
}

function fromDevice(): Locale {
  // getLocales() vem pela ordem das preferências do sistema; o primeiro
  // idioma decide. Nunca falha: garante pelo menos um elemento.
  const first = getLocales()[0]?.languageCode?.toLowerCase() ?? '';
  return first === 'pt' ? 'pt' : 'en';
}

export const locale: Locale = fromUrl() ?? fromDevice();

// Etiqueta BCP-47 para o Firebase Auth (emails "repor password" saem no
// idioma do cliente) e para o atributo `lang` da página web.
export const languageTag: string = locale === 'pt' ? 'pt-PT' : 'en';

// Texto com as duas versões, para dados estáticos (taglines dos
// departamentos, opções dos formulários). `tx()` escolhe a do idioma atual.
export type LocalizedText = { pt: string; en: string };

export function tx(text: LocalizedText): string {
  return text[locale];
}
