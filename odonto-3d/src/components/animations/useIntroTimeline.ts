import { useLayoutEffect, type RefObject } from 'react'
import { gsap } from '../../utils/gsap'
import { rigStore } from './rigStore'

/**
 * Fase 1 — introdução. Os textos da hero entram imediatamente (bom para LCP);
 * o dente surge, flutua e recebe iluminação quando o modelo termina de carregar.
 */
export function useIntroTimeline(scope: RefObject<HTMLElement | null>, sceneReady: boolean, reducedMotion: boolean) {
  // textos
  useLayoutEffect(() => {
    if (!scope.current) return
    const ctx = gsap.context(() => {
      if (reducedMotion) return
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-hero-reveal]', { y: 28, opacity: 0, duration: 1, stagger: 0.09, clearProps: 'transform' })
    }, scope)
    return () => ctx.revert()
  }, [scope, reducedMotion])

  // dente + luz
  useLayoutEffect(() => {
    if (!sceneReady) return
    if (reducedMotion) {
      rigStore.intro = 1
      return
    }
    rigStore.intro = 0
    const tween = gsap.to(rigStore, { intro: 1, duration: 2.4, ease: 'power2.out', delay: 0.1 })
    return () => {
      tween.kill()
    }
  }, [sceneReady, reducedMotion])
}
