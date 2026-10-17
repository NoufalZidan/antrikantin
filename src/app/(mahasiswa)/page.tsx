"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function HomePage() {
  const router = useRouter();
  const [canteens, setCanteens] = useState<any[]>([]);
  const [userName, setUserName] = useState("Guest");
  const [userRole, setUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Ambil data user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserName(profile.nama || user.email?.split("@")[0] || "Pengguna");
          setUserRole(profile.role === "penjual" ? "Penjual" : "Mahasiswa");
        }
      }

      // Ambil daftar kantin beserta gambar_url
      const { data: dbCanteens, error } = await supabase
        .from("canteens")
        .select("id, nama, lokasi, gambar_url");

      if (dbCanteens) {
        setCanteens(dbCanteens);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-emerald-600">AntriKantin</div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-600 font-medium text-sm transition-colors"
            >
              Keluar
            </button>
            <div className="hidden sm:block px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-700 font-medium">
              {userName} {userRole && `(${userRole.toLowerCase()})`}
            </div>
            <button
              onClick={() => router.push("/pesanan")}
              className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors"
            >
              Lacak Pesanan
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white pt-10 pb-20 px-4 text-center relative">
        <h1 className="text-3xl font-bold mb-2">Pilih Kantin</h1>
        <p className="text-emerald-100 text-sm">
          Mau makan apa hari ini? Pilih kantin untuk melihat menu dan memesan.
        </p>
      </div>

      {/* Daftar Kantin */}
      <div className="max-w-7xl mx-auto px-6 pt-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Kantin Tersedia
        </h2>

        {isLoading ? (
          <div className="text-center text-gray-500 py-10">
            Memuat data kantin...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {canteens.map((canteen) => (
              <Link key={canteen.id} href={`/kantin/${canteen.id}`}>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col">
                  
                  {/* Bagian Gambar (Memenuhi Setengah Card / Tinggi 36) */}
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

                  {/* Bagian Teks di Bawah */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                      {canteen.nama}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {canteen.lokasi}
                    </p>
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
        )}
      </div>
    </div>
  );
}