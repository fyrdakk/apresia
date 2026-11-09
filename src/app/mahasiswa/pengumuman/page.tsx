"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Trophy,
  XCircle,
} from "lucide-react";

type HasilPenilaian = {
  id: string;
  mahasiswa_id: string;
  nilai_c1: number | null;
  nilai_c2: number | null;
  nilai_c3: number | null;
  nilai_c4: number | null;
  nilai_c5: number | null;
  normalisasi_c1: number | null;
  normalisasi_c2: number | null;
  normalisasi_c3: number | null;
  normalisasi_c4: number | null;
  normalisasi_c5: number | null;
  nilai_preferensi: number | null;
  peringkat: number | null;
  status_validasi: string;
  status_publikasi: boolean;
  catatan: string | null;
  tanggal_penilaian?: string | null;
  tanggal_validasi?: string | null;
  tanggal_publikasi?: string | null;
};

type ProfilMahasiswa = {
  nama_lengkap: string;
  nim: string;
  prodi: string | null;
  fakultas: string | null;
  semester: number | null;
};

const KRITERIA = [
  { kode: "C1", nama: "IPK", bobot: "30%", nilai: "nilai_c1", normalisasi: "normalisasi_c1" },
  { kode: "C2", nama: "Kemampuan Bahasa Inggris", bobot: "20%", nilai: "nilai_c2", normalisasi: "normalisasi_c2" },
  { kode: "C3", nama: "Keaktifan dan Jabatan Organisasi", bobot: "20%", nilai: "nilai_c3", normalisasi: "normalisasi_c3" },
  { kode: "C4", nama: "Karya Ilmiah dan Kontribusi Mahasiswa", bobot: "20%", nilai: "nilai_c4", normalisasi: "normalisasi_c4" },
  { kode: "C5", nama: "Prestasi dan Sertifikasi", bobot: "10%", nilai: "nilai_c5", normalisasi: "normalisasi_c5" },
] as const;

function formatNumber(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Terjadi kesalahan saat memuat pengumuman.";
}

export default function PengumumanPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasil, setHasil] = useState<HasilPenilaian | null>(null);
  const [profil, setProfil] = useState<ProfilMahasiswa | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");

      const [hasilResult, profilResult] = await Promise.all([
        supabase
          .from("hasil_penilaian")
          .select(
            "id, mahasiswa_id, nilai_c1, nilai_c2, nilai_c3, nilai_c4, nilai_c5, normalisasi_c1, normalisasi_c2, normalisasi_c3, normalisasi_c4, normalisasi_c5, nilai_preferensi, peringkat, status_validasi, status_publikasi, catatan, tanggal_penilaian, tanggal_validasi, tanggal_publikasi"
          )
          .eq("mahasiswa_id", user.id)
          .maybeSingle(),
        supabase
          .from("login")
          .select("nama_lengkap, nim, prodi, fakultas, semester")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (hasilResult.error) throw hasilResult.error;
      if (profilResult.error) throw profilResult.error;

      setHasil((hasilResult.data as HasilPenilaian | null) ?? null);
      setProfil((profilResult.data as ProfilMahasiswa | null) ?? null);
    } catch (err) {
      console.error("GAGAL MEMUAT PENGUMUMAN:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const subscribeToUpdates = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      channel = supabase
        .channel(`pengumuman-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hasil_penilaian",
            filter: `mahasiswa_id=eq.${user.id}`,
          },
          () => {
            void loadData();
          }
        )
        .subscribe();
    };

    void subscribeToUpdates();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadData]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </main>
    );
  }

  const sudahDiumumkan = hasil?.status_publikasi === true;
  const tervalidasi = hasil?.status_validasi === "tervalidasi";

  return (
    <main className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700">
              <Bell size={17} />
              APRESIA · Informasi Mahasiswa
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pengumuman Hasil Seleksi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Informasi hasil penilaian dan perangkingan penerima penghargaan mahasiswa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Muat Ulang
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="break-words">{error}</p>
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Data Peserta</h2>
              <p className="text-sm text-gray-500">Identitas kandidat yang sedang login</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Nama Lengkap</p>
              <p className="mt-1 font-medium text-gray-900">{profil?.nama_lengkap || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">NIM</p>
              <p className="mt-1 font-medium text-gray-900">{profil?.nim || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Program Studi</p>
              <p className="mt-1 font-medium text-gray-900">{profil?.prodi || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fakultas</p>
              <p className="mt-1 font-medium text-gray-900">{profil?.fakultas || "—"}</p>
            </div>
          </div>
        </section>

        {!hasil ? (
          <section className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Clock3 size={26} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Belum Ada Hasil Penilaian</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
              Data penilaian Anda belum tersedia. Pastikan data akademik, portofolio,
              dan dokumen bukti telah dilengkapi. Admin akan melakukan verifikasi
              dan penilaian sebelum hasil diumumkan.
            </p>
          </section>
        ) : !sudahDiumumkan ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
                <Clock3 size={25} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-900">Pengumuman Belum Dipublikasikan</h2>
                <p className="mt-2 text-sm leading-6 text-blue-800">
                  Hasil penilaian Anda sudah tercatat di sistem, tetapi admin belum
                  memublikasikan pengumuman. Silakan periksa halaman ini kembali
                  setelah pengumuman resmi diterbitkan.
                </p>
                <p className="mt-3 text-xs text-blue-700">
                  Status validasi: {hasil.status_validasi || "Belum ditentukan"}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
              <div className="bg-green-700 px-5 py-5 text-white md:px-7">
                <div className="flex items-center gap-3">
                  <Trophy size={26} />
                  <div>
                    <p className="text-sm text-green-100">Pengumuman Resmi APRESIA</p>
                    <h2 className="text-xl font-bold">Hasil Penilaian Mahasiswa</h2>
                  </div>
                </div>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-2 md:p-7">
                <div className="rounded-xl bg-green-50 p-5">
                  <p className="text-sm font-medium text-green-800">Peringkat Anda</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Award className="h-9 w-9 text-green-700" />
                    <p className="text-4xl font-bold text-green-800">
                      {hasil.peringkat ? `#${hasil.peringkat}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-5">
                  <p className="text-sm font-medium text-gray-600">Nilai Preferensi (Vi)</p>
                  <p className="mt-2 text-4xl font-bold text-gray-900">
                    {formatNumber(hasil.nilai_preferensi, 4)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Hasil akhir perhitungan metode SAW</p>
                </div>
              </div>
              <div className="border-t border-gray-100 px-5 py-4 md:px-7">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {tervalidasi ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 font-semibold text-green-700">
                      <CheckCircle2 size={15} /> Penilaian tervalidasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                      <Clock3 size={15} /> Status: {hasil.status_validasi}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarDays size={14} />
                    Dipublikasikan: {formatDate(hasil.tanggal_publikasi)}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Rincian Penilaian</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Nilai setiap kriteria yang digunakan dalam perhitungan SAW.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="px-3 py-3 font-semibold">Kriteria</th>
                      <th className="px-3 py-3 font-semibold">Nama Kriteria</th>
                      <th className="px-3 py-3 text-right font-semibold">Bobot</th>
                      <th className="px-3 py-3 text-right font-semibold">Nilai</th>
                      <th className="px-3 py-3 text-right font-semibold">Normalisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KRITERIA.map((item) => (
                      <tr key={item.kode} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-4 font-semibold text-green-700">{item.kode}</td>
                        <td className="px-3 py-4 text-gray-700">{item.nama}</td>
                        <td className="px-3 py-4 text-right text-gray-700">{item.bobot}</td>
                        <td className="px-3 py-4 text-right font-medium text-gray-900">
                          {formatNumber(hasil[item.nilai])}
                        </td>
                        <td className="px-3 py-4 text-right text-gray-700">
                          {formatNumber(hasil[item.normalisasi])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasil.catatan && (
                <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">Catatan Admin</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-blue-800">
                    {hasil.catatan}
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        <p className="text-center text-xs leading-5 text-gray-400">
          Informasi pada halaman ini ditampilkan berdasarkan data penilaian milik akun
          mahasiswa yang sedang login.
        </p>
      </div>
    </main>
  );
}