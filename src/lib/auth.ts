export type Role = 'mahasiswa' | 'penjual'

// Halaman beranda setelah login, sesuai role
export function homeFor(role: Role): string {
  return role === 'penjual' ? '/dashboard' : '/kantin'
}

// Terjemahkan pesan error Supabase Auth ke Bahasa Indonesia
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email atau kata sandi salah.'
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox kamu.'
  if (m.includes('already registered')) return 'Email ini sudah terdaftar. Silakan masuk.'
  if (m.includes('password should be at least')) return 'Kata sandi minimal 6 karakter.'
  if (m.includes('rate limit')) return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Format email tidak valid.'
  }
  return 'Terjadi kesalahan. Silakan coba lagi.'
}
