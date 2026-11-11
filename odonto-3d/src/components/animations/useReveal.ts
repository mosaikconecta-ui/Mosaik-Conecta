import { useLayoutEffect, type RefObject } from 'react'
import { gsap } from '../../utils/gsap'

/** Revela elementos [data-reveal] ao entrarem na viewport (sem scrub, reversível). */
export function useReveal(scope: RefObject<HTMLElement | null>, reducedMotion: boolean) {
  useLayoutEffect(() => {
    if (!scope.current || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 48,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        })
      })
    }, scope)
    return () => ctx.revert()
  }, [scope, reducedMotion])
}
