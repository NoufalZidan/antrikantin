"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ArrowLeft } from "react-feather";
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
  // Client Supabase stabil, tidak dibuat ulang setiap render.
  const [supabase] = useState(() => createClient());

  const [menus, setMenus] = useState<Menu[]>([]);
  const [canteenId, setCanteenId] = useState<string | number | null>(null);

  const [form, setForm] = useState<FormMenu>(FORM_AWAL);
  const [gambar, setGambar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menghapus, setMenghapus] = useState<string | number | null>(null);

  const [pesan, setPesan] = useState("");
  const [jenisPesan, setJenisPesan] = useState<"sukses" | "error">("sukses");

  const tampilkanPesan = (
    teks: string,
    jenis: "sukses" | "error" = "sukses"
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
        tampilkanPesan(
          "Sesi login tidak ditemukan. Silakan login kembali.",
          "error"
        );
        setMenus([]);
        setCanteenId(null);
        return;
      }

      // Mengambil kantin yang dimiliki oleh akun penjual.
      const { data: kantin, error: kantinError } = await supabase
        .from("canteens")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (kantinError) throw kantinError;

      if (!kantin) {
        setCanteenId(null);
        setMenus([]);
        tampilkanPesan(
          "Kantin untuk akun ini belum ditemukan. Periksa data canteens dan owner_id.",
          "error"
        );
        return;
      }

      setCanteenId(kantin.id);

      const { data, error: menuError } = await supabase
        .from("menus")
        .select(
          "id, nama, deskripsi, harga, stok, tersedia, gambar_url, canteen_id"
        )
        .eq("canteen_id", kantin.id)
        .order("id", { ascending: false });

      if (menuError) throw menuError;

      setMenus((data ?? []) as Menu[]);
    } catch (error) {
      console.error("Gagal mengambil menu:", error);
      tampilkanPesan(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data menu.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void ambilMenu();
  }, [ambilMenu]);

  // Membuat dan membersihkan preview gambar.
  useEffect(() => {
    if (!gambar) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(gambar);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [gambar]);

  function ubahForm(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((sebelumnya) => ({
      ...sebelumnya,
      [name]: value,
    }));
  }

  function pilihGambar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      setGambar(null);
      return;
    }

    const tipeDiizinkan = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tipeDiizinkan.includes(file.type)) {
      tampilkanPesan(
        "Format gambar harus JPG, PNG, atau WebP.",
        "error"
      );
      e.target.value = "";
      setGambar(null);
      return;
    }

    if (file.size > BATAS_GAMBAR) {
      tampilkanPesan("Ukuran gambar maksimal 5 MB.", "error");
      e.target.value = "";
      setGambar(null);
      return;
    }

    setGambar(file);
    setPesan("");
  }

  async function tambahMenu(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canteenId) {
      tampilkanPesan("Data kantin tidak ditemukan.", "error");
      return;
    }

    const nama = form.nama.trim();
    const deskripsi = form.deskripsi.trim();
    const harga = Number(form.harga);
    const stok = Number(form.stok);

    if (!nama) {
      tampilkanPesan("Nama menu wajib diisi.", "error");
      return;
    }

    if (
      form.harga.trim() === "" ||
      !Number.isFinite(harga) ||
      harga <= 0
    ) {
      tampilkanPesan("Harga harus berupa angka lebih dari 0.", "error");
      return;
    }

    if (
      form.stok.trim() === "" ||
      !Number.isInteger(stok) ||
      stok < 0
    ) {
      tampilkanPesan("Stok harus berupa bilangan bulat minimal 0.", "error");
      return;
    }

    setMenyimpan(true);
    setPesan("");

    let pathGambar: string | null = null;
    let urlGambar: string | null = null;

    try {
      // Upload gambar ke Supabase Storage bila dipilih.
      if (gambar) {
        const ekstensi = gambar.name.split(".").pop()?.toLowerCase();

        const ekstensiAman =
          ekstensi && ["jpg", "jpeg", "png", "webp"].includes(ekstensi)
            ? ekstensi
            : "jpg";

        pathGambar = `${canteenId}/${crypto.randomUUID()}.${ekstensiAman}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(pathGambar, gambar, {
            contentType: gambar.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(pathGambar);

        urlGambar = publicData.publicUrl;
      }

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

      setForm(FORM_AWAL);
      setGambar(null);

      const inputGambar = document.getElementById(
        "gambar-menu"
      ) as HTMLInputElement | null;

      if (inputGambar) inputGambar.value = "";

      tampilkanPesan("Menu berhasil ditambahkan.");
      await ambilMenu();
    } catch (error) {
      console.error("Gagal menambahkan menu:", error);

      // Jika insert gagal setelah upload, hapus file yang terlanjur diunggah.
      if (pathGambar) {
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove([pathGambar]);

        if (cleanupError) {
          console.error("Gagal membersihkan gambar:", cleanupError);
        }
      }

      tampilkanPesan(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan menu. Periksa konfigurasi Supabase.",
        "error"
      );
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapusMenu(menu: Menu) {
    const yakin = window.confirm(
      `Yakin ingin menghapus menu "${menu.nama}"?`
    );

    if (!yakin) return;

    setMenghapus(menu.id);
    setPesan("");

    try {
      const { error: deleteError } = await supabase
        .from("menus")
        .delete()
        .eq("id", menu.id)
        .eq("canteen_id", menu.canteen_id);

      if (deleteError) throw deleteError;

      // Hapus gambar hanya setelah penghapusan data menu berhasil.
      if (menu.gambar_url) {
        const { data: fileData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl("");

        const prefix = `${fileData.publicUrl}`;

        if (menu.gambar_url.startsWith(prefix)) {
          const path = menu.gambar_url.slice(prefix.length);

          if (path) {
            const { error: storageError } = await supabase.storage
              .from(BUCKET)
              .remove([decodeURIComponent(path)]);

            if (storageError) {
              console.error("Gagal menghapus gambar:", storageError);
            }
          }
        }
      }

      setMenus((sebelumnya) =>
        sebelumnya.filter((item) => item.id !== menu.id)
      );

      tampilkanPesan("Menu berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus menu:", error);

      tampilkanPesan(
        error instanceof Error
          ? error.message
          : "Gagal menghapus menu. Menu mungkin masih digunakan dalam pesanan.",
        "error"
      );
    } finally {
      setMenghapus(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Dashboard Penjual
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Kelola Menu Kantin
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Tambahkan menu, atur stok, dan tampilkan foto makanan.
            </p>
          </div>

          <div className="mb-6">
  <Link
    href="/penjual"
    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-100"
  >
    <ArrowLeft size={18} />
    Kembali ke Dashboard
  </Link>
</div>
        </div>

        {pesan && (
          <div
            role="status"
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              jenisPesan === "sukses"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {pesan}
          </div>
        )}

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-6 text-xl font-bold">Tambah Menu Baru</h2>

          <form onSubmit={tambahMenu} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="nama"
                  className="mb-2 block text-sm font-medium"
                >
                  Nama menu
                </label>

                <input
                  id="nama"
                  name="nama"
                  value={form.nama}
                  onChange={ubahForm}
                  maxLength={100}
                  required
                  placeholder="Contoh: Nasi Ayam Geprek"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="harga"
                  className="mb-2 block text-sm font-medium"
                >
                  Harga (Rp)
                </label>

                <input
                  id="harga"
                  name="harga"
                  type="number"
                  min="1"
                  step="1"
                  value={form.harga}
                  onChange={ubahForm}
                  required
                  placeholder="Contoh: 15000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="stok"
                  className="mb-2 block text-sm font-medium"
                >
                  Stok
                </label>

                <input
                  id="stok"
                  name="stok"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stok}
                  onChange={ubahForm}
                  required
                  placeholder="Contoh: 20"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="gambar-menu"
                  className="mb-2 block text-sm font-medium"
                >
                  Foto menu (opsional)
                </label>

                <input
                  id="gambar-menu"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={pilihGambar}
                  className="block w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-semibold file:text-emerald-700"
                />

                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG, WebP. Maksimal 5 MB.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="deskripsi"
                className="mb-2 block text-sm font-medium"
              >
                Deskripsi
              </label>

              <textarea
                id="deskripsi"
                name="deskripsi"
                value={form.deskripsi}
                onChange={ubahForm}
                rows={3}
                maxLength={1000}
                placeholder="Deskripsi singkat makanan..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {preview && (
              <div>
                <p className="mb-2 text-sm font-medium">Preview gambar</p>

                <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-xl border border-slate-200">
                  <Image
                    src={preview}
                    alt="Preview menu"
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
              disabled={menyimpan || loading || !canteenId}
              className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {menyimpan ? "Menyimpan..." : "+ Tambahkan Menu"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Daftar Menu</h2>
              <p className="mt-1 text-sm text-slate-500">
                {menus.length} menu terdaftar
              </p>
            </div>

            <button
              type="button"
              onClick={() => void ambilMenu()}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? "Memuat..." : "↻ Muat ulang"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Memuat daftar menu...
            </div>
          ) : menus.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-semibold">Belum ada menu.</p>
              <p className="mt-2 text-sm text-slate-500">
                Tambahkan menu pertama melalui formulir di atas.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {menus.map((menu) => (
                <article
                  key={menu.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-48 bg-slate-100">
                    {menu.gambar_url ? (
                      <Image
                        src={menu.gambar_url}
                        alt={menu.nama}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Belum ada foto
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="font-bold">{menu.nama}</h3>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          menu.tersedia && menu.stok > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {menu.tersedia && menu.stok > 0
                          ? "Tersedia"
                          : "Habis"}
                      </span>
                    </div>

                    <p className="text-lg font-bold text-emerald-700">
                      {formatRupiah(Number(menu.harga))}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Stok: {menu.stok}
                    </p>

                    {menu.deskripsi && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {menu.deskripsi}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void hapusMenu(menu)}
                      disabled={menghapus === menu.id}
                      className="mt-5 w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {menghapus === menu.id
                        ? "Menghapus..."
                        : "Hapus Menu"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}