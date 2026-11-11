import { Button } from '../components/ui/Button'
import { Seo } from '../components/ui/Seo'

export default function NotFound() {
  return (
    <>
      <Seo title="Página não encontrada" description="A página procurada não existe." path="/404" />
      <meta name="robots" content="noindex" />
      <section className="scene-backdrop grid min-h-svh place-items-center px-5 pt-24 text-center">
        <div>
          <p className="t-eyebrow text-mint">Erro 404</p>
          <h1 className="t-h2 mt-4">Página não encontrada.</h1>
          <div className="mt-8">
            <Button to="/">Voltar ao início</Button>
          </div>
        </div>
      </section>
    </>
  )
}
