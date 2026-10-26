// Iman theme, from replica/design/tokens.json (sampled from the @imanditor brand).
export const C = {
  bg: '#0B0D17',
  surface: '#111A26',
  raised: '#152531',
  glow: '#1F365C',
  haze: '#42536C',
  border: '#26323F',
  input: '#6B7684',
  text: '#F5F3EE',
  muted: '#A3A9B2',
  primary: '#F5F3EE',
  onPrimary: '#0B0D17',
  accent: '#CBA68B',
  onAccent: '#0B0D17',
  link: '#8FB3DC',
  danger: '#E5787F',
  success: '#6FCF97',
} as const;

export const F = {
  display: 'Oswald_600SemiBold',
  displayBold: 'Oswald_700Bold',
  caption: 'CormorantSC_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
  arabic: 'AmiriQuran_400Regular',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const R = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const MAX_W = 640;
