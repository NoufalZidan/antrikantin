"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function HomePage() {
  const router = useRouter();
  const [canteens, setCanteens] = useState<any[]>([]);
  const [userName, setUserName] = useState("Memuat...");
  const [userRole, setUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Ambil data user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // 2. PROTEKSI: Jika user tidak ada (belum login/register), lempar ke register
      if (!user || authError) {
        router.replace("/register");
        return; // Hentikan eksekusi kode di bawahnya
      }

      // 3. Jika user ada, lanjut ambil data profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.nama || user.email?.split("@")[0] || "Pengguna");
        setUserRole(profile.role === "penjual" ? "Penjual" : "Mahasiswa");
      }

      // 4. Ambil daftar kantin
      const { data: dbCanteens } = await supabase
        .from("canteens")
        .select("id, nama, lokasi, gambar_url");

      if (dbCanteens) {
        setCanteens(dbCanteens);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
    }
  };

  // Jika masih loading dan belum ada data kantin, tampilkan layar putih sebentar
  // agar form kantin tidak sempat terlihat oleh user yang belum login
  if (isLoading && canteens.length === 0) {
    return (
      <div className="min-h-screen bg-emerald-50/30 flex items-center justify-center text-emerald-600 font-bold">
        Memeriksa sesi...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img
            src="/logo.png"
            alt="JOiS"
            className="h-9 w-auto object-contain"
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/profil")}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors hidden sm:block"
            >
              Profil
            </button>
            <button
              onClick={() => router.push("/pesanan")}
              className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors"
            >
              Lacak Pesanan
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-600 font-medium text-sm transition-colors ml-2"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white pt-10 pb-20 px-4 text-center relative">
        <h1 className="text-3xl font-bold mb-2">Pilih Kantin</h1>
        <p className="text-emerald-100 text-sm">
          Mau makan apa hari ini? Pilih kantin untuk melihat menu dan memesan.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Kantin Tersedia
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {canteens.map((canteen) => (
            <Link key={canteen.id} href={`/kantin/${canteen.id}`}>
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col">
                <div className="w-full h-36 bg-emerald-100 relative overflow-hidden">
                  {canteen.gambar_url ? (
                    <img
                      src={canteen.gambar_url}
                      alt={canteen.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-4xl text-emerald-600">
                      {canteen.nama.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col justify-between flex-1">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                    {canteen.nama}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">{canteen.lokasi}</p>
                </div>
              </div>
            </Link>
          ))}

          {canteens.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              Belum ada kantin yang terdaftar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
