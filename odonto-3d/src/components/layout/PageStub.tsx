import { ArrowLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { Seo } from '../ui/Seo'

interface PageStubProps {
  title: string
  description: string
  path: string
  sections: string[]
}

/**
 * Página interna provisória (rota, SEO e navegação já funcionais).
 * O conteúdo completo será desenvolvido na Etapa 5, após validação da hero 3D.
 */
export function PageStub({ title, description, path, sections }: PageStubProps) {
  return (
    <>
      <Seo title={title} description={description} path={path} />
      <section className="scene-backdrop flex min-h-svh items-center pt-28 pb-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 md:px-8">
          <p className="t-eyebrow text-mint">Em construção · Etapa 5</p>
          <h1 className="t-display mt-5">{title}</h1>
          <p className="t-lead mt-6 max-w-[620px] text-white/70">{description}</p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s) => (
              <li key={s} className="glass rounded-2xl px-5 py-4 text-white/80">
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button to="/" variant="ghost" icon={<ArrowLeft size={18} />}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
