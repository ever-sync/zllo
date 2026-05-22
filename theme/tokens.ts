/**
 * zllo — Design tokens
 * Portados do protótipo do painel da assistência (marca zllo).
 * Fonte única de verdade para cores, tipografia, espaçamento e raios.
 */

export const colors = {
  // Marca
  blue: '#1E1BE0',
  blueDark: '#1814B8',
  lime: '#D3FE18',
  limeDark: '#A8D414',
  ink: '#1E1E1E',

  // Superfícies
  paper: '#FAFAFA',
  canvas: '#F2F4F6',
  white: '#FFFFFF',

  // Escala de cinza
  gray100: '#F3F3F3',
  gray200: '#E5E5E5',
  gray400: '#9CA3AF',
  gray600: '#6B7280',

  // Estados
  green: '#16A34A',
  red: '#DC2626',
  amber: '#F59E0B',

  // Tons de apoio (badges)
  greenBg: '#DCFCE7',
  greenText: '#15803D',
  amberBg: '#FEF3C7',
  amberText: '#B45309',
  redBg: '#FEE2E2',
  redText: '#B91C1C',
} as const;

/**
 * Famílias de fonte — correspondem aos exports de
 * @expo-google-fonts/archivo e @expo-google-fonts/dm-sans,
 * carregados no app/_layout.tsx.
 */
export const fonts = {
  head: 'Archivo_800ExtraBold', // títulos / números de destaque
  headBold: 'Archivo_700Bold',
  headBlack: 'Archivo_900Black',
  headSemi: 'Archivo_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  full: 999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 13.5,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 30,
  '4xl': 36,
} as const;

export type ColorToken = keyof typeof colors;
