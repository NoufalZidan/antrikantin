import Link from 'next/link'

type Props = {
  title: string
  subtitle: string
  // true = kartu melebar jadi 2 kolom di layar md ke atas (dipakai halaman register)
  wide?: boolean
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, wide = false, children }: Props) {
  return (
    <div
      className={`w-full rounded-3xl border border-stone-200/70 bg-white/80 p-6 shadow-xl shadow-stone-900/5 backdrop-blur-md sm:p-8 ${
        wide ? 'max-w-md md:max-w-3xl' : 'max-w-md'
      }`}
    >
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="mb-4 flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-xl font-semibold text-white">
            A
          </span>
          <span className="text-xl font-semibold tracking-tight text-stone-900">AntriKantin</span>
        </Link>
        <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
        <p className="mt-1 text-center text-sm text-stone-500">{subtitle}</p>
      </div>

      {children}
    </div>
  )
}
