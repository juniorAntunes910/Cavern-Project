import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/** Número que "conta" até o valor ao aparecer e a cada mudança. Leitores de tela recebem só o valor final. */
export function CountUp({ value, duration = 900, format = (n: number) => String(Math.round(n)) }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  const from = useRef(shown)

  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) { from.current = value; setShown(value); return }
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = origin + (value - origin) * eased
      from.current = next
      setShown(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <><span className="count-up" aria-hidden="true">{format(shown)}</span><span className="sr-only">{format(value)}</span></>
}
