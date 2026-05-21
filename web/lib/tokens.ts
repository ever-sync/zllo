/**
 * zllo — Design tokens (espelho de theme/tokens.ts do app mobile).
 * Cores também expostas como utilitários Tailwind via app/globals.css (@theme).
 */
export const colors = {
  blue: '#1E1BE0',
  blueDark: '#1814B8',
  lime: '#D3FE18',
  limeDark: '#A8D414',
  ink: '#1E1E1E',
  paper: '#FAFAFA',
  line: '#E5E5E5',
  g100: '#F3F3F3',
  g400: '#9CA3AF',
  g600: '#6B7280',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
} as const;

export type ColorToken = keyof typeof colors;
