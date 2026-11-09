"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  FileCheck,
  FileClock,
  Trophy,
  Calculator,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

type DashboardStats = {
  totalMahasiswa: number;
  totalDokumen: number;
  dokumenMenunggu: number;
  dokumenTervalidasi: number;
  totalPenilaian: number;
  hasilPublikasi: number;
};

const initialStats: DashboardStats = {
  totalMahasiswa: 0,
  totalDokumen: 0,
  dokumenMenunggu: 0,
  dokumenTervalidasi: 0,
  totalPenilaian: 0,
  hasilPublikasi: 0,
};

export default function AdminPage() {
  const supabase = createClient();

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboardData() {
    setLoading(true);
    setError("");

    try {
      const [
        mahasiswa,
        dokumen,
        menunggu,
        tervalidasi,
        penilaian,
        publikasi,
      ] = await Promise.all([
        supabase
          .from("login")
          .select("*", { count: "exact", head: true })
          .eq("role", "mahasiswa"),

        supabase
          .from("dokumen_bukti")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("dokumen_bukti")
          .select("*", { count: "exact", head: true })
          .eq("status_verifikasi", "menunggu"),

        supabase
          .from("dokumen_bukti")
          .select("*", { count: "exact", head: true })
          .eq("status_verifikasi", "tervalidasi"),

        supabase
          .from("hasil_penilaian")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("hasil_penilaian")
          .select("*", { count: "exact", head: true })
          .eq("status_publikasi", true),
      ]);

      const results = [
        mahasiswa,
        dokumen,
        menunggu,
        tervalidasi,
        penilaian,
        publikasi,
      ];

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw failed.error;
      }

      setStats({
        totalMahasiswa: mahasiswa.count ?? 0,
        totalDokumen: dokumen.count ?? 0,
        dokumenMenunggu: menunggu.count ?? 0,
        dokumenTervalidasi: tervalidasi.count ?? 0,
        totalPenilaian: penilaian.count ?? 0,
        hasilPublikasi: publikasi.count ?? 0,
      });
    } catch (err) {
      console.error("Gagal mengambil data dashboard:", err);
      setError(
        "Data dashboard gagal dimuat. Periksa koneksi Supabase dan kebijakan akses tabel."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const cards = [
    {
      title: "Total Mahasiswa",
      value: stats.totalMahasiswa,
      description: "Mahasiswa terdaftar",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Total Dokumen",
      value: stats.totalDokumen,
      description: "Dokumen yang diunggah",
      icon: ClipboardList,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Menunggu Verifikasi",
      value: stats.dokumenMenunggu,
      description: "Dokumen perlu diperiksa",
      icon: FileClock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Dokumen Tervalidasi",
      value: stats.dokumenTervalidasi,
      description: "Dokumen telah diverifikasi",
      icon: FileCheck,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Total Penilaian",
      value: stats.totalPenilaian,
      description: "Data penilaian SAW",
      icon: Calculator,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Hasil Dipublikasikan",
      value: stats.hasilPublikasi,
      description: "Hasil ranking dipublikasikan",
      icon: Trophy,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  const verificationProgress =
    stats.totalDokumen > 0
      ? Math.round(
          (stats.dokumenTervalidasi / stats.totalDokumen) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-sm font-medium text-emerald-600">
            APRESIA / ADMIN
          </p>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            Dashboard Admin
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Ringkasan pengelolaan dan penilaian prestasi mahasiswa.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh Data
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Terjadi kesalahan</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Statistik */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>

                  <h2 className="mt-3 text-3xl font-bold text-slate-800">
                    {loading ? "..." : card.value.toLocaleString("id-ID")}
                  </h2>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.description}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${card.color}`}>
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ringkasan Verifikasi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">
                Progres Verifikasi Dokumen
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Persentase dokumen yang telah tervalidasi.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <FileCheck size={22} />
            </div>
          </div>

          <div className="mb-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-600">
              {loading ? "..." : `${verificationProgress}%`}
            </span>
            <span className="text-sm text-slate-500">
              {stats.dokumenTervalidasi} dari {stats.totalDokumen} dokumen
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${verificationProgress}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs text-amber-700">
                Menunggu Verifikasi
              </p>
              <p className="mt-1 text-xl font-bold text-amber-700">
                {loading ? "..." : stats.dokumenMenunggu}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">
                Telah Tervalidasi
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                {loading ? "..." : stats.dokumenTervalidasi}
              </p>
            </div>
          </div>
        </section>

        {/* Ringkasan SAW */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">
                Ringkasan Perhitungan SAW
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Status penilaian dan publikasi hasil.
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Calculator size={22} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-sm text-slate-500">
                  Data Penilaian
                </p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {loading ? "..." : stats.totalPenilaian}
                </p>
              </div>
              <ClipboardList className="text-indigo-500" size={25} />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-sm text-slate-500">
                  Hasil Dipublikasikan
                </p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {loading ? "..." : stats.hasilPublikasi}
                </p>
              </div>
              <Trophy className="text-amber-500" size={25} />
            </div>

            <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-700">
              Perhitungan SAW dilakukan berdasarkan data mahasiswa
              yang telah melalui proses verifikasi dan validasi admin.
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row">
        <p>APRESIA - Sistem Pendukung Keputusan Penghargaan Mahasiswa</p>
        <p>Panel Administrator</p>
      </div>
    </main>
  );
}