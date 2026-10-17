'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage, type Role } from '@/lib/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { RoleSelect } from '@/components/auth/RoleSelect'
import { TextField } from '@/components/shared/TextField'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState<Role>('mahasiswa')
  const [nama, setNama] = useState('')
  const [namaKantin, setNamaKantin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password.length < 6) return setError('Kata sandi minimal 6 karakter.')
    if (password !== konfirmasi) return setError('Konfirmasi kata sandi tidak sama.')
    if (role === 'penjual' && !namaKantin.trim()) return setError('Nama kantin wajib diisi.')

    setLoading(true)

    // nama & role dibaca trigger handle_new_user() di database untuk membuat baris profiles
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nama: nama.trim(), role } },
    })

    if (error) {
      setError(authErrorMessage(error.message))
      setLoading(false)
      return
    }

    // Jika konfirmasi email aktif, email yang sudah terdaftar dibalas "sukses" tanpa identitas
    if (data.user && data.user.identities?.length === 0) {
      setError('Email ini sudah terdaftar. Silakan masuk.')
      setLoading(false)
      return
    }

    // Tidak ada sesi = konfirmasi email masih aktif di Supabase
    if (!data.session) {
      setInfo('Pendaftaran berhasil. Cek email kamu untuk konfirmasi, lalu masuk.')
      setLoading(false)
      return
    }

    // Penjual: buatkan kantin pertamanya selagi sesi masih aktif (RLS: owner_id = auth.uid())
    if (role === 'penjual' && data.user) {
      const { error: canteenError } = await supabase
        .from('canteens')
        .insert({ nama: namaKantin.trim(), owner_id: data.user.id })
      if (canteenError) console.error('Gagal membuat kantin:', canteenError.message)
    }

    // Supabase otomatis login setelah daftar. Keluar dulu supaya user harus login manual.
    // scope 'local' = hanya mengakhiri sesi di browser ini.
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login?registered=1')
  }

  return (
    <AuthCard
      wide
      title="Buat Akun Baru"
      subtitle="Bergabunglah untuk memesan tanpa antre di AntriKantin"
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {info && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RoleSelect value={role} onChange={setRole} disabled={loading} />

        <TextField
          label="Nama Lengkap"
          autoComplete="name"
          placeholder="Masukkan nama lengkap"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          disabled={loading}
        />

        {role === 'penjual' && (
          <TextField
            label="Nama Kantin"
            placeholder="Contoh: Kantin Teknik"
            wrapperClassName="md:col-span-2"
            value={namaKantin}
            onChange={(e) => setNamaKantin(e.target.value)}
            required
            disabled={loading}
          />
        )}

        <TextField
          label="Alamat Email"
          type="email"
          autoComplete="email"
          placeholder="nama@mhs.unsoed.ac.id"
          wrapperClassName="md:col-span-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <TextField
          label="Kata Sandi"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <TextField
          label="Konfirmasi Kata Sandi"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi kata sandi"
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          required
          disabled={loading}
        />

        <div className="mt-2 md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 p-3 text-sm font-semibold text-white transition duration-200 hover:bg-brand-700 active:scale-[0.99] disabled:bg-stone-400"
          >
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-stone-600">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-bold text-brand-600 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthCard>
  )
}
