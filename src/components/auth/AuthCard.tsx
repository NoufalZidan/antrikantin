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
        <div className="mb-4 flex items-center">
          <img
            src="/logo.png"
            alt="JOiS"
            className="h-20 w-auto object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
        <p className="mt-1 text-center text-sm text-stone-500">{subtitle}</p>
      </div>

      {children}
    </div>
  )
}
