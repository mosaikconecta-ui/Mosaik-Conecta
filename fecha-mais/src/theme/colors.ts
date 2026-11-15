/**
 * Paleta oficial do Fecha+.
 * Use SEMPRE estes tokens nas telas — nunca escreva cores "soltas" no código.
 * Assim, se a marca mudar, alteramos em um único lugar.
 */
const palette = {
  graphite: '#111827',
  emerald: '#22C58B',
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
  slate: '#64748B',
} as const;

export const colors = {
  ...palette,

  // Superfícies
  background: palette.lightGray,
  surface: palette.white,
  surfaceDark: palette.graphite,

  // Texto
  text: palette.graphite,
  textMuted: palette.slate,
  textOnDark: palette.white,
  textOnDarkMuted: '#9CA3AF',

  // Marca / ações
  primary: palette.emerald,
  primaryPressed: '#1BA877',
  primarySoft: '#E7F8F1',
  onPrimary: palette.graphite,

  // Bordas e divisores
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  // Estados (usados com moderação)
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  success: palette.emerald,
  successSoft: '#E7F8F1',
} as const;

export type ColorToken = keyof typeof colors;
