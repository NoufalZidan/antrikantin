"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  Feather,
  Inbox,
  RefreshCw,
  ShoppingBag,
  X,
  Eye,
} from "react-feather";
import { createClient } from "@/lib/supabase/client";

const sb = createClient();

type Pesanan = {
  id: string;
  kode_pesanan: string;
  tanggal_ambil: string;
  status: string;
  total: number;
  metode_bayar: string;
  payment_proof_url: string | null;
  order_items: {
    id: string;
    nama_menu: string;
    jumlah: number;
    harga_satuan: number;
  }[];
  time_slots: {
    jam_mulai: string;
    jam_selesai: string;
  } | null;
};

type NewOrder = {
  id: string;
  kode_pesanan: string;
  total: number;
  metode_bayar: string;
  canteen_id: string;
};

type Toast = { id: string; code: string; text: string };

const NEXT: Record<string, { status: string; label: string }> = {
  diterima: { status: "diproses", label: "Proses Pesanan" },
  diproses: { status: "siap", label: "Tandai Siap Diambil" },
  siap: { status: "selesai", label: "Selesaikan Pesanan" },
};

const STYLE: Record<string, { badge: string; dot: string }> = {
  diterima: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  diproses: {
    badge: "bg-sky-50 text-sky-700 border border-sky-200",
    dot: "bg-sky-500",
  },
  siap: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-600",
  },
  selesai: {
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    dot: "bg-gray-400",
  },
  dibatalkan: {
    badge: "bg-red-50 text-red-600 border border-red-200",
    dot: "bg-red-500",
  },
};
const FALLBACK = {
  badge: "bg-gray-100 text-gray-600 border border-gray-200",
  dot: "bg-gray-400",
};

const rp = (n: number | null) => "Rp " + (n ?? 0).toLocaleString("id-ID");
const jam = (t: string) => (t ? t.slice(0, 5) : "");

export default function PenjualDashboard() {
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [seller, setSeller] = useState<boolean | null>(null);
  const [canteenId, setCanteenId] = useState<string | null>(null); // Tambahan state ID Kantin
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const [modalImg, setModalImg] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const ctxRef = useRef<AudioContext | null>(null);
  const [notifOn, setNotifOn] = useState(false);

  const beep = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const notifyNew = useCallback(
    (o: NewOrder) => {
      const text = `${rp(o.total)} · ${(o.metode_bayar ?? "-").toUpperCase()}`;
      setNewIds((s) => new Set(s).add(o.id));
      setToasts((t) => [...t, { id: o.id, code: o.kode_pesanan, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== o.id)), 8000);
      beep();
    },
    [beep],
  );

  // Membutuhkan ID Kantin untuk mengambil order yang relevan saja
  const loadOrders = useCallback(async (cid: string) => {
    setLoading(true);
    const { data, error } = await sb
      .from("orders")
      .select(
        `
        id,
        kode_pesanan,
        tanggal_ambil,
        status,
        total,
        metode_bayar,
        payment_proof_url,
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
      `,
      )
      .eq("canteen_id", cid) // Filter hanya pesanan di kantin ini
      .order("created_at", { ascending: false });

    if (error) {
      setErr(`Gagal mengambil pesanan: ${error.message}`);
      setLoading(false);
      return;
    }

    setPesanan((data ?? []) as unknown as Pesanan[]);
    setErr("");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const checkSeller = async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!active) return;
      if (!user) {
        setSeller(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!active) return;

      if (profile?.role === "penjual") {
        // Ambil data kantin yang terhubung dengan akun penjual
        const { data: canteen } = await sb
          .from("canteens")
          .select("id")
          .eq("owner_id", user.id)
          .single();
        if (canteen) {
          setCanteenId(canteen.id);
          setSeller(true);
        } else {
          setErr("Kantin tidak ditemukan untuk akun ini.");
          setSeller(false);
          setLoading(false);
        }
      } else {
        setSeller(false);
        setLoading(false);
      }
    };
    void checkSeller();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (seller !== true || !canteenId) return;
    void loadOrders(canteenId);

    const reload = () => void loadOrders(canteenId);
    const channel = sb
      .channel("seller-orders")
      .on(
        "postgres_changes",
        // Filter realtime event hanya untuk pesanan baru di kantin ini
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `canteen_id=eq.${canteenId}`,
        },
        (p) => {
          notifyNew(p.new as NewOrder);
          setTimeout(reload, 1500);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `canteen_id=eq.${canteenId}`,
        },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        reload,
      ) // Jika item berubah, update
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [seller, canteenId, loadOrders, notifyNew]);

  const updateStatus = async (order: Pesanan) => {
    const currentStatus = (order.status || "").toLowerCase().trim();
    const next = NEXT[currentStatus];

    if (!next) {
      alert(
        `Status saat ini "${order.status}" tidak memiliki transisi lanjutan.`,
      );
      return;
    }

    if (busyId !== null || !canteenId) return;

    setBusyId(order.id);
    setErr("");

    const { error } = await sb
      .from("orders")
      .update({ status: next.status })
      .eq("id", order.id);

    if (error) {
      setErr(`Gagal memperbarui status: ${error.message}`);
      alert(`Gagal: ${error.message}`);
    } else {
      setNewIds((s) => {
        const n = new Set(s);
        n.delete(order.id);
        return n;
      });
      await loadOrders(canteenId);
    }
    setBusyId(null);
  };

  if (seller === null)
    return (
      <div className="p-8 text-center text-gray-500">Memeriksa sesi...</div>
    );
  if (!seller)
    return (
      <div className="p-8 text-center text-red-500">
        Akses ditolak. {err || "Khusus akun Penjual."}
      </div>
    );

  const countDiterima = pesanan.filter(
    (p) => p.status?.toLowerCase() === "diterima",
  ).length;
  const countDiproses = pesanan.filter(
    (p) => p.status?.toLowerCase() === "diproses",
  ).length;
  const countSiap = pesanan.filter(
    (p) => p.status?.toLowerCase() === "siap",
  ).length;

  return (
    <div className="min-h-screen bg-emerald-50/30 text-gray-800 pb-20">
      {/* Modal Preview Bukti Transfer */}
      {modalImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setModalImg(null)}
              className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-lg text-gray-800 mb-4">
              Bukti Pembayaran
            </h3>
            <div className="relative h-80 w-full overflow-hidden rounded-2xl border bg-gray-50">
              <img
                src={modalImg}
                alt="Bukti Transfer"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header Utama */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="JOiS"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg">
                Portal Penjual
              </h1>
              <p className="text-xs text-gray-400">
                Kelola pesanan masuk kantin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/penjual/profil"
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors hidden sm:block"
            >
              Profil Kantin
            </a>
            <a
              href="/penjual/menu"
              className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors"
            >
              Kelola Menu
            </a>
            <button
              onClick={async () => {
                await sb.auth.signOut();
                window.location.href = "/login";
              }}
              className="text-gray-600 hover:text-red-600 font-medium text-sm transition-colors px-2"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* Banner Atas */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800">
              Antrean Pesanan
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pantau pesanan yang masuk secara real-time.
            </p>
          </div>
          <button
            onClick={() => canteenId && loadOrders(canteenId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 self-start sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
            Muat Ulang
          </button>
        </div>

        {/* Statistik Kartu Ringkas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Baru Diterima
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">
              {countDiterima}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Sedang Diproses
            </p>
            <p className="mt-2 text-3xl font-extrabold text-sky-600">
              {countDiproses}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Siap Diambil
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
              {countSiap}
            </p>
          </div>
        </div>

        {/* Pesan Error */}
        {err && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Daftar Pesanan */}
        {loading && pesanan.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            Memuat pesanan...
          </div>
        ) : pesanan.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <Inbox className="mx-auto text-4xl text-gray-300 mb-3" />
            <h3 className="font-bold text-gray-700 text-lg">
              Belum Ada Pesanan
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Pesanan baru dari mahasiswa akan muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pesanan.map((p) => {
              const currentStatus = (p.status || "").toLowerCase().trim();
              const next = NEXT[currentStatus];
              const st = STYLE[currentStatus] ?? FALLBACK;
              const isNew = newIds.has(p.id);

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-3xl p-6 shadow-sm border transition-all flex flex-col justify-between space-y-4 ${
                    isNew
                      ? "border-emerald-400 ring-2 ring-emerald-100"
                      : "border-gray-100"
                  }`}
                >
                  {/* Header Card */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-gray-800">
                          #{p.kode_pesanan}
                        </span>
                        {isNew && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={12} />{" "}
                        {p.time_slots
                          ? `${jam(p.time_slots.jam_mulai)} - ${jam(p.time_slots.jam_selesai)}`
                          : "Waktu fleksibel"}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${st.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${st.dot}`}
                        />
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Rincian Item */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Rincian Pesanan
                    </p>
                    {p.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="font-medium text-gray-700">
                          {item.jumlah}x {item.nama_menu}
                        </span>
                        <span className="font-semibold text-gray-600">
                          {rp(item.harga_satuan * item.jumlah)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pembayaran & Bukti */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-xs text-gray-400">
                        Total Pembayaran ({p.metode_bayar?.toUpperCase()})
                      </p>
                      <p className="text-lg font-extrabold text-emerald-600">
                        {rp(p.total)}
                      </p>
                    </div>
                    {p.payment_proof_url ? (
                      <button
                        onClick={() => setModalImg(p.payment_proof_url)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <Eye size={14} /> Cek Bukti Transfer
                      </button>
                    ) : (
                      <span className="text-xs italic text-gray-400">
                        Tanpa bukti transfer
                      </span>
                    )}
                  </div>

                  {/* Tombol Aksi Status */}
                  <div className="pt-3 border-t border-gray-100">
                    {next ? (
                      <button
                        onClick={() => void updateStatus(p)}
                        disabled={busyId === p.id}
                        className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {busyId === p.id ? "Memproses..." : `${next.label} →`}
                      </button>
                    ) : (
                      <div className="w-full py-3 text-center text-xs font-bold text-gray-400 bg-gray-100 rounded-2xl">
                        Pesanan Selesai / Dibatalkan
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
