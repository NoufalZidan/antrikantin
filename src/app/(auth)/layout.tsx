// Layout hanya mengatur latar dan posisi tengah.
// Kartu (logo, judul, lebar) dirender tiap halaman lewat <AuthCard />.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white/70 p-6">
      {children}
    </main>
  )
}
