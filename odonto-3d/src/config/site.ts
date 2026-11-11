/**
 * Dados institucionais da clínica. TODA informação abaixo é DEMONSTRATIVA.
 * Substitua pelos dados reais do cliente antes da publicação.
 */
export const site = {
  name: 'Alvéa',
  fullName: 'Alvéa Odontologia',
  tagline: 'Odontologia de precisão com cuidado humano',
  /** Caminho do logo (SVG em /public). Deixe vazio para usar o logotipo em código (components/ui/Logo). */
  logoSrc: '',
  url: 'https://www.exemplo-clinica.com.br', // usado em canonical / Open Graph / sitemap
  locale: 'pt_BR',
  ogImage: '/og-image.jpg',
  contact: {
    // Número fictício — formato internacional sem símbolos
    whatsapp: '5500000000000',
    whatsappLabel: '(00) 00000-0000',
    whatsappMessage: 'Olá! Gostaria de agendar uma avaliação.',
    instagram: 'clinica.exemplo',
    email: 'contato@exemplo-clinica.com.br',
    address: {
      street: 'Rua Exemplo, 000 — Sala 00',
      district: 'Bairro Demonstrativo',
      city: 'Cidade',
      state: 'UF',
      zip: '00000-000',
    },
    /** URL de incorporação do Google Maps (iframe src). Vazio = mapa desativado. */
    mapEmbedUrl: '',
    hours: [
      { days: 'Segunda a sexta', time: '08h às 19h' },
      { days: 'Sábado', time: '08h às 12h' },
    ],
  },
  /** Responsável técnico — preencher com dados reais e verificados (exigência do CFO). */
  technicalLead: { name: '', cro: '' },
} as const

export const nav = [
  { label: 'Início', to: '/' },
  { label: 'Tratamentos', to: '/tratamentos' },
  { label: 'Sobre', to: '/sobre' },
  { label: 'Tecnologia', to: '/tecnologia' },
  { label: 'Contato', to: '/contato' },
] as const

export const whatsappHref = (message: string = site.contact.whatsappMessage) =>
  `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message)}`

export const instagramHref = `https://instagram.com/${site.contact.instagram}`

export const ctas = {
  primary: { label: 'Agendar avaliação', href: whatsappHref() },
  secondary: { label: 'Conhecer tratamentos', to: '/tratamentos' },
} as const
