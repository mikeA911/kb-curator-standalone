'use client'

import { useState } from 'react'
import Image from 'next/image'

// Section-identity banner -- decorative artwork that orients a user to
// which functional area of KB Sandbox they're in, never a substitute for
// real page content. The actual heading stays a normal HTML <h1> on the
// page itself (rendered immediately below this component); alt="" here is
// deliberate, per the presentation brief's accessibility guidance -- a
// screen reader should never be asked to interpret text baked into the
// artwork, since every image used already repeats its own title/concept
// visually and that's redundant with the real heading that follows.
type SectionHeroProps = {
  image: string
  title?: string
  subtitle?: string
  height?: 'compact' | 'standard' | 'large'
  position?: string
  priority?: boolean
  children?: React.ReactNode
}

const HEIGHT_CLASSES: Record<NonNullable<SectionHeroProps['height']>, string> = {
  compact: 'h-[140px] sm:h-[160px]',
  standard: 'h-[180px] sm:h-[200px]',
  large: 'h-[260px] sm:h-[340px] md:h-[400px]',
}

export function SectionHero({ image, title, subtitle, height = 'standard', position = 'center', priority = false, children }: SectionHeroProps) {
  const [failed, setFailed] = useState(false)

  // Graceful failure: the container keeps a neutral background, so a
  // missing/broken asset just recedes to empty space instead of a broken-
  // image icon -- decorative imagery must never block the page.
  if (failed) return null

  return (
    <div className={`relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 ${HEIGHT_CLASSES[height]}`}>
      <Image
        src={image}
        alt=""
        fill
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover"
        style={{ objectPosition: position }}
        onError={() => setFailed(true)}
      />
      {(title || subtitle || children) && (
        <div className="absolute inset-0 flex flex-col items-start justify-end bg-gradient-to-t from-white/90 via-white/25 to-transparent p-4 sm:p-6">
          {title && <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>}
          {subtitle && <p className="mt-1 max-w-xl text-sm text-zinc-600">{subtitle}</p>}
          {children}
        </div>
      )}
    </div>
  )
}
