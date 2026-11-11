"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const routes = {
  akademik: "/mahasiswa/data_akademik",
  portofolio: "/mahasiswa/portofolio_prestasi",
  dokumen: "/mahasiswa/dokumen",
  pengumuman: "/mahasiswa/pengumuman",
};

type Profile = {
  nama_lengkap: string | null;
  nim: string | null;
  email: string | null;
  fakultas: string | null;
  prodi: string | null;
  semester: number | null;
};

type Dashboard = {
  profile: Profile;
  akademik: number;
  portofolio: number;
  dokumen: number;
  tervalidasi: number;
  menunggu: number;
  perluRevisi: number;
  ditolak: number;
  hasil: {
    nilai_preferensi: number | null;
    peringkat: number | null;
  } | null;
};

const panel = "rounded-xl border border-stone-200 bg-white";
const primaryLink =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800";
const textLink =
  "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline";

function getNextAction(data: Dashboard) {
  if (data.perluRevisi + data.ditolak > 0) {
    return {
      title: "Ada dokumen yang perlu ditinjau",
      description:
        "Buka Dokumen Bukti untuk melihat status dan catatan verifikasi dari admin.",
      label: "Periksa dokumen",
      href: routes.dokumen,
    };
  }

  if (data.hasil) {
    return {
      title: "Hasil seleksi sudah terbit",
      description: "Lihat peringkat dan rincian nilai SAW di halaman Pengumuman.",
      label: "Lihat hasil seleksi",
      href: routes.pengumuman,
    };
  }

  if (data.akademik === 0) {
    return {
      title: "Isi data akademik",
      description: "Masukkan IPK dan nilai Bahasa Inggris untuk melengkapi data penilaian.",
      label: "Buka data akademik",
      href: routes.akademik,
    };
  }

  if (data.portofolio === 0) {
    return {
      title: "Tambahkan portofolio prestasi",
      description: "Catat kegiatan atau prestasi yang akan kamu sertakan dalam seleksi.",
      label: "Buka portofolio",
      href: routes.portofolio,
    };
  }

  if (data.dokumen === 0) {
    return {
      title: "Unggah dokumen bukti",
      description: "Pilih salah satu portofolio, lalu unggah dokumen pendukungnya.",
      label: "Buka dokumen bukti",
      href: routes.dokumen,
    };
  }

  if (data.menunggu > 0) {
    return {
      title: "Dokumen menunggu verifikasi",
      description: `${data.menunggu} dokumen masih menunggu pemeriksaan admin.`,
      label: "Lihat status dokumen",
      href: routes.dokumen,
    };
  }

  return {
    title: "Ketiga bagian data sudah terisi",
    description: "Hasil seleksi akan tampil di halaman Pengumuman setelah dipublikasikan.",
    label: "Buka pengumuman",
    href: routes.pengumuman,
  };
}

export default function MahasiswaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      }

      const id = user.id;
      const countRows = (table: "data_akademik" | "portofolio" | "dokumen_bukti") =>
        supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("mahasiswa_id", id);

      const [profile, akademik, portofolio, dokumen, valid, menunggu, revisi, ditolak, hasil] =
        await Promise.all([
          supabase
            .from("login")
            .select("nama_lengkap, nim, email, fakultas, prodi, semester")
            .eq("id", id)
            .eq("role", "mahasiswa")
            .single(),
          countRows("data_akademik"),
          countRows("portofolio"),
          countRows("dokumen_bukti"),
          countRows("dokumen_bukti").eq("status_verifikasi", "tervalidasi"),
          countRows("dokumen_bukti").eq("status_verifikasi", "menunggu"),
          countRows("dokumen_bukti").eq("status_verifikasi", "perlu_revisi"),
          countRows("dokumen_bukti").eq("status_verifikasi", "ditolak"),
          supabase
            .from("hasil_penilaian")
            .select("nilai_preferensi, peringkat")
            .eq("mahasiswa_id", id)
            .eq("status_publikasi", true)
            .maybeSingle(),
        ]);

      const failed = [profile, akademik, portofolio, dokumen, valid, menunggu, revisi, ditolak, hasil]
        .find((result) => result.error);

      if (failed?.error) throw failed.error;
      if (!profile.data) throw new Error("Profil mahasiswa tidak ditemukan.");

      setDashboard({
        profile: profile.data,
        akademik: akademik.count ?? 0,
        portofolio: portofolio.count ?? 0,
        dokumen: dokumen.count ?? 0,
        tervalidasi: valid.count ?? 0,
        menunggu: menunggu.count ?? 0,
        perluRevisi: revisi.count ?? 0,
        ditolak: ditolak.count ?? 0,
        hasil: hasil.data,
      });
    } catch (err) {
      console.error("Gagal memuat dashboard mahasiswa", err);
      setError(
        err instanceof Error ? err.message : "Data gagal dimuat. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (!dashboard) {
    return (
      <main className="py-8">
        <h1 className="text-3xl">Dashboard mahasiswa</h1>
        {loading ? (
          <p role="status" className="mt-4 text-stone-600">
            Memuat dashboard…
          </p>
        ) : (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p role="alert" className="flex items-center gap-2 text-sm text-red-800">
              <AlertCircle size={18} aria-hidden="true" />
              {error || "Dashboard gagal dimuat."}
            </p>
            <button type="button" onClick={fetchDashboard} className={textLink}>
              Coba lagi
            </button>
          </div>
        )}
      </main>
    );
  }

  const { profile, hasil } = dashboard;
  const action = getNextAction(dashboard);

  const checklist = [
    {
      label: "Data akademik",
      detail: dashboard.akademik > 0 ? "IPK dan data akademik tersimpan" : "Belum ada data",
      complete: dashboard.akademik > 0,
      href: routes.akademik,
    },
    {
      label: "Portofolio prestasi",
      detail: `${dashboard.portofolio} entri tersimpan`,
      complete: dashboard.portofolio > 0,
      href: routes.portofolio,
    },
    {
      label: "Dokumen bukti",
      detail: `${dashboard.dokumen} dokumen diunggah`,
      complete: dashboard.dokumen > 0,
      href: routes.dokumen,
    },
  ];

  const completed = checklist.filter((item) => item.complete).length;

  const documentStatus = [
    { label: "Tervalidasi", count: dashboard.tervalidasi },
    { label: "Menunggu", count: dashboard.menunggu },
    { label: "Perlu revisi", count: dashboard.perluRevisi },
    { label: "Ditolak", count: dashboard.ditolak },
  ];

  return (
    <main className="space-y-6 py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl">Dashboard mahasiswa</h1>
          <p className="mt-2 text-sm text-stone-700">
            {profile.nama_lengkap || "Mahasiswa"}
            {profile.prodi ? ` · ${profile.prodi}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={loading ? "animate-spin motion-reduce:animate-none" : ""}
          />
          {loading ? "Memuat…" : "Muat ulang"}
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section
        aria-labelledby="next-action"
        className="rounded-xl border border-amber-200 border-s-4 border-s-amber-500 bg-[#fff9ea] p-5 sm:p-6"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 id="next-action" className="text-xl font-semibold text-emerald-950">
              {action.title}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-stone-700">
              {action.description}
            </p>
          </div>

          <Link href={action.href} className={`${primaryLink} shrink-0`}>
            {action.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="checklist-title" className={panel}>
          <header className="p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="checklist-title" className="text-lg font-semibold text-emerald-950">
                Kelengkapan data
              </h2>
              <span className="text-sm font-semibold text-emerald-800">
                {completed} dari {checklist.length} bagian terisi
              </span>
            </div>

            <progress
              aria-labelledby="checklist-title"
              value={completed}
              max={checklist.length}
              className="mt-3 block h-2 w-full overflow-hidden rounded-full bg-stone-100 accent-emerald-800 [&::-moz-progress-bar]:bg-emerald-800 [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:bg-emerald-800"
            />
          </header>

          <ul className="divide-y divide-stone-200 border-t border-stone-200">
            {checklist.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-5 py-4 hover:bg-stone-50 sm:px-6"
                >
                  {item.complete ? (
                    <CheckCircle2 size={20} aria-hidden="true" className="shrink-0 text-emerald-700" />
                  ) : (
                    <Circle size={20} aria-hidden="true" className="shrink-0 text-stone-400" />
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-900">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-stone-600">
                      {item.detail}
                    </span>
                  </span>

                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-emerald-800 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="documents-title" className={`${panel} p-5 sm:p-6`}>
          <h2 id="documents-title" className="text-lg font-semibold text-emerald-950">
            Verifikasi dokumen
          </h2>

          {dashboard.dokumen === 0 ? (
            <p className="mt-3 text-sm text-stone-600">Belum ada dokumen yang diunggah.</p>
          ) : (
            <dl className="mt-3 divide-y divide-stone-200">
              {documentStatus.map(({ label, count }) => (
                <div key={label} className="flex justify-between gap-3 py-2.5 text-sm">
                  <dt className="text-stone-700">{label}</dt>
                  <dd className="font-semibold tabular-nums text-emerald-950">{count}</dd>
                </div>
              ))}
            </dl>
          )}

          <Link href={routes.dokumen} className={`${textLink} mt-2`}>
            Buka dokumen bukti
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <section aria-labelledby="result-title" className={`${panel} p-5 sm:p-6`}>
        <h2 id="result-title" className="text-lg font-semibold text-emerald-950">
          Hasil seleksi
        </h2>

        {hasil ? (
          <dl className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt className="text-sm text-stone-600">Peringkat</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
                {hasil.peringkat ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-600">Nilai preferensi SAW</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
                {hasil.nilai_preferensi === null
                  ? "—"
                  : Number(hasil.nilai_preferensi).toLocaleString("id-ID", {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Belum ada hasil yang dipublikasikan.</p>
        )}

        <Link href={routes.pengumuman} className={`${textLink} mt-2`}>
          {hasil ? "Lihat rincian hasil" : "Buka pengumuman"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      <details className={`${panel} p-5 sm:p-6`}>
        <summary className="cursor-pointer font-semibold text-emerald-950">
          Detail profil mahasiswa
        </summary>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "NIM", value: profile.nim },
            { label: "Fakultas", value: profile.fakultas },
            { label: "Semester", value: profile.semester },
            { label: "Email", value: profile.email },
          ].map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-stone-600">{label}</dt>
              <dd className="mt-1 break-words font-medium text-stone-900">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </details>
    </main>
  );
}