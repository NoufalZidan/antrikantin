"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ArrowLeft, Edit2, X } from "react-feather";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Menu = {
  id: string | number;
  nama: string;
  deskripsi: string | null;
  harga: number;
  stok: number;
  tersedia: boolean;
  gambar_url: string | null;
  canteen_id: string | number;
};

type FormMenu = {
  nama: string;
  deskripsi: string;
  harga: string;
  stok: string;
};

const BUCKET = "menu-images";
const BATAS_GAMBAR = 5 * 1024 * 1024;

const FORM_AWAL: FormMenu = {
  nama: "",
  deskripsi: "",
  harga: "",
  stok: "",
};

function formatRupiah(nominal: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

export default function MenuPenjualPage() {
  const [supabase] = useState(() => createClient());

  const [menus, setMenus] = useState<Menu[]>([]);
  const [canteenId, setCanteenId] = useState<string | number | null>(null);

  const [form, setForm] = useState<FormMenu>(FORM_AWAL);
  const [gambar, setGambar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  // State untuk mode Edit
  const [editId, setEditId] = useState<string | number | null>(null);
  const [oldGambarUrl, setOldGambarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menghapus, setMenghapus] = useState<string | number | null>(null);

  const [pesan, setPesan] = useState("");
  const [jenisPesan, setJenisPesan] = useState<"sukses" | "error">("sukses");

  const tampilkanPesan = (
    teks: string,
    jenis: "sukses" | "error" = "sukses",
  ) => {
    setPesan(teks);
    setJenisPesan(jenis);
  };

  const ambilMenu = useCallback(async () => {
    setLoading(true);
    setPesan("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user) {
        tampilkanPesan("Sesi login tidak ditemukan.", "error");
        return;
      }

      const { data: kantin, error: kantinError } = await supabase
        .from("canteens")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (kantinError) throw kantinError;
      if (!kantin) {
        tampilkanPesan("Kantin belum ditemukan.", "error");
        return;
      }

      setCanteenId(kantin.id);

      const { data, error: menuError } = await supabase
        .from("menus")
        .select("*")
        .eq("canteen_id", kantin.id)
        .order("id", { ascending: false });

      if (menuError) throw menuError;
      setMenus((data ?? []) as Menu[]);
    } catch (error) {
      tampilkanPesan(
        error instanceof Error ? error.message : "Gagal mengambil data.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void ambilMenu();
  }, [ambilMenu]);

  useEffect(() => {
    if (!gambar) {
      if (!editId) setPreview("");
      return;
    }
    const url = URL.createObjectURL(gambar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [gambar, editId]);

  function ubahForm(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function pilihGambar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setGambar(null);
      return;
    }
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

  // Mulai mode Edit Menu
  function mulaiEdit(menu: Menu) {
    setEditId(menu.id);
    setForm({
      nama: menu.nama,
      deskripsi: menu.deskripsi || "",
      harga: String(menu.harga),
      stok: String(menu.stok),
    });
    setOldGambarUrl(menu.gambar_url);
    setPreview(menu.gambar_url || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Batalkan Edit
  function batalEdit() {
    setEditId(null);
    setForm(FORM_AWAL);
    setGambar(null);
    setPreview("");
    setOldGambarUrl(null);
  }

  async function simpanMenu(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canteenId) return;

    const nama = form.nama.trim();
    const deskripsi = form.deskripsi.trim();
    const harga = Number(form.harga);
    const stok = Number(form.stok);

    if (!nama || harga <= 0 || stok < 0) {
      tampilkanPesan("Periksa kembali input formulir Anda.", "error");
      return;
    }

    setMenyimpan(true);
    setPesan("");

    try {
      let urlGambar = oldGambarUrl;

      if (gambar) {
        const ekstensi = gambar.name.split(".").pop()?.toLowerCase() || "jpg";
        const pathGambar = `${canteenId}/${crypto.randomUUID()}.${ekstensi}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(pathGambar, gambar, { contentType: gambar.type });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(pathGambar);
        urlGambar = publicData.publicUrl;
      }

      if (editId) {
        // Update Menu
        const { error: updateError } = await supabase
          .from("menus")
          .update({
            nama,
            deskripsi: deskripsi || null,
            harga,
            stok,
            tersedia: stok > 0,
            gambar_url: urlGambar,
          })
          .eq("id", editId);

        if (updateError) throw updateError;
        tampilkanPesan("Menu berhasil diperbarui.");
      } else {
        // Tambah Menu Baru
        const { error: insertError } = await supabase.from("menus").insert({
          canteen_id: canteenId,
          nama,
          deskripsi: deskripsi || null,
          harga,
          stok,
          tersedia: stok > 0,
          gambar_url: urlGambar,
        });

        if (insertError) throw insertError;
        tampilkanPesan("Menu berhasil ditambahkan.");
      }

      batalEdit();
      await ambilMenu();
    } catch (error) {
      tampilkanPesan(
        error instanceof Error ? error.message : "Gagal menyimpan menu.",
        "error",
      );
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapusMenu(menu: Menu) {
    if (!window.confirm(`Yakin ingin menghapus menu "${menu.nama}"?`)) return;

    setMenghapus(menu.id);
    try {
      const { error } = await supabase.from("menus").delete().eq("id", menu.id);
      if (error) throw error;
      setMenus((prev) => prev.filter((m) => m.id !== menu.id));
      tampilkanPesan("Menu berhasil dihapus.");
    } catch (error) {
      tampilkanPesan("Gagal menghapus menu.", "error");
    } finally {
      setMenghapus(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Kelola Menu Kantin</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tambah, ubah, atau hapus menu makanan Anda.
            </p>
          </div>
          <Link
            href="/penjual"
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            <ArrowLeft size={18} /> Kembali ke Dashboard
          </Link>
        </div>

        {pesan && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${jenisPesan === "sukses" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
          >
            {pesan}
          </div>
        )}

        {/* Form Tambah / Edit */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editId ? "Edit Menu" : "Tambah Menu Baru"}
            </h2>
            {editId && (
              <button
                onClick={batalEdit}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={simpanMenu} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nama menu
                </label>
                <input
                  name="nama"
                  value={form.nama}
                  onChange={ubahForm}
                  required
                  placeholder="Contoh: Nasi Goreng"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Harga (Rp)
                </label>
                <input
                  name="harga"
                  type="number"
                  min="1"
                  value={form.harga}
                  onChange={ubahForm}
                  required
                  placeholder="Contoh: 15000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Stok</label>
                <input
                  name="stok"
                  type="number"
                  min="0"
                  value={form.stok}
                  onChange={ubahForm}
                  required
                  placeholder="Contoh: 20"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Foto menu (opsional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={pilihGambar}
                  className="block w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Deskripsi
              </label>
              <textarea
                name="deskripsi"
                value={form.deskripsi}
                onChange={ubahForm}
                rows={3}
                placeholder="Deskripsi makanan..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            {preview && (
              <div>
                <p className="mb-2 text-sm font-medium">Preview gambar</p>
                <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-xl border">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="384px"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={menyimpan}
              className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {menyimpan
                ? "Menyimpan..."
                : editId
                  ? "Simpan Perubahan"
                  : "+ Tambahkan Menu"}
            </button>
          </form>
        </section>

        {/* Daftar Menu */}
        <section>
          <h2 className="mb-5 text-xl font-bold">
            Daftar Menu ({menus.length})
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => (
              <article
                key={menu.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 bg-slate-100">
                    {menu.gambar_url ? (
                      <Image
                        src={menu.gambar_url}
                        alt={menu.nama}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Tanpa foto
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg">{menu.nama}</h3>
                    <p className="text-emerald-700 font-bold mt-1">
                      {formatRupiah(Number(menu.harga))}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Stok: {menu.stok}
                    </p>
                    {menu.deskripsi && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                        {menu.deskripsi}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-5 pt-0 flex gap-2">
                  <button
                    onClick={() => mulaiEdit(menu)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    onClick={() => void hapusMenu(menu)}
                    disabled={menghapus === menu.id}
                    className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
