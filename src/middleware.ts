import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { homeFor, type Role } from '@/lib/auth'

// URL tidak memuat nama route group, jadi (mahasiswa) -> /kantin, dst.
const MAHASISWA_ROUTES = ['/kantin', '/keranjang', '/pesanan']
const PENJUAL_ROUTES = ['/dashboard', '/menu', '/slot', '/ringkasan']
const AUTH_ROUTES = ['/login', '/register']

const matches = (path: string, routes: string[]) =>
  routes.some((r) => path === r || path.startsWith(r + '/'))

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() memvalidasi token ke server Supabase (lebih aman daripada getSession())
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isMahasiswaRoute = matches(path, MAHASISWA_ROUTES)
  const isPenjualRoute = matches(path, PENJUAL_ROUTES)
  const isAuthRoute = matches(path, AUTH_ROUTES)

  // Redirect sambil membawa cookie sesi yang baru di-refresh
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  // 1. Belum login tapi buka halaman yang butuh login
  if (!user && (isMahasiswaRoute || isPenjualRoute)) {
    return redirectTo('/login')
  }

  // 2. Sudah login: cek role dari tabel profiles (bukan dari metadata yang bisa diubah user)
  if (user && (isMahasiswaRoute || isPenjualRoute || isAuthRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role: Role = profile?.role === 'penjual' ? 'penjual' : 'mahasiswa'

    // Sudah login tapi buka /login atau /register -> arahkan ke beranda role-nya
    if (isAuthRoute) return redirectTo(homeFor(role))

    // Salah area: mahasiswa buka halaman penjual (atau sebaliknya)
    if (role === 'mahasiswa' && isPenjualRoute) return redirectTo(homeFor(role))
    if (role === 'penjual' && isMahasiswaRoute) return redirectTo(homeFor(role))
  }

  return response
}

export const config = {
  matcher: [
    // Semua route kecuali file statis
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
