"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FaArrowLeft, FaReceipt, FaClock, FaCheckCircle, FaSpinner } from "react-icons/fa";

const supabase = createClient();

export default function LacakPesananPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      // 1. Ambil user yang sedang login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Ambil data orders milik user beserta nama kantinnya
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          canteens (nama, lokasi),
          order_items (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setOrders(data);
      }
      setIsLoading(false);
    };

    fetchOrders();
  }, [router]);

  // Fungsi helper warna status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'diterima':
        return <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaClock /> Menunggu Diproses</span>;
      case 'diproses':
        return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaSpinner className="animate-spin" /> Sedang Dimasak</span>;
      case 'siap':
        return <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FaCheckCircle /> Siap Diambil</span>;
      case 'selesai':
        return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">Selesai</span>;
      default:
        return <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">Dibatalkan</span>;
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            aria-label="Kembali"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <div className="text-xl font-bold text-emerald-600">Lacak Pesanan Saya</div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-gray-500">Memuat riwayat pesanan...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <FaReceipt className="mx-auto text-4xl text-gray-300 mb-3" />
            <h3 className="font-bold text-gray-700 text-lg">Belum Ada Pesanan</h3>
            <p className="text-gray-400 text-sm mt-1">Kamu belum pernah melakukan transaksi pesanan di kantin manapun.</p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20"
            >
              Mulai Pesan Makanan
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kode Pesanan</p>
                  <p className="text-base font-extrabold text-gray-800">{order.kode_pesanan}</p>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Info Kantin */}
              <div>
                <h3 className="font-bold text-emerald-600 text-base">{order.canteens?.nama || "Kantin"}</h3>
                <p className="text-xs text-gray-400">{order.canteens?.lokasi}</p>
              </div>

              {/* Daftar Menu yang Dipesan */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Rincian Item</p>
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 font-medium">{item.jumlah}x {item.nama_menu}</span>
                    <span className="text-gray-600 font-semibold">Rp {(item.harga_satuan * item.jumlah).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              {/* Total & Bukti Bayar */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs text-gray-400">Total Pembayaran ({order.metode_bayar.toUpperCase()})</p>
                  <p className="text-lg font-extrabold text-emerald-600">Rp {order.total.toLocaleString("id-ID")}</p>
                </div>
                {order.payment_proof_url && (
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    Lihat Bukti Transfer
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}