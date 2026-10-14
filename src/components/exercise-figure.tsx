import { useId, useMemo } from 'react'
import { exerciseFor, strip } from '@/exercises/catalog'
import { cn } from '@/lib/utils'

// One exercise drawn as a line-figure strip (frames left to right).
// An unknown slug draws nothing. Thumbnails leave out the inset and the joint dots.
// contain: fit the strip inside a box you size (e.g. a 16:9 thumbnail), centred.
export function ExerciseFigure({
  slug,
  inset = false,
  dots = false,
  contain = false,
  className,
}: {
  slug: string
  inset?: boolean
  dots?: boolean
  contain?: boolean
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
      className={cn(
        '[&_svg]:block',
        contain ? '[&_svg]:size-full' : '[&_svg]:h-auto [&_svg]:w-full',
        !dots && '[&_.fig-dot]:hidden',
        className,
      )}
      // Safe: the SVG is built by our own code from constants, with no user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
