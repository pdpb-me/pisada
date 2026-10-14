import { useId, useMemo } from 'react'
import { exerciseFor, strip } from '@/exercises/catalog'
import { cn } from '@/lib/utils'

// One exercise drawn as a line-figure strip (frames left to right).
// An unknown slug draws nothing. Thumbnails leave out the inset and the joint dots.
export function ExerciseFigure({
  slug,
  inset = false,
  dots = false,
  className,
}: {
  slug: string
  inset?: boolean
  dots?: boolean
  className?: string
}) {
  // Arrowhead markers need ids unique on the page, or one figure's arrows use another's
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ex = exerciseFor(slug)

  const svg = useMemo(() => {
    if (!ex) return null
    return strip(ex, { inset })
      .svg.replaceAll('fig-ah', `fig-ah-${uid}`)
      .replace('<svg ', '<svg aria-hidden="true" ')
  }, [ex, inset, uid])

  if (!ex || !svg) return null
  return (
    <div
      role="img"
      aria-label={ex.name}
      className={cn('[&_svg]:block [&_svg]:h-auto [&_svg]:w-full', !dots && '[&_.fig-dot]:hidden', className)}
      // Safe: the SVG is built by our own code from constants, with no user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
