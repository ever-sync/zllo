import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors as baseColors } from '@/theme/tokens';

export function useThemeColors() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    ...baseColors,
    // Dynamic background and surface overrides
    paper: isDark ? '#121214' : '#FAFAFA',
    canvas: isDark ? '#1C1C1E' : '#F2F4F6',
    white: isDark ? '#1E1E24' : '#FFFFFF',
    ink: isDark ? '#FFFFFF' : '#1E1E1E',
    gray100: isDark ? '#2C2C2E' : '#F3F3F3',
    gray200: isDark ? '#3A3A3C' : '#E5E5E5',
    gray400: isDark ? '#8E8E93' : '#9CA3AF',
    gray600: isDark ? '#AEAEB2' : '#6B7280',
  };
}
