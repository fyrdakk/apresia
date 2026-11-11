"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  ArrowLeft,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  BookOpen,
  Languages,
} from "lucide-react";

type DataAkademik = {
  id: string;
  mahasiswa_id: string;
  ipk: number | null;
  nilai_bahasa_inggris: number | null;
};

export default function DataAkademikPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [dataId, setDataId] = useState<string | null>(null);
  const [ipk, setIpk] = useState("");
  const [nilaiBahasaInggris, setNilaiBahasaInggris] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Memeriksa akun mahasiswa yang sedang login
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      setUserId(user.id);

      // Mengambil data akademik milik mahasiswa
      const { data, error: queryError } = await supabase
        .from("data_akademik")
        .select("id, mahasiswa_id, ipk, nilai_bahasa_inggris")
        .eq("mahasiswa_id", user.id)
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;

      if (data) {
        const akademik = data as DataAkademik;

        setDataId(akademik.id);
        setIpk(
          akademik.ipk !== null ? String(akademik.ipk) : ""
        );
        setNilaiBahasaInggris(
          akademik.nilai_bahasa_inggris !== null
            ? String(akademik.nilai_bahasa_inggris)
            : ""
        );
      } else {
        setDataId(null);
        setIpk("");
        setNilaiBahasaInggris("");
      }
    } catch (err) {
      console.error("Gagal mengambil data akademik:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data akademik."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!userId) {
      setError("Akun mahasiswa tidak ditemukan. Silakan login kembali.");
      return;
    }

    const ipkNumber = Number(ipk);
    const bahasaNumber = Number(nilaiBahasaInggris);

    if (ipk.trim() === "" || nilaiBahasaInggris.trim() === "") {
      setError("IPK dan nilai Bahasa Inggris wajib diisi.");
      return;
    }

    if (!Number.isFinite(ipkNumber) || ipkNumber < 0 || ipkNumber > 4) {
      setError("IPK harus berada pada rentang 0,00 sampai 4,00.");
      return;
    }

    if (
      !Number.isFinite(bahasaNumber) ||
      bahasaNumber < 0
    ) {
      setError("Nilai Bahasa Inggris harus berupa angka yang valid.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        mahasiswa_id: userId,
        ipk: ipkNumber,
        nilai_bahasa_inggris: bahasaNumber,
      };

      if (dataId) {
        // Memperbarui data akademik yang sudah ada
        const { error: updateError } = await supabase
          .from("data_akademik")
          .update(payload)
          .eq("id", dataId)
          .eq("mahasiswa_id", userId);

        if (updateError) throw updateError;
      } else {
        // Menambahkan data akademik baru
        const { data: inserted, error: insertError } = await supabase
          .from("data_akademik")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) throw insertError;

        setDataId(inserted.id);
      }

      setSuccess("Data akademik berhasil disimpan.");
    } catch (err) {
      console.error("Gagal menyimpan data akademik:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan data."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 size={22} className="animate-spin text-emerald-600" />
          Memuat data akademik...
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Header */}
      <div>
        <Link
          href="/mahasiswa"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <GraduationCap size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Data Akademik
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Lengkapi informasi akademik sebagai bagian dari penilaian APRESIA.
            </p>
          </div>
        </div>
      </div>

      {/* Notifikasi */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Informasi */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Info size={20} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold text-blue-900">
            Informasi Pengisian
          </p>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            Masukkan nilai sesuai dengan data akademik dan sertifikat tes
            Bahasa Inggris yang kamu miliki. Pastikan informasi yang
            dimasukkan benar karena akan digunakan sebagai data pendukung
            penilaian.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-gray-900">
            Formulir Data Akademik
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Isi seluruh kolom berikut dengan informasi yang valid.
          </p>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          {/* IPK */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <BookOpen size={20} />
              </div>
              <div>
                <label
                  htmlFor="ipk"
                  className="font-semibold text-gray-900"
                >
                  Indeks Prestasi Kumulatif (IPK)
                </label>
                <p className="text-xs text-gray-500">
                  Masukkan IPK terakhir yang tercatat.
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                id="ipk"
                type="number"
                min="0"
                max="4"
                step="0.01"
                value={ipk}
                onChange={(e) => setIpk(e.target.value)}
                placeholder="Contoh: 3.75"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                / 4.00
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Rentang nilai IPK: 0,00–4,00.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Bahasa Inggris */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                <Languages size={20} />
              </div>
              <div>
                <label
                  htmlFor="bahasaInggris"
                  className="font-semibold text-gray-900"
                >
                  Nilai Bahasa Inggris (TOEFL)
                </label>
                <p className="text-xs text-gray-500">
                  Masukkan skor tes Bahasa Inggris yang dimiliki.
                </p>
              </div>
            </div>

            <input
              id="bahasaInggris"
              type="number"
              min="0"
              step="any"
              value={nilaiBahasaInggris}
              onChange={(e) => setNilaiBahasaInggris(e.target.value)}
              placeholder="Contoh: 500"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <p className="mt-2 text-xs text-gray-400">
              Gunakan skala sesuai sertifikat atau jenis tes yang kamu miliki.
              Pastikan skala penilaian dicatat secara konsisten.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={fetchData}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Muat Ulang
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}
            {saving ? "Menyimpan..." : "Simpan Data Akademik"}
          </button>
        </div>
      </form>

      {/* Status */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={19} className="text-emerald-600" />
          <h2 className="font-semibold text-gray-900">
            Status Data Akademik
          </h2>
        </div>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {dataId
            ? "Data akademik sudah tersimpan. Kamu masih dapat memperbarui nilainya jika terdapat perubahan."
            : "Kamu belum menyimpan data akademik. Silakan isi formulir di atas."}
        </p>

        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            dataId
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {dataId ? "Data tersimpan" : "Belum diisi"}
        </span>
      </div>
    </main>
  );
}
