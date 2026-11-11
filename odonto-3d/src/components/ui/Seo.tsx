import { site } from '../../config/site'

interface SeoProps {
  title: string
  description: string
  path: string
}

/**
 * Metadados por página. O React 19 eleva <title>/<meta>/<link> para o <head>
 * automaticamente — sem bibliotecas extras.
 */
export function Seo({ title, description, path }: SeoProps) {
  const fullTitle = path === '/' ? `${site.fullName} | ${title}` : `${title} | ${site.fullName}`
  const url = `${site.url}${path}`
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={site.locale} />
      <meta property="og:site_name" content={site.fullName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${site.url}${site.ogImage}`} />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  )
}
