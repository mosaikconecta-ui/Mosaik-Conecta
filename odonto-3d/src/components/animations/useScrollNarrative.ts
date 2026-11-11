import { useLayoutEffect, type RefObject } from 'react'
import { gsap, ScrollTrigger } from '../../utils/gsap'
import { keyframesDesktop, keyframesMobile } from '../../config/scene'
import { rigStore } from './rigStore'

interface Options {
  /** container que envolve todas as seções da narrativa */
  container: RefObject<HTMLElement | null>
  reducedMotion: boolean
}

const MOBILE_QUERY = '(max-width: 767px), (orientation: portrait) and (max-width: 1024px)'

/**
 * Liga a rolagem à cena 3D com UM único ScrollTrigger (scrub) que alimenta
 * rigStore.progress. Cada seção marcada com [data-scene-section] tem seu
 * intervalo medido a cada refresh (resize, fontes, imagens) — o roteiro em
 * config/scene.ts referencia as seções pelo id, nunca por pixels fixos.
 *
 * Também anima a saída dos textos da hero (Fase 2) com scrub sincronizado.
 */
export function useScrollNarrative({ container, reducedMotion }: Options) {
  useLayoutEffect(() => {
    const el = container.current
    if (!el) return
    rigStore.reducedMotion = reducedMotion

    const measure = () => {
      const total = Math.max(el.offsetHeight - window.innerHeight, 1)
      rigStore.sections.clear()
      el.querySelectorAll<HTMLElement>('[data-scene-section]').forEach((s) => {
        const top = s.offsetTop
        rigStore.sections.set(s.id, {
          start: Math.min(top / total, 1),
          end: Math.min((top + s.offsetHeight) / total, 1),
        })
      })
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add({ mobile: MOBILE_QUERY, any: 'all' }, (c) => {
        rigStore.keyframes = c.conditions?.mobile ? keyframesMobile : keyframesDesktop
      })

      if (reducedMotion) {
        // movimento reduzido: pose estática da hero, sem narrativa de câmera
        rigStore.progress = 0
        measure()
        return
      }

      const proxy = { p: 0 }
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        onUpdate: () => {
          rigStore.progress = proxy.p
        },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.1,
          invalidateOnRefresh: true,
          onRefresh: measure,
        },
      })

      // Fase 2 — textos iniciais desaparecem enquanto o dente gira e aproxima
      gsap.to('[data-hero-exit]', {
        opacity: 0,
        y: -60,
        filter: 'blur(6px)',
        ease: 'none',
        stagger: 0.04,
        scrollTrigger: { trigger: '#hero', start: 'top top', end: '45% top', scrub: true },
      })
    }, el)

    measure()
    // fontes alteram alturas → remede após carregarem
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      ctx.revert()
      mm.revert()
      rigStore.progress = 0
    }
  }, [container, reducedMotion])
}
