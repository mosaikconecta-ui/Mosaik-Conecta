import { theme } from '../config/theme'

/** Injeta os tokens de cor/fonte da configuração como variáveis CSS no :root. */
export function applyTheme() {
  const root = document.documentElement
  for (const [name, value] of Object.entries(theme.colors)) root.style.setProperty(`--brand-${name}`, value)
  root.style.setProperty('--font-display', theme.fonts.display)
  root.style.setProperty('--font-body', theme.fonts.body)
}
