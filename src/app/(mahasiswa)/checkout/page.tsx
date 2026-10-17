"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FaArrowLeft } from "react-icons/fa6"; // Import ikon panah

interface OrderItem {
  id: number;
  name: string;
  description: string;
  price: number;
  status: "TERSEDIA" | "HABIS";
  category: string;
  sellerName: string;
  image: string;
  quantity: number;
  variant?: string;
}

interface CheckoutData {
  cart: OrderItem[];
  canteenName: string;
  canteenId: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("checkout_data");
    if (stored) {
      const data = JSON.parse(stored);
      setCheckoutData(data);
    } else {
      router.push("/");
    }
  }, [router]);

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-emerald-50/30 flex items-center justify-center">
        <p className="text-gray-500">Memuat data checkout...</p>
      </div>
    );
  }

  const { cart, canteenName } = checkoutData;
  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = cart.reduce(
    (acc, curr) => acc + curr.price * curr.quantity,
    0,
  );
  const serviceFee: number = 0;
  const total = subtotal + serviceFee;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diperbolehkan");
      return;
    }
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleConfirmPayment = async () => {
    if (!uploadedFile) {
      alert("Silakan upload bukti pembayaran terlebih dahulu");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Validasi User Login
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("Anda harus login terlebih dahulu");
        setIsProcessing(false);
        return;
      }

      // 2. Upload Bukti ke Supabase Storage (Bucket: payment_proofs)
      const fileExt = uploadedFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, uploadedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error("Gagal mengupload gambar: " + uploadError.message);
      }

      // 3. Dapatkan Public URL gambar
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment_proofs").getPublicUrl(fileName);

      // 4. Generate Kode Pesanan & Simpan ke tabel Orders
      const kodePesanan = "ORD" + Date.now().toString().slice(-8);

      // Ambil slot waktu pertama yang tersedia untuk kantin ini (sebagai solusi cepat)
      const { data: timeSlots } = await supabase
        .from("time_slots")
        .select("id")
        .eq("canteen_id", checkoutData.canteenId)
        .limit(1);

      const defaultSlotId =
        timeSlots && timeSlots.length > 0 ? timeSlots[0].id : null;
      const todayDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          canteen_id: checkoutData.canteenId,
          slot_id: defaultSlotId, // Mengisi slot_id agar tidak null
          tanggal_ambil: todayDate, // Mengisi tanggal hari ini
          status: "diterima",
          kode_pesanan: kodePesanan,
          total: total,
          metode_bayar: "qris_mock",
          payment_proof_url: publicUrl,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 5. Simpan detail keranjang ke tabel Order Items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_id: item.id,
        nama_menu: item.name + (item.variant ? ` (${item.variant})` : ""),
        jumlah: item.quantity,
        harga_satuan: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 6. Sukses & Cleanup
      // 6. Sukses & Cleanup
      alert(
        `Pembayaran berhasil dikirim!\n\nKode: ${kodePesanan}\nTotal: Rp ${total.toLocaleString("id-ID")}\n\nPesanan segera diproses oleh ${canteenName}.`,
      );

      // TAMBAHKAN BARIS INI UNTUK MENGHAPUS KERANJANG BERDASARKAN ID KANTIN:
      localStorage.removeItem(`cart_${checkoutData.canteenId}`);

      localStorage.removeItem("checkout_data");
      setIsProcessing(false);
      setShowUploadModal(false);
      router.push("/");
    } catch (error: any) {
      console.error("Checkout Error:", error);
      alert(error.message || "Terjadi kesalahan saat memproses pesanan.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header dengan Tombol Panah Kiri */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              if (confirm("Batalkan checkout dan kembali ke halaman kantin?")) {
                router.back();
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            aria-label="Kembali"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <div className="text-xl font-bold text-emerald-600">Checkout</div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Info Kantin */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Pesanan dari</h2>
          <p className="text-emerald-600 font-bold text-xl">{canteenName}</p>
        </div>

        {/* Daftar Pesanan */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Ringkasan Pesanan
          </h2>
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div
                key={`${item.id}-${item.variant}-${idx}`}
                className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    {item.variant && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {item.variant}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-gray-800 text-base truncate">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Rp {item.price.toLocaleString("id-ID")} x {item.quantity}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-emerald-600 text-lg">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Subtotal ({totalItems} item)
              </span>
              <span className="font-semibold text-gray-700">
                Rp {subtotal.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Biaya Layanan</span>
              <span className="font-semibold text-gray-700">
                {serviceFee === 0
                  ? "Gratis"
                  : `Rp ${serviceFee.toLocaleString("id-ID")}`}
              </span>
            </div>
            <div className="flex justify-between text-lg pt-3 border-t border-gray-100">
              <span className="font-bold text-gray-800">Total Pembayaran</span>
              <span className="font-extrabold text-emerald-600">
                Rp {total.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* QRIS Payment */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Metode Pembayaran
          </h2>

          <div className="border-2 border-emerald-500 bg-emerald-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 flex-shrink-0">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-base">QRIS</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scan QR dengan aplikasi e-wallet
                </p>
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>

          {/* QR Code Dummy */}
          <div className="bg-gray-50 rounded-xl p-8 flex flex-col items-center">
            <p className="text-sm font-bold text-gray-700 mb-4">
              Scan QR Code untuk membayar
            </p>
            <div className="w-64 h-64 bg-white rounded-xl border-4 border-gray-200 flex items-center justify-center mb-4">
              <div className="grid grid-cols-8 gap-1 p-4">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 ${
                      Math.random() > 0.5 ? "bg-gray-900" : "bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mb-2">
              Total Pembayaran
            </p>
            <p className="text-2xl font-extrabold text-emerald-600">
              Rp {total.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-gray-400 text-center mt-4">
              QR Code ini adalah dummy. Akan diganti dengan QR asli nanti.
            </p>
          </div>
        </div>

        {/* Tombol Konfirmasi */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="w-full py-4 rounded-2xl font-bold text-lg shadow-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-600/20 transition-all"
        >
          Konfirmasi Pembayaran
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Upload Bukti Pembayaran
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedFile(null);
                  setPreviewUrl(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
              }`}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-xl"
                  />
                  <p className="text-sm text-gray-600">{uploadedFile?.name}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-sm text-emerald-600 font-bold hover:underline"
                  >
                    Ganti Gambar
                  </button>
                </div>
              ) : (
                <>
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-gray-700 font-bold mb-2">
                    Drop foto bukti pembayaran di sini
                  </p>
                  <p className="text-sm text-gray-500">
                    atau klik untuk pilih file
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-900 font-bold mb-2">
                💡 Petunjuk Upload
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                <li>Upload screenshot bukti transfer dari aplikasi e-wallet</li>
                <li>Pastikan nominal dan waktu transfer terlihat jelas</li>
                <li>Format: JPG, PNG (maks 5MB)</li>
              </ul>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Pembayaran</span>
                <span className="font-bold text-gray-900">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Metode</span>
                <span className="font-bold text-gray-900">QRIS</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedFile(null);
                  setPreviewUrl(null);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!uploadedFile || isProcessing}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  !uploadedFile || isProcessing
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {isProcessing ? "Mengirim..." : "Kirim Bukti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
