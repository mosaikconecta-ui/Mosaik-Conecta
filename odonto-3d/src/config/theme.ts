/**
 * Design tokens — edit here to rebrand the template.
 * Values are injected as CSS custom properties at startup (see utils/applyTheme.ts)
 * and consumed by Tailwind (styles/index.css → @theme).
 */
export const theme = {
  colors: {
    deep: '#092F27', // fundo principal (verde profundo)
    forest: '#124D40', // superfícies escuras
    emerald: '#207A65', // acentos / iluminação
    mint: '#8CE8CD', // destaques
    glow: '#A4FFE1', // brilho luminoso
    white: '#FFFFFF',
    soft: '#F5FAF7', // fundo claro
    mist: '#D5E5DE', // cinza esverdeado
    ink: '#153B32', // texto escuro
  },
  fonts: {
    display: "'Manrope Variable', 'Manrope', system-ui, sans-serif",
    body: "'Inter Variable', 'Inter', system-ui, sans-serif",
  },
} as const

export type ThemeColors = typeof theme.colors
