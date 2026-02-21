export const Colors = {
  background: '#FFFFFF',
  surface: '#F8F8F8',
  surfaceElevated: '#FFFFFF',
  border: '#EBEBEB',
  borderDark: '#D0D0D0',
  textPrimary: '#0A0A0A',
  textSecondary: '#4A4A4A',
  textMuted: '#9A9A9A',
  textInverse: '#FFFFFF',
  accent: '#0A0A0A',
  accentLight: '#F0F0F0',
  success: '#2A7A4B',
  successLight: '#EAF5EE',
  warning: '#8B6914',
  warningLight: '#FDF6E3',
  error: '#B00020',
  errorLight: '#FDECEA',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: 'rgba(0,0,0,0.08)',
  shadowMedium: 'rgba(0,0,0,0.14)',
  mapOverlay: 'rgba(255,255,255,0.95)',
};

export const Typography = {
  displayLarge: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5, color: Colors.textPrimary },
  displayMedium: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3, color: Colors.textPrimary },
  headingLarge: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2, color: Colors.textPrimary },
  headingMedium: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.1, color: Colors.textPrimary },
  headingSmall: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, color: Colors.textPrimary, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, color: Colors.textSecondary, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, color: Colors.textMuted, lineHeight: 18 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary, letterSpacing: 0.1 },
  labelSmall: { fontSize: 11, fontWeight: '500' as const, color: Colors.textMuted, letterSpacing: 0.3 },
  caption: { fontSize: 10, fontWeight: '500' as const, color: Colors.textMuted, letterSpacing: 0.5 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const TransportModes = {
  flight: { label: 'Flight', icon: 'airplane', color: '#0A0A0A' },
  train: { label: 'Train', icon: 'train', color: '#0A0A0A' },
  bus: { label: 'Bus', icon: 'bus', color: '#0A0A0A' },
  ferry: { label: 'Ferry', icon: 'boat', color: '#0A0A0A' },
  rideshare: { label: 'Cab', icon: 'car', color: '#0A0A0A' },
  metro: { label: 'Metro', icon: 'subway', color: '#0A0A0A' },
};
