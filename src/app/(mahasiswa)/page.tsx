"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function HomePage() {
  const [canteens, setCanteens] = useState<any[]>([]);
  const [userName, setUserName] = useState("Guest");
  const [userRole, setUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Ambil data user
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

      // 2. Ambil daftar kantin
      const { data: dbCanteens, error } = await supabase
        .from("canteens")
        .select("id, nama, lokasi");

      if (dbCanteens) {
        setCanteens(dbCanteens);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-emerald-600">AntriKantin</div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-700 font-medium">
              {userName} {userRole && `(${userRole.toLowerCase()})`}
            </div>
            <button className="text-gray-700 hover:text-gray-900 font-medium text-sm">
              Keluar
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
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-2xl mb-4 group-hover:scale-105 transition-transform">
                    {canteen.nama.charAt(0)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                    {canteen.nama}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">{canteen.lokasi}</p>
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
