import { Platform, TextStyle, ViewStyle } from 'react-native';

const colors = {
  ink: '#000000',
  surface: '#FFFFFF',
  canvas: '#F5F5F5',
  border: '#E5E5E5',
  borderStrong: '#1A1A1A',
  textPrimary: '#0A0A0A',
  textSecondary: '#5A5A5A',
  textMuted: '#8A8A8A',
  accent: '#E4007F',
  accentPressed: '#B8005F',
  success: '#0F7A3D',
  danger: '#B00020',
  disabled: '#C9C9C9',
  warningBg: '#FEF3C7',
  warningBorder: '#FCD34D',
  warningText: '#78350F',
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

const typography = {
  display: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.textPrimary,
  } as TextStyle,
  h1: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  } as TextStyle,
  h2: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  } as TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
  } as TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  } as TextStyle,
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  } as TextStyle,
} as const;

const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,
} as const;

export const theme = Object.freeze({
  colors,
  spacing,
  radii,
  typography,
  shadows,
});

export type Theme = typeof theme;
