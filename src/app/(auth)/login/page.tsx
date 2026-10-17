'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage, homeFor, type Role } from '@/lib/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { TextField } from '@/components/shared/TextField'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Muncul setelah user baru selesai mendaftar (/login?registered=1)
  const justRegistered = searchParams.get('registered') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error || !data.user) {
      setError(authErrorMessage(error?.message ?? ''))
      setLoading(false)
      return
    }

    // Ambil role untuk menentukan halaman tujuan
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role: Role = profile?.role === 'penjual' ? 'penjual' : 'mahasiswa'
    router.replace(homeFor(role))
    router.refresh() // sinkronkan sesi baru ke Server Component
  }

  return (
    <AuthCard title="Selamat Datang" subtitle="Masuk untuk memesan atau mengelola pesanan">
      {justRegistered && !error && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi kamu.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-5 grid grid-cols-1 gap-4">
        <TextField
          label="Alamat Email"
          type="email"
          autoComplete="email"
          placeholder="nama@mhs.unsoed.ac.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <TextField
          label="Kata Sandi"
          type="password"
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-brand-600 p-3 text-sm font-semibold text-white transition duration-200 hover:bg-brand-700 active:scale-[0.99] disabled:bg-stone-400"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p className="text-center text-sm text-stone-600">
        Belum punya akun?{' '}
        <Link href="/register" className="font-bold text-brand-600 hover:underline">
          Daftar
        </Link>
      </p>
    </AuthCard>
  )
}

// useSearchParams() di App Router harus dibungkus Suspense agar build production tidak error
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
