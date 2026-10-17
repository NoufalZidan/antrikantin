'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Role } from '@/lib/auth'

const OPTIONS: { value: Role; label: string }[] = [
  { value: 'mahasiswa', label: 'Mahasiswa (Memesan)' },
  { value: 'penjual', label: 'Penjual Kantin (Berjualan)' },
]

type Props = {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
}

// Dropdown role: tombol + daftar pilihan yang menutup saat klik di luar atau tekan Escape
export function RoleSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]

  return (
    <div ref={containerRef} className="relative flex flex-col">
      <span id={labelId} className="mb-1 text-sm font-semibold text-stone-700">
        Daftar Sebagai
      </span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between rounded-lg border bg-white p-3 text-left text-sm transition-colors focus:outline-none disabled:opacity-60 ${
          open
            ? 'border-brand-600 ring-1 ring-brand-600'
            : 'border-stone-300 hover:border-brand-600 focus-visible:border-brand-600 focus-visible:ring-1 focus-visible:ring-brand-600'
        }`}
      >
        <span className="text-stone-900">{current.label}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 text-stone-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg"
        >
          {OPTIONS.map((o) => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`block w-full p-3 text-left text-sm transition-colors ${
                  selected
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
