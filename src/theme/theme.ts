export const colors = {
  bg: '#000000',
  panel: '#000000',
  panel2: '#0a0a0a',
  screen: '#000000',
  gold: '#c6a15b',
  goldBright: '#eccd8d',
  goldDim: '#8a7245',
  ink: '#f3efe6',
  inkMuted: '#9c9587',
  inkFaint: '#6b6459',
  hairline: 'rgba(198,161,91,0.22)',
  hairlineStrong: 'rgba(198,161,91,0.4)',
  ok: '#b7d1a8',
  danger: '#e0a08f',
};

// Só faces usadas em estilos: cada uma aqui é carregada no arranque (App.tsx)
// antes do primeiro ecrã. A AlexBrush (`script`) e a Jost 400
// (`eyebrowLight`) não eram usadas em lado nenhum e saíram na auditoria de
// 2026-09-12 (DES-09) — se uma voltar a fazer falta, junta-se aqui E ao
// useFonts do App.tsx.
export const fonts = {
  eyebrow: 'Jost_500Medium',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemibold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
};

export const radii = {
  sm: 9,
  md: 12,
  lg: 14,
  xl: 18,
};
