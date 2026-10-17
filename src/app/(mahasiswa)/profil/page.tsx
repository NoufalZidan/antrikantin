"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FaArrowLeft, FaUser } from "react-icons/fa";

const supabase = createClient();

export default function ProfilPembeliPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", user.id)
        .single();

      if (profile) {
        setNama(profile.nama || "");
      }
      setIsLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSimpan = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    setPesan("");

    const { error } = await supabase
      .from("profiles")
      .update({ nama })
      .eq("id", userId);

    if (error) {
      setPesan("Gagal menyimpan nama: " + error.message);
    } else {
      setPesan("Profil berhasil diperbarui!");
      setTimeout(() => setPesan(""), 3000);
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <div className="text-xl font-bold text-emerald-600">Profil Saya</div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
              <FaUser />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-800">Data Akun</h2>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500 py-4">Memuat data...</div>
          ) : (
            <form onSubmit={handleSimpan} className="space-y-5">
              {pesan && (
                <div className={`p-4 rounded-xl text-sm font-semibold ${pesan.includes("Gagal") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {pesan}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama Anda..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email (Tidak dapat diubah)</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 outline-none cursor-not-allowed"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}