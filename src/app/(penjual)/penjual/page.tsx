'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  BellOff,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Feather,
  Inbox,
  Loader,
  RefreshCw,
  ShoppingBag,
  X,
} from 'react-feather'
import { createClient } from '@/lib/supabase/client'

const sb = createClient()

type Pesanan = {
  id: string
  kode_pesanan: string
  tanggal_ambil: string
  status: string
  total: number
  metode_bayar: string
  order_items: {
    id: string
    nama_menu: string
    jumlah: number
    harga_satuan: number
  }[]
  time_slots: {
    jam_mulai: string
    jam_selesai: string
  } | null
}

// Baris orders dari event realtime INSERT (order_items belum tentu sudah tersimpan)
type NewOrder = {
  id: string
  kode_pesanan: string
  total: number
  metode_bayar: string
}

type Toast = { id: string; code: string; text: string }

const NEXT: Record<string, { status: string; label: string }> = {
  Diterima: {
    status: 'Diproses',
    label: 'Mulai Proses',
  },
  Diproses: {
    status: 'Siap Diambil',
    label: 'Tandai Siap Diambil',
  },
  'Siap Diambil': {
    status: 'Selesai',
    label: 'Tandai Selesai',
  },
}

const STYLE: Record<string, { badge: string; dot: string }> = {
  Diterima: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  Diproses: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  'Siap Diambil': { badge: 'bg-green-50 text-green-800 ring-green-200', dot: 'bg-green-600' },
}
const FALLBACK = { badge: 'bg-stone-100 text-stone-700 ring-stone-200', dot: 'bg-stone-400' }

const rp = (n: number | null) => 'Rp ' + (n ?? 0).toLocaleString('id-ID')
const jam = (t: string) => t.slice(0, 5)
const tgl = (s: string) => {
  const d = new Date(s)
  return isNaN(+d)
    ? s
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Kolom tabel di layar lebar; di ponsel baris menumpuk jadi kartu
const COLS =
  'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_13rem]'

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-400 lg:hidden">
        {label}
      </span>
      {children}
    </div>
  )
}

export default function PenjualDashboard() {
  const [pesanan, setPesanan] = useState<Pesanan[]>([])
  const [seller, setSeller] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  // Tracker pesanan masuk
  const [live, setLive] = useState(false) // status koneksi realtime
  const [newIds, setNewIds] = useState<Set<string>>(new Set()) // pesanan belum "dilihat"
  const [toasts, setToasts] = useState<Toast[]>([])

  // ctxRef terisi = suara & notifikasi browser aktif
  const ctxRef = useRef<AudioContext | null>(null)
  const [notifOn, setNotifOn] = useState(false)

  const beep = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  }, [])

  // Dipanggil setiap ada INSERT di tabel orders
  const notifyNew = useCallback(
    (o: NewOrder) => {
      const text = `${rp(o.total)} · ${(o.metode_bayar ?? '-').toUpperCase()}`

      setNewIds((s) => new Set(s).add(o.id))
      setToasts((t) => [...t, { id: o.id, code: o.kode_pesanan, text }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== o.id)), 8000)

      beep()

      if (
        ctxRef.current &&
        document.hidden &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          const n = new Notification(`Pesanan baru #${o.kode_pesanan}`, { body: text })
          n.onclick = () => window.focus()
        } catch {
          // shortcut: browser mobile butuh service worker, toast & suara tetap jalan; upgrade ke Web Push bila perlu
        }
      }
    },
    [beep]
  )

  // Audio baru boleh dibuat setelah klik pengguna (aturan autoplay browser)
  const toggleNotif = async () => {
    if (ctxRef.current) {
      void ctxRef.current.close()
      ctxRef.current = null
      setNotifOn(false)
      return
    }
    ctxRef.current = new AudioContext()
    await ctxRef.current.resume()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    setNotifOn(true)
    beep()
  }

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
    }
  }, [])

  // Jumlah pesanan baru tampil di judul tab agar terlihat walau tab lain sedang aktif
  useEffect(() => {
    document.title = newIds.size
      ? `(${newIds.size}) Pesanan baru · AntriKantin`
      : 'Dashboard Penjual · AntriKantin'
  }, [newIds])

  // Mengambil pesanan dari database
  const loadOrders = useCallback(async () => {
    const { data, error } = await sb
      .from('orders')
      .select(`
        id,
        kode_pesanan,
        tanggal_ambil,
        status,
        total,
        metode_bayar,
        order_items (
          id,
          nama_menu,
          jumlah,
          harga_satuan
        ),
        time_slots (
          jam_mulai,
          jam_selesai
        )
      `)
      .neq('status', 'Selesai')
      .order('created_at', { ascending: false })

    if (error) {
      setErr(`Gagal mengambil pesanan: ${error.message}`)
      setLoading(false)
      return
    }

    setPesanan((data ?? []) as unknown as Pesanan[])
    setErr('')
    setLoading(false)
  }, [])

  // Memeriksa sesi login dan role dari tabel profiles
  useEffect(() => {
    let active = true

    const checkSeller = async () => {
      const {
        data: { user },
        error: authError,
      } = await sb.auth.getUser()

      if (!active) return

      if (authError || !user) {
        setSeller(false)
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!active) return

      if (profileError) {
        setErr(`Gagal memeriksa role: ${profileError.message}`)
        setSeller(false)
        setLoading(false)
        return
      }

      setSeller(profile?.role === 'penjual')
    }

    void checkSeller()

    // Periksa ulang jika sesi berubah.
    // Callback auth tetap sinkron agar tidak mengunci proses Supabase.
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      queueMicrotask(() => {
        if (active) void checkSeller()
      })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Mengambil pesanan dan mendengarkan perubahan realtime
  useEffect(() => {
    if (seller !== true) {
      if (seller === false) setLoading(false)
      return
    }

    setLoading(true)
    void loadOrders()

    // shortcut: satu reload per event, tambahkan debounce bila satu pesanan berisi banyak item
    const reload = () => {
      void loadOrders()
    }

        const channel = sb
      .channel('seller-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          notifyNew(payload.new as NewOrder)
          setTimeout(reload, 1500) // shortcut: tanpa realtime order_items, muat ulang sekali setelah item sempat tersimpan
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, reload)
      // item disimpan setelah baris orders, jadi muat ulang juga saat order_items berubah
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, reload)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      setLive(false)
      void sb.removeChannel(channel)
    }
  }, [seller, loadOrders, notifyNew])

  // Memperbarui status pesanan
  const updateStatus = async (order: Pesanan) => {
    const next = NEXT[order.status]
    if (!next || busyId !== null) return

    setBusyId(order.id)
    setErr('')

    const { error } = await sb
      .from('orders')
      .update({ status: next.status })
      .eq('id', order.id)

    if (error) {
      setErr(`Status gagal diperbarui: ${error.message}`)
    } else {
      setNewIds((s) => {
        const n = new Set(s)
        n.delete(order.id)
        return n
      })
      await loadOrders()
    }

    setBusyId(null)
  }

  // Tampilan saat sesi sedang diperiksa
  if (seller === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6f1] p-6">
        <p className="text-sm text-stone-500">Memeriksa sesi login...</p>
      </main>
    )
  }

  // Tampilan jika bukan penjual atau belum login
  if (!seller) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6f1] p-6">
        <div className="w-full max-w-md rounded-3xl border border-green-900/10 bg-white p-8 text-center shadow-lg shadow-green-900/5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-800">
            <Feather size={28} aria-hidden="true" />
          </div>

          <h1 className="text-xl font-bold text-stone-900">Dashboard Penjual</h1>

          <p className="mt-2 text-sm leading-6 text-stone-500">
            Silakan login menggunakan akun yang memiliki akses penjual.
          </p>

          {err && <p className="mt-3 break-words text-sm text-red-600">{err}</p>}

          <a
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-green-800 px-5 py-3 text-sm font-semibold text-white hover:bg-green-900"
          >
            Kembali ke halaman login
          </a>
        </div>
      </main>
    )
  }

  const diterima = pesanan.filter((p) => p.status === 'Diterima').length
  const diproses = pesanan.filter((p) => p.status === 'Diproses').length
  const siap = pesanan.filter((p) => p.status === 'Siap Diambil').length

  const hariIni = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-stone-900 lg:flex">
      {/* Toast pesanan masuk */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-green-200 bg-white p-4 shadow-lg ring-1 ring-green-100"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <Bell size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-green-800">Pesanan baru #{t.code}</p>
              <p className="mt-0.5 break-words text-sm text-stone-600">{t.text}</p>
            </div>
            <button
              aria-label="Tutup notifikasi"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="text-stone-400 hover:text-stone-700"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar (menjadi header biasa di ponsel) */}
      <aside className="relative overflow-hidden bg-gradient-to-b from-green-900 to-green-950 text-green-50 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-green-600/25 blur-3xl"
        />

        <a href="/" className="relative flex items-center gap-3 px-5 py-4 lg:py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-green-200 ring-1 ring-green-300/20">
            <Feather size={22} aria-hidden="true" />
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight">AntriKantin</p>
            <p className="text-xs text-green-200/70">Portal penjual</p>
          </div>
        </a>

        <nav className="relative mt-4 hidden px-3 lg:block">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-green-300/60">
            Menu
          </p>

          <div
            aria-current="page"
            className="mt-2 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold ring-1 ring-white/10"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} aria-hidden="true" />
              Antrean Pesanan
            </span>
            <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-green-950">
              {loading ? '—' : pesanan.length}
            </span>
          </div>
        </nav>

        <div className="relative mt-auto hidden px-5 py-5 lg:block">
          <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-xs text-green-100/80">
            <span
              className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-green-400' : 'bg-amber-400'}`}
            />
            {live ? 'Realtime terhubung' : 'Menghubungkan realtime...'}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-green-900/10 bg-white/75 backdrop-blur">
          <div className="flex items-center justify-between px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs text-stone-500">Dashboard / Antrean Pesanan</p>
              <p className="text-sm font-semibold capitalize">{hariIni}</p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold lg:hidden ${
                  live ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-green-600' : 'bg-amber-500'}`} />
                {live ? 'Live' : 'Offline'}
              </span>

              <div className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
                ● Dashboard Penjual
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          {/* Judul dan tombol */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold tracking-widest text-green-700">
                OPERASIONAL KANTIN
              </p>

              <h1 className="text-3xl font-extrabold tracking-tight">Antrean Pesanan</h1>

              <p className="mt-2 text-sm text-stone-500">
                Pantau dan kelola pesanan pelanggan secara langsung.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void toggleNotif()}
                aria-pressed={notifOn}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm ${
                  notifOn
                    ? 'border-green-300 bg-green-100 text-green-900 hover:bg-green-200'
                    : 'border-green-900/15 bg-white text-green-900 hover:bg-green-50'
                }`}
              >
                {notifOn ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
                {notifOn ? 'Suara aktif' : 'Aktifkan suara'}
              </button>

              <button
                onClick={() => {
                  setLoading(true)
                  void loadOrders()
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-900/15 bg-white px-4 py-2.5 text-sm font-semibold text-green-900 shadow-sm hover:bg-green-50 disabled:opacity-50"
              >
                <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
                {loading ? 'Memuat...' : 'Muat ulang'}
              </button>
            </div>
          </div>

          {/* Pesan error */}
          {err && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Terjadi masalah</p>
              <p className="mt-1 break-words">{err}</p>
            </div>
          )}

          {/* Statistik pesanan */}
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Pesanan aktif', value: pesanan.length, Icon: ShoppingBag, color: 'bg-green-900 text-white' },
              { label: 'Pesanan diterima', value: diterima, Icon: Inbox, color: 'bg-amber-100 text-amber-700' },
              { label: 'Sedang diproses', value: diproses, Icon: Loader, color: 'bg-sky-100 text-sky-700' },
              { label: 'Siap diambil', value: siap, Icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-green-900/10 bg-white p-5 shadow-sm shadow-green-900/5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-stone-500">{stat.label}</p>

                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.Icon size={20} aria-hidden="true" />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold tracking-tight">
                  {loading ? '—' : stat.value}
                </p>
              </div>
            ))}
          </section>

          {/* Daftar pesanan */}
          <section className="overflow-hidden rounded-2xl border border-green-900/10 bg-white shadow-sm shadow-green-900/5">
            <div className="flex flex-col gap-1 border-b border-green-900/10 bg-green-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-lg font-bold">Daftar pesanan</h2>

                <p className="mt-1 text-sm text-stone-500">
                  Pesanan yang belum selesai diproses.
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
                {newIds.size > 0 && (
                  <button
                    onClick={() => setNewIds(new Set())}
                    className="inline-flex items-center gap-1.5 rounded-full bg-green-700 px-3 py-1 text-xs font-semibold text-white hover:bg-green-800"
                  >
                    <Bell size={12} aria-hidden="true" />
                    {newIds.size} baru · Tandai dilihat
                  </button>
                )}

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  {loading ? 'Memuat data' : `${pesanan.length} pesanan`}
                </span>
              </div>
            </div>

            {loading && pesanan.length === 0 ? (
              <div className="p-12 text-center text-sm text-stone-500">
                Mengambil pesanan dari Supabase...
              </div>
            ) : pesanan.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle size={22} aria-hidden="true" />
                </div>

                <p className="font-semibold">Tidak ada pesanan aktif</p>

                <p className="mt-1 text-sm text-stone-500">
                  Pesanan baru akan muncul di sini saat tersedia.
                </p>
              </div>
            ) : (
              <div>
                {/* Judul kolom (hanya layar lebar) */}
                <div
                  className={`hidden gap-4 border-b border-green-900/10 bg-stone-50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-500 lg:grid ${COLS}`}
                >
                  <span>Pesanan</span>
                  <span>Item</span>
                  <span>Pengambilan</span>
                  <span>Pembayaran</span>
                  <span>Status</span>
                  <span>Aksi</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {pesanan.map((p) => {
                    const next = NEXT[p.status]
                    const updating = busyId === p.id
                    const st = STYLE[p.status] ?? FALLBACK
                    const isNew = newIds.has(p.id)

                    return (
                      <article
                        key={p.id}
                        className={`grid gap-4 p-5 transition sm:p-6 lg:items-center ${COLS} ${
                          isNew ? 'bg-green-50/70 ring-2 ring-inset ring-green-400/50' : 'hover:bg-green-50/40'
                        }`}
                      >
                        <Cell label="Pesanan">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-extrabold">#{p.kode_pesanan}</h3>
                            {isNew && (
                              <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Baru
                              </span>
                            )}
                          </div>
                        </Cell>

                        <Cell label="Item">
                          <div className="space-y-1.5">
                            {p.order_items?.length ? (
                              p.order_items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 text-sm text-stone-600"
                                >
                                  <span className="min-w-0 break-words">
                                    {item.nama_menu} × {item.jumlah}
                                  </span>

                                  <span className="shrink-0 font-medium text-stone-700">
                                    {rp(item.harga_satuan * item.jumlah)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm italic text-stone-400">Memuat item...</p>
                            )}
                          </div>
                        </Cell>

                        <Cell label="Pengambilan">
                          <p className="flex items-center gap-2 text-sm font-medium text-stone-700">
                            <Clock size={14} aria-hidden="true" className="shrink-0 text-green-700" />
                            {p.time_slots
                              ? `${jam(p.time_slots.jam_mulai)} - ${jam(p.time_slots.jam_selesai)}`
                              : 'Jadwal belum tersedia'}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                            <Calendar size={12} aria-hidden="true" className="shrink-0" />
                            {tgl(p.tanggal_ambil)}
                          </p>
                        </Cell>

                        <Cell label="Pembayaran">
                          <p className="text-sm font-bold">{rp(p.total)}</p>
                          <p className="mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                            <CreditCard size={12} aria-hidden="true" className="shrink-0" />
                            {p.metode_bayar ?? '-'}
                          </p>
                        </Cell>

                        <Cell label="Status">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${st.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            {p.status}
                          </span>
                        </Cell>

                        <div>
                          {next ? (
                            <button
                              onClick={() => void updateStatus(p)}
                              disabled={busyId !== null}
                              className="w-full rounded-xl bg-green-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updating ? 'Menyimpan...' : `${next.label} →`}
                            </button>
                          ) : (
                            <span className="text-sm text-stone-400">Status tidak dikenali</span>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <p className="mt-5 text-center text-xs text-stone-400">
            Data pesanan berasal dari database AntriKantin.
          </p>
        </div>
      </main>
    </div>
  )
}
