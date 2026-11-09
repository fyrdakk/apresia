"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  FileText,
  Trophy,
  ClipboardCheck,
  ArrowRight,
  UserRound,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Award,
  Sparkles,
} from "lucide-react";

type Profile = {
  id: string;
  nama_lengkap: string | null;
  nim: string | null;
  email: string | null;
  fakultas: string | null;
  prodi: string | null;
  semester: number | null;
};

type DashboardData = {
  profile: Profile | null;
  akademikCount: number;
  dokumenCount: number;
  dokumenTervalidasi: number;
  dokumenMenunggu: number;
  dokumenRevisi: number;
  portofolioCount: number;
  hasil: {
    nilai_preferensi: number | null;
    peringkat: number | null;
  } | null;
};

export default function MahasiswaPage() {
  const supabase = useMemo(() => createClient(), []);

  const [dashboard, setDashboard] = useState<DashboardData>({
    profile: null,
    akademikCount: 0,
    dokumenCount: 0,
    dokumenTervalidasi: 0,
    dokumenMenunggu: 0,
    dokumenRevisi: 0,
    portofolioCount: 0,
    hasil: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Ambil akun mahasiswa yang sedang login
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      // 2. Ambil profil mahasiswa
      const { data: profile, error: profileError } = await supabase
        .from("login")
        .select(
          "id, nama_lengkap, nim, email, fakultas, prodi, semester"
        )
        .eq("id", user.id)
        .eq("role", "mahasiswa")
        .single();

      if (profileError) throw profileError;

      // 3. Ambil ringkasan data mahasiswa secara bersamaan
      const [
        akademikResult,
        dokumenResult,
        tervalidasiResult,
        menungguResult,
        revisiResult,
        portofolioResult,
        hasilResult,
      ] = await Promise.all([
        supabase
          .from("data_akademik")
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", user.id),

        supabase
          .from("dokumen_bukti")
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", user.id),

        supabase
          .from("dokumen_bukti")
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", user.id)
          .eq("status_verifikasi", "tervalidasi"),

        supabase
          .from("dokumen_bukti")
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", user.id)
          .eq("status_verifikasi", "menunggu"),

        supabase
          .from("dokumen_bukti")
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", user.id)
          .eq("status_verifikasi", "perlu_revisi"),

        supabase
          .from("portofolio")
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", user.id),

        supabase
          .from("hasil_penilaian")
          .select("nilai_preferensi, peringkat")
          .eq("mahasiswa_id", user.id)
          .eq("status_publikasi", true)
          .maybeSingle(),
      ]);

      const results = [
        akademikResult,
        dokumenResult,
        tervalidasiResult,
        menungguResult,
        revisiResult,
        portofolioResult,
        hasilResult,
      ];

      const failedQuery = results.find((result) => result.error);

      if (failedQuery?.error) {
        throw failedQuery.error;
      }

      setDashboard({
        profile: profile as Profile,
        akademikCount: akademikResult.count ?? 0,
        dokumenCount: dokumenResult.count ?? 0,
        dokumenTervalidasi: tervalidasiResult.count ?? 0,
        dokumenMenunggu: menungguResult.count ?? 0,
        dokumenRevisi: revisiResult.count ?? 0,
        portofolioCount: portofolioResult.count ?? 0,
        hasil: hasilResult.data,
      });
    } catch (err) {
      console.error("Dashboard mahasiswa error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat dashboard mahasiswa."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const profile = dashboard.profile;

  const initialNama = profile?.nama_lengkap
    ? profile.nama_lengkap
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "M";

  const totalBagian = 3;
  const bagianLengkap =
    (dashboard.akademikCount > 0 ? 1 : 0) +
    (dashboard.dokumenCount > 0 ? 1 : 0) +
    (dashboard.portofolioCount > 0 ? 1 : 0);

  const persentaseKelengkapan = Math.round(
    (bagianLengkap / totalBagian) * 100
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 size={22} className="animate-spin text-emerald-600" />
          Memuat dashboard mahasiswa...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-red-600" size={22} />
          <div className="flex-1">
            <h2 className="font-semibold text-red-800">
              Dashboard gagal dimuat
            </h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchDashboard}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <RefreshCw size={15} />
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Dashboard Mahasiswa
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Selamat Datang, {profile?.nama_lengkap?.split(" ")[0] ?? "Mahasiswa"}!
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Pantau data akademik, dokumen, portofolio, dan hasil seleksi
            prestasimu melalui APRESIA.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>

      {/* Profil Mahasiswa */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-green-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">
            {initialNama}
          </div>

          <div className="flex-1">
            <p className="text-sm text-emerald-100">
              Profil Mahasiswa
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {profile?.nama_lengkap ?? "Nama belum tersedia"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-emerald-50">
              <span className="flex items-center gap-1.5">
                <UserRound size={15} />
                NIM: {profile?.nim ?? "-"}
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={16} />
                {profile?.prodi ?? "Program studi belum tersedia"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={15} />
                Semester {profile?.semester ?? "-"}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white/10 p-4 sm:min-w-44">
            <p className="text-xs text-emerald-100">Fakultas</p>
            <p className="mt-1 font-semibold">
              {profile?.fakultas ?? "-"}
            </p>
            <p className="mt-2 text-xs text-emerald-100">
              {profile?.email ?? ""}
            </p>
          </div>
        </div>
      </section>

      {/* Statistik */}
      <section>
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Ringkasan Aktivitas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ringkasan data yang sudah kamu masukkan ke APRESIA.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Data Akademik"
            value={dashboard.akademikCount}
            description="Data akademik tersimpan"
            icon={<GraduationCap size={22} />}
            color="blue"
          />

          <StatCard
            title="Dokumen Bukti"
            value={dashboard.dokumenCount}
            description={`${dashboard.dokumenTervalidasi} dokumen tervalidasi`}
            icon={<FileText size={22} />}
            color="purple"
          />

          <StatCard
            title="Portofolio Prestasi"
            value={dashboard.portofolioCount}
            description="Portofolio tersimpan"
            icon={<Trophy size={22} />}
            color="amber"
          />

          <StatCard
            title="Dokumen Menunggu"
            value={dashboard.dokumenMenunggu}
            description="Menunggu verifikasi admin"
            icon={<Clock size={22} />}
            color="green"
          />
        </div>
      </section>

      {/* Kelengkapan Data */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-gray-900">
              Kelengkapan Data
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Lengkapi tiga bagian utama untuk mendukung proses seleksi.
            </p>
          </div>

          <span className="text-xl font-bold text-emerald-700">
            {persentaseKelengkapan}%
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${persentaseKelengkapan}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CompletionItem
            label="Data Akademik"
            complete={dashboard.akademikCount > 0}
          />
          <CompletionItem
            label="Dokumen Bukti"
            complete={dashboard.dokumenCount > 0}
          />
          <CompletionItem
            label="Portofolio Prestasi"
            complete={dashboard.portofolioCount > 0}
          />
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Persentase ini merupakan indikator pengisian tiga bagian utama,
          bukan persentase kelulusan seleksi.
        </p>
      </section>

      {/* Menu Utama */}
      <section>
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Menu Utama</h2>
          <p className="mt-1 text-sm text-gray-500">
            Kelola informasi dan dokumen pendukung prestasimu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MenuCard
            title="Data Akademik"
            description="Lengkapi informasi IPK dan nilai Bahasa Inggris."
            href="/mahasiswa/data_akademik"
            icon={<GraduationCap size={23} />}
            color="blue"
            action="Kelola Data Akademik"
          />

          <MenuCard
            title="Dokumen Bukti"
            description="Unggah dokumen pendukung dan pantau status verifikasinya."
            href="/mahasiswa/dokumen"
            icon={<FileText size={23} />}
            color="purple"
            action="Kelola Dokumen"
          />

          <MenuCard
            title="Portofolio Prestasi"
            description="Catat pengalaman organisasi, karya, kontribusi, dan prestasi."
            href="/mahasiswa/portofolio_prestasi"
            icon={<Trophy size={23} />}
            color="amber"
            action="Kelola Portofolio"
          />

          <MenuCard
            title="Pengumuman"
            description="Lihat hasil seleksi dan penjelasan hasil perhitungan SAW jika sudah dipublikasikan."
            href="/mahasiswa/pengumuman"
            icon={<ClipboardCheck size={23} />}
            color="green"
            action="Lihat Pengumuman"
          />
        </div>
      </section>

      {/* Status Dokumen */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText size={19} className="text-emerald-700" />
          <h2 className="font-bold text-gray-900">Status Verifikasi Dokumen</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatusItem
            label="Tervalidasi"
            value={dashboard.dokumenTervalidasi}
            color="green"
          />
          <StatusItem
            label="Menunggu"
            value={dashboard.dokumenMenunggu}
            color="amber"
          />
          <StatusItem
            label="Perlu Revisi"
            value={dashboard.dokumenRevisi}
            color="red"
          />
        </div>

        {dashboard.dokumenRevisi > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            Ada dokumen yang memerlukan perbaikan. Silakan periksa catatan
            admin pada halaman Dokumen Bukti.
          </div>
        )}
      </section>

      {/* Hasil Seleksi */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Award size={20} className="text-emerald-700" />
          <h2 className="font-bold text-gray-900">Hasil Seleksi</h2>
        </div>

        {dashboard.hasil ? (
          <div className="mt-4 rounded-xl bg-emerald-50 p-5">
            <p className="text-sm text-emerald-800">
              Hasil seleksimu sudah dipublikasikan.
            </p>
            <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-gray-600">Peringkat</p>
                <p className="mt-1 text-3xl font-bold text-emerald-700">
                  #{dashboard.hasil.peringkat ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nilai Preferensi SAW</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {dashboard.hasil.nilai_preferensi !== null
                    ? Number(dashboard.hasil.nilai_preferensi).toFixed(3)
                    : "-"}
                </p>
              </div>
              <Link
                href="/mahasiswa/pengumuman"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Lihat Hasil
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-gray-50 p-5">
            <div className="flex items-start gap-3">
              <Clock size={21} className="mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold text-gray-800">
                  Belum ada pengumuman hasil seleksi
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Hasil seleksi akan ditampilkan setelah admin menyelesaikan
                  penilaian dan memublikasikan hasil melalui sistem APRESIA.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Informasi */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Sparkles size={20} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold text-blue-900">
            Informasi APRESIA
          </p>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            Pastikan informasi akademik, portofolio, dan dokumen bukti yang
            kamu masukkan sudah benar. Admin akan melakukan verifikasi sebelum
            data digunakan dalam proses penilaian.
          </p>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "amber" | "green";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${styles[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function CompletionItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-3">
      {complete ? (
        <CheckCircle2 size={18} className="text-emerald-600" />
      ) : (
        <Clock size={18} className="text-amber-500" />
      )}
      <span className="text-sm text-gray-700">{label}</span>
      <span
        className={`ml-auto text-xs font-medium ${
          complete ? "text-emerald-700" : "text-amber-600"
        }`}
      >
        {complete ? "Terisi" : "Belum"}
      </span>
    </div>
  );
}

function StatusItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "amber" | "red";
}) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-lg p-4 ${styles[color]}`}>
      <p className="text-sm">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function MenuCard({
  title,
  description,
  href,
  icon,
  color,
  action,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "amber" | "green";
  action: string;
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${styles[color]}`}>{icon}</div>
        <ArrowRight
          size={19}
          className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
        />
      </div>

      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 min-h-10 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <p className="mt-4 text-sm font-semibold text-emerald-700">
        {action}
      </p>
    </Link>
  );
}
