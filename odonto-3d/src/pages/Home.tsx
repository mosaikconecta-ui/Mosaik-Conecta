import { useCallback, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Check, MessageCircle } from 'lucide-react'
import { ctas } from '../config/site'
import { closing, explore, hero, intro } from '../data/home'
import { Button } from '../components/ui/Button'
import { Seo } from '../components/ui/Seo'
import { SceneStage } from '../components/three/SceneStage'
import { useScrollNarrative } from '../components/animations/useScrollNarrative'
import { useIntroTimeline } from '../components/animations/useIntroTimeline'
import { useReveal } from '../components/animations/useReveal'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { usePointerParallax } from '../hooks/usePointerParallax'

/**
 * Página inicial — Etapa 1/2/3: hero 3D + narrativa cinematográfica de scroll.
 * As demais seções (diferenciais, depoimentos etc.) entram na Etapa 5.
 */
export default function Home() {
  const narrative = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const reduced = useReducedMotion()

  usePointerParallax(!reduced)
  useScrollNarrative({ container: narrative, reducedMotion: reduced })
  useIntroTimeline(narrative, ready, reduced)
  useReveal(narrative, reduced)

  return (
    <>
      <Seo
        title="Odontologia de precisão com cuidado humano"
        description="Clínica odontológica com planejamento digital, estética natural e atendimento humanizado. Agende sua avaliação."
        path="/"
      />

      <div ref={narrative} className="relative">
        {/* Palco 3D: fixo durante toda a narrativa (sticky); em movimento reduzido fica só na hero */}
        <div className={`${reduced ? 'relative' : 'sticky'} top-0 h-svh w-full`}>
          <SceneStage onReady={onReady} ready={ready} />
        </div>

        <div className="relative z-10 -mt-[100svh]">
          {/* ---------------- Fase 1/2 — HERO ---------------- */}
          <section id="hero" data-scene-section aria-labelledby="hero-title" className="relative flex h-svh min-h-[600px] items-end md:items-center">
            <div className="mx-auto w-full max-w-[1320px] px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-8 md:pb-0">
              <div className="max-w-[640px]">
                <p data-hero-reveal data-hero-exit className="t-eyebrow inline-flex items-center gap-3 text-mint">
                  <span className="h-px w-8 bg-mint/60" aria-hidden="true" />
                  {hero.eyebrow}
                </p>
                <h1 id="hero-title" data-hero-reveal data-hero-exit className="t-display mt-5 text-white">
                  {hero.title}
                </h1>
                <p data-hero-reveal data-hero-exit className="t-lead mt-6 max-w-[520px] text-white/75">
                  {hero.subtitle}
                </p>
                <div data-hero-reveal data-hero-exit className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button href={ctas.primary.href} icon={<ArrowRight size={18} />}>
                    {ctas.primary.label}
                  </Button>
                  <Button to={ctas.secondary.to} variant="ghost">
                    {ctas.secondary.label}
                  </Button>
                </div>
                <ul data-hero-reveal data-hero-exit className="mt-10 hidden flex-wrap gap-x-6 gap-y-2 text-sm text-white/60 md:flex">
                  {hero.highlights.map((h) => (
                    <li key={h} className="inline-flex items-center gap-2">
                      <Check size={15} className="text-mint" aria-hidden="true" /> {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <a
              href="#intro"
              data-hero-reveal
              data-hero-exit
              className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[0.2em] text-white/50 uppercase md:flex"
            >
              {hero.scrollHint}
              <ArrowDown size={16} className="animate-bounce" aria-hidden="true" />
            </a>
          </section>

          {/* ---------------- Fase 3 — TRANSIÇÃO ---------------- */}
          <section id="intro" data-scene-section aria-labelledby="intro-title" className="flex min-h-svh items-end pt-24 pb-8 md:items-center md:py-24">
            <div className="mx-auto flex w-full max-w-[1320px] justify-end px-5 md:px-8">
              <div data-reveal className="glass w-full max-w-[520px] rounded-[28px] p-7 md:p-10">
                <p className="t-eyebrow text-mint">{intro.eyebrow}</p>
                <h2 id="intro-title" className="t-h2 mt-4">{intro.title}</h2>
                <p className="mt-5 leading-relaxed text-white/70">{intro.body}</p>
                <ul className="mt-7 space-y-3">
                  {intro.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-white/85">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
                        <Check size={14} aria-hidden="true" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ---------------- Fase 4 — EXPLORAÇÃO ---------------- */}
          <section id="explore" data-scene-section aria-label="Detalhes do cuidado">
            {explore.map((panel, i) => (
              <div key={panel.title} className="flex min-h-svh items-end pt-24 pb-8 md:items-center md:py-24">
                <div className={`mx-auto flex w-full max-w-[1320px] px-5 md:px-8 ${panel.side === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <article data-reveal className="glass w-full max-w-[460px] rounded-[28px] p-7 md:p-9">
                    <p className="t-eyebrow flex items-center gap-3 text-mint">
                      <span className="font-display text-white/40">0{i + 1}</span> {panel.eyebrow}
                    </p>
                    <h2 className="t-h2 mt-4">{panel.title}</h2>
                    <p className="mt-5 leading-relaxed text-white/70">{panel.body}</p>
                  </article>
                </div>
              </div>
            ))}
          </section>

          {/* ---------------- Fase 5 — ENCERRAMENTO ---------------- */}
          <section id="closing" data-scene-section aria-labelledby="closing-title" className="flex h-svh min-h-[560px] items-end pb-16 md:pb-20">
            <div data-reveal className="mx-auto w-full max-w-[860px] px-5 text-center md:px-8">
              <p className="t-eyebrow text-mint">{closing.eyebrow}</p>
              <h2 id="closing-title" className="t-h2 mt-4">{closing.title}</h2>
              <p className="t-lead mx-auto mt-5 max-w-[520px] text-white/70">{closing.body}</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href={ctas.primary.href} icon={<MessageCircle size={18} />}>
                  {ctas.primary.label}
                </Button>
                <Button to={ctas.secondary.to} variant="ghost">
                  {ctas.secondary.label}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
