'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export function NavDropdown({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('click', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 hover:text-zinc-900"
      >
        {label}
        <span aria-hidden className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 min-w-[10rem] rounded border border-zinc-200 bg-white py-1 shadow-md">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
