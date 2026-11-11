"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  ClipboardList,
  FileCheck,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const routes = {
  mahasiswa: "/admin/data_mahasiswa",
  verifikasi: "/admin/verifikasi_bukti",
  kriteria: "/admin/data_kriteria",
  saw: "/admin/perhitungan_saw",
  ranking: "/admin/ranking",
};

type DashboardStats = {
  mahasiswa: number;
  dokumen: number;
  menunggu: number;
  tervalidasi: number;
  penilaian: number;
  publikasi: number;
};

const formatNumber = new Intl.NumberFormat("id-ID");

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const countRows = (
        table: "login" | "dokumen_bukti" | "hasil_penilaian"
      ) => supabase.from(table).select("*", { count: "exact", head: true });

      const [mahasiswa, dokumen, menunggu, tervalidasi, penilaian, publikasi] =
        await Promise.all([
          countRows("login").eq("role", "mahasiswa"),
          countRows("dokumen_bukti"),
          countRows("dokumen_bukti").eq("status_verifikasi", "menunggu"),
          countRows("dokumen_bukti").eq("status_verifikasi", "tervalidasi"),
          countRows("hasil_penilaian"),
          countRows("hasil_penilaian").eq("status_publikasi", true),
        ]);

      const failed = [
        mahasiswa,
        dokumen,
        menunggu,
        tervalidasi,
        penilaian,
        publikasi,
      ].find((result) => result.error);

      if (failed?.error) throw failed.error;

      setStats({
        mahasiswa: mahasiswa.count ?? 0,
        dokumen: dokumen.count ?? 0,
        menunggu: menunggu.count ?? 0,
        tervalidasi: tervalidasi.count ?? 0,
        penilaian: penilaian.count ?? 0,
        publikasi: publikasi.count ?? 0,
      });
    } catch (err) {
      console.error("Gagal memuat dashboard admin:", err);
      setError("Data dashboard gagal dimuat. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summary = stats
    ? [
        {
          label: "Mahasiswa terdaftar",
          value: stats.mahasiswa,
          href: routes.mahasiswa,
        },
        {
          label: "Total dokumen bukti",
          value: stats.dokumen,
          href: routes.verifikasi,
        },
        {
          label: "Data penilaian",
          value: stats.penilaian,
          href: routes.saw,
        },
        {
          label: "Hasil dipublikasikan",
          value: stats.publikasi,
          href: routes.ranking,
        },
      ]
    : [];

  const shortcuts = [
    {
      label: "Atur kriteria SAW",
      description: "Tinjau kriteria, jenis, dan bobot penilaian.",
      href: routes.kriteria,
      icon: Settings2,
    },
    {
      label: "Buka perhitungan SAW",
      description: "Kelola nilai dan jalankan perhitungan.",
      href: routes.saw,
      icon: Calculator,
    },
    {
      label: "Buka hasil ranking",
      description: "Tinjau peringkat dan status publikasi.",
      href: routes.ranking,
      icon: ClipboardList,
    },
  ];

  return (
    <main className="space-y-6 py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">Dashboard penilaian</h1>
          <p className="mt-2 text-sm text-stone-700">
            Pantau verifikasi bukti dan hasil seleksi mahasiswa.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
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
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={18} aria-hidden="true" className="shrink-0" />
          {error}
        </p>
      )}

      {loading && !stats && (
        <p role="status" className="text-sm text-stone-700">
          Mengambil data penilaian…
        </p>
      )}

      {stats && (
        <>
          <section
            aria-labelledby="verification-title"
            className="rounded-xl border border-amber-200 border-s-4 border-s-amber-500 bg-[#fff9ea] p-5 sm:p-6"
          >
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2
                  id="verification-title"
                  className="flex items-center gap-2 font-semibold text-emerald-950"
                >
                  <FileCheck size={19} aria-hidden="true" />
                  Antrean verifikasi
                </h2>

                <p className="mt-2 text-2xl font-semibold text-stone-900">
                  {stats.menunggu > 0
                    ? `${formatNumber.format(stats.menunggu)} dokumen menunggu verifikasi`
                    : "Tidak ada dokumen dalam antrean"}
                </p>

                <p className="mt-2 text-sm text-stone-700">
                  {stats.dokumen > 0
                    ? `${formatNumber.format(stats.tervalidasi)} dari ${formatNumber.format(stats.dokumen)} dokumen sudah tervalidasi.`
                    : "Belum ada dokumen bukti yang diunggah."}
                </p>
              </div>

              <Link
                href={routes.verifikasi}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                {stats.menunggu > 0 ? "Verifikasi bukti" : "Lihat dokumen"}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="summary-title"
            className="rounded-xl border border-stone-200 bg-white"
          >
            <h2
              id="summary-title"
              className="px-5 py-4 text-lg font-semibold text-emerald-950 sm:px-6"
            >
              Ringkasan penilaian
            </h2>

            <ul className="grid gap-px border-t border-stone-200 bg-stone-200 sm:grid-cols-2 xl:grid-cols-4">
              {summary.map(({ label, value, href }) => (
                <li key={label} className="min-w-0 bg-white">
                  <Link
                    href={href}
                    className="group flex h-full items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-stone-50 sm:px-6"
                  >
                    <span>
                      <span className="block text-sm text-stone-700">
                        {label}
                      </span>
                      <span className="mt-1 block text-2xl font-semibold tabular-nums text-emerald-950">
                        {formatNumber.format(value)}
                      </span>
                    </span>

                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-emerald-800 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section
        aria-labelledby="shortcuts-title"
        className="rounded-xl border border-stone-200 bg-white"
      >
        <h2
          id="shortcuts-title"
          className="px-5 py-4 text-lg font-semibold text-emerald-950 sm:px-6"
        >
          Kelola penilaian
        </h2>

        <ul className="divide-y divide-stone-200 border-t border-stone-200">
          {shortcuts.map(({ label, description, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-stone-50 sm:px-6"
              >
                <Icon
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-emerald-800"
                />

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-900">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-600">
                    {description}
                  </span>
                </span>

                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-emerald-800 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}