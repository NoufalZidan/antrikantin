import { homeFor, type Role } from './auth'

// Aturan akses:
//   /login, /register  -> hanya untuk yang BELUM login
//   /penjual dan turunannya -> hanya role "penjual"
//   semua route lain (/, /kantin/..., /keranjang, ...) -> area pembeli, hanya role "mahasiswa"
// Route baru otomatis terlindungi tanpa perlu didaftarkan di sini.
const AUTH_ROUTES = ['/login', '/register']
const SELLER_BASE = '/penjual'

const matches = (path: string, base: string) => path === base || path.startsWith(base + '/')

/**
 * Menentukan ke mana user harus diarahkan.
 * @param role null = belum login
 * @returns path tujuan, atau null kalau boleh melanjutkan
 */
export function resolveRedirect(path: string, role: Role | null): string | null {
  const isAuthRoute = AUTH_ROUTES.some((r) => matches(path, r))
  const isSellerRoute = matches(path, SELLER_BASE)

  // Belum login: hanya boleh membuka halaman login/register
  if (role === null) return isAuthRoute ? null : '/login'

  const home = homeFor(role)

  if (isAuthRoute) return home // sudah login, tidak boleh ke login/register
  if (role === 'penjual' && !isSellerRoute) return home // penjual tidak boleh ke area pembeli
  if (role === 'mahasiswa' && isSellerRoute) return home // pembeli tidak boleh ke /penjual

  return null
}
