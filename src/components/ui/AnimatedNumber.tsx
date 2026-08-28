import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString('id-ID'))
  const firstRender = useRef(true)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: firstRender.current ? 0.7 : 0.45,
      ease: 'easeOut',
    })
    firstRender.current = false
    return controls.stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <motion.span className={className}>{rounded}</motion.span>
}
