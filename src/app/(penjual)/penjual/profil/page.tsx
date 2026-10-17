"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ShoppingBag, MapPin, Camera } from "react-feather";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const sb = createClient();
// Menggunakan bucket menu-images agar tidak perlu repot setting RLS bucket baru lagi
const BUCKET = "menu-images"; 
const BATAS_GAMBAR = 5 * 1024 * 1024;

type FormKantin = {
  nama: string;
  lokasi: string;
};

export default function ProfilPenjualPage() {
  const [canteenId, setCanteenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormKantin>({ nama: "", lokasi: "" });
  const [gambar, setGambar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [oldGambarUrl, setOldGambarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState("");
  const [jenisPesan, setJenisPesan] = useState<"sukses" | "error">("sukses");

  const tampilkanPesan = (teks: string, jenis: "sukses" | "error" = "sukses") => {
    setPesan(teks);
    setJenisPesan(jenis);
    setTimeout(() => setPesan(""), 5000);
  };

  const loadProfil = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await sb.auth.getUser();
      if (authErr || !user) throw new Error("Gagal memuat sesi pengguna.");

      const { data, error } = await sb
        .from("canteens")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        setCanteenId(data.id);
        setForm({ nama: data.nama || "", lokasi: data.lokasi || "" });
        setPreview(data.gambar_url || "");
        setOldGambarUrl(data.gambar_url);
      }
    } catch (err: any) {
      tampilkanPesan(err.message || "Gagal memuat profil kantin.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfil();
  }, [loadProfil]);

  useEffect(() => {
    if (!gambar) {
      if (!oldGambarUrl) setPreview("");
      return;
    }
    const url = URL.createObjectURL(gambar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [gambar, oldGambarUrl]);

  function ubahForm(e: ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function pilihGambar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      tampilkanPesan("Format gambar harus JPG, PNG, atau WebP.", "error");
      return;
    }
    if (file.size > BATAS_GAMBAR) {
      tampilkanPesan("Ukuran gambar maksimal 5 MB.", "error");
      return;
    }
    setGambar(file);
  }

  async function simpanProfil(e: FormEvent) {
    e.preventDefault();
    if (!canteenId) return;

    setMenyimpan(true);
    setPesan("");

    try {
      let urlGambar = oldGambarUrl;

      // Upload gambar baru jika penjual memilih file baru
      if (gambar) {
        const ekstensi = gambar.name.split(".").pop()?.toLowerCase() || "jpg";
        const pathGambar = `kantin/${canteenId}/${crypto.randomUUID()}.${ekstensi}`;

        const { error: uploadError } = await sb.storage
          .from(BUCKET)
          .upload(pathGambar, gambar, { contentType: gambar.type, upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicData } = sb.storage.from(BUCKET).getPublicUrl(pathGambar);
        urlGambar = publicData.publicUrl;
      }

      const { error: updateError } = await sb
        .from("canteens")
        .update({
          nama: form.nama,
          lokasi: form.lokasi,
          gambar_url: urlGambar,
        })
        .eq("id", canteenId);

      if (updateError) throw updateError;
      
      tampilkanPesan("Profil kantin berhasil diperbarui!", "sukses");
      setOldGambarUrl(urlGambar);
      setGambar(null);
    } catch (err: any) {
      tampilkanPesan(err.message || "Gagal menyimpan profil.", "error");
    } finally {
      setMenyimpan(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat data profil kantin...</div>;

  return (
    <main className="min-h-screen bg-emerald-50/30 px-4 py-8 text-gray-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">Profil Kantin</h1>
            <p className="mt-1 text-sm text-gray-500">Kelola informasi dan foto kantin Anda.</p>
          </div>
          <Link href="/penjual" className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm">
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Link>
        </div>

        {pesan && (
          <div className={`mb-6 rounded-2xl border p-4 text-sm font-medium ${jenisPesan === "sukses" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {pesan}
          </div>
        )}

        <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
          <form onSubmit={simpanProfil} className="space-y-6">
            
            {/* Foto Kantin */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
                {preview ? (
                  <Image src={preview} alt="Preview Kantin" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
                    <ShoppingBag size={32} className="mb-2 opacity-50" />
                    <span className="text-[10px] font-semibold uppercase">Tanpa Foto</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="mb-2 block text-sm font-bold text-gray-700">Foto Kantin</label>
                <p className="mb-3 text-xs text-gray-500">Format JPG, PNG, atau WebP. Maksimal 5MB. Foto ini akan tampil di halaman depan pembeli.</p>
                <div className="relative">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pilihGambar} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer">
                    <Camera size={16} /> Pilih Foto Baru
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-gray-100">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Nama Kantin</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <ShoppingBag size={18} />
                  </div>
                  <input
                    name="nama"
                    value={form.nama}
                    onChange={ubahForm}
                    required
                    placeholder="Contoh: Kantin Bang Jo"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Lokasi / Keterangan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <MapPin size={18} />
                  </div>
                  <input
                    name="lokasi"
                    value={form.lokasi}
                    onChange={ubahForm}
                    placeholder="Contoh: Pojok Kanan Depan"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={menyimpan}
                className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {menyimpan ? "Menyimpan..." : "Simpan Profil"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </main>
  );
}