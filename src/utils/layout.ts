import { Platform, useWindowDimensions } from 'react-native';

// Na web a app é enquadrada numa coluna com largura de telemóvel (ver
// App.tsx), porque é uma app de telemóvel e a 1900 px fica esticada e
// ilegível. Android e iOS não são afetados.
export const WEB_MAX_WIDTH = 430;
// Borda de cada lado da coluna (App.tsx). Conta para a largura útil: sem
// isto os cartões do Portfólio ficavam 2 px largos demais e caíam para uma
// coluna só.
export const WEB_FRAME_BORDER = 1;

// Largura útil da app. Nos ecrãs usa isto em vez de useWindowDimensions()
// para os cálculos de largura (cartões, carrossel) — na web a janela pode
// ser muito mais larga do que a coluna onde a app está desenhada.
export function useAppWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, WEB_MAX_WIDTH) - 2 * WEB_FRAME_BORDER : width;
}
