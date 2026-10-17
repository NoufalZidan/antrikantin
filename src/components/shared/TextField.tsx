'use client'

import { useId, useState, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  // class untuk pembungkus, mis. "md:col-span-2" agar input memenuhi 2 kolom
  wrapperClassName?: string
}

// Ikon mata (Heroicons outline)
function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  )
}

// Input dengan label. Kalau type="password", otomatis ada tombol ikon mata.
export function TextField({
  label,
  hint,
  type = 'text',
  className = '',
  wrapperClassName = '',
  ...props
}: Props) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={`flex flex-col ${wrapperClassName}`}>
      <label htmlFor={id} className="mb-1 text-sm font-semibold text-stone-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={`w-full rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-60 ${
            isPassword ? 'pr-11' : ''
          } ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-brand-600 focus:outline-none"
          >
            {visible ? <EyeIcon /> : <EyeSlashIcon />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  )
}
