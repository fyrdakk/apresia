"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ListChecks,
  RefreshCw,
  Pencil,
  X,
  Save,
  Scale,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Kriteria = {
  id: string;
  kode: string;
  nama_kriteria: string;
  deskripsi: string | null;
  bobot: number;
  jenis: "Benefit" | "Cost";
};

export default function DataKriteriaPage() {
  const supabase = createClient();

  const [kriteria, setKriteria] = useState<Kriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState<Kriteria | null>(null);

  const [form, setForm] = useState({
    nama_kriteria: "",
    deskripsi: "",
    bobot: "",
  });

  async function fetchKriteria() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("kriteria")
        .select("id, kode, nama_kriteria, deskripsi, bobot, jenis")
        .order("kode", { ascending: true });

      if (error) throw error;

      setKriteria(data ?? []);
    } catch (err) {
      console.error("Gagal mengambil data kriteria:", err);
      setError(
        "Data kriteria gagal dimuat. Periksa koneksi Supabase dan kebijakan RLS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKriteria();
  }, []);

  const totalBobot = kriteria.reduce(
    (total, item) => total + Number(item.bobot),
    0
  );

  const formatBobot = (bobot: number) =>
    Number(bobot).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });

  const formatPersentase = (bobot: number) =>
    `${(Number(bobot) * 100).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })}%`;

  function openEdit(item: Kriteria) {
    setSelected(item);
    setForm({
      nama_kriteria: item.nama_kriteria,
      deskripsi: item.deskripsi ?? "",
      bobot: String(item.bobot),
    });
    setError("");
    setSuccess("");
  }

  function closeEdit() {
    setSelected(null);
    setForm({
      nama_kriteria: "",
      deskripsi: "",
      bobot: "",
    });
  }


  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selected) return;

    setError("");
    setSuccess("");

    const bobotBaru = Number(form.bobot);

    if (!form.nama_kriteria.trim()) {
      setError("Nama kriteria wajib diisi.");
      return;
    }

    if (
      !Number.isFinite(bobotBaru) ||
      bobotBaru < 0 ||
      bobotBaru > 1
    ) {
      setError("Bobot harus berupa angka antara 0 dan 1.");
      return;
    }

    const totalBaru =
      totalBobot - Number(selected.bobot) + bobotBaru;

    if (Math.abs(totalBaru - 1) > 0.000001) {
      setError(
        `Total bobot setelah perubahan adalah ${totalBaru.toFixed(4)}. Total seluruh bobot harus tetap 1,00.`
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("kriteria")
        .update({
          nama_kriteria: form.nama_kriteria.trim(),
          deskripsi: form.deskripsi.trim() || null,
          bobot: bobotBaru,
        })
        .eq("id", selected.id)
        .select("id, kode, nama_kriteria, deskripsi, bobot, jenis")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Tidak ada data yang diperbarui. Periksa izin UPDATE RLS pada tabel kriteria."
        );
      }

      await fetchKriteria();

      setSelected(null);
      setForm({
        nama_kriteria: "",
        deskripsi: "",
        bobot: "",
      });

      setSuccess("Data kriteria berhasil diperbarui.");

    } catch (err: any) {
      console.error("Gagal memperbarui kriteria:", err);

      setError(
        err?.message ||
        "Gagal menyimpan perubahan data kriteria."
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-sm font-medium text-emerald-600">
          APRESIA / ADMIN / DATA KRITERIA
        </p>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
              Data Kriteria
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Kelola kriteria dan bobot penilaian metode SAW.
            </p>
          </div>

          <button
            onClick={fetchKriteria}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Notifikasi */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={19} />
          {success}
        </div>
      )}

      {/* Statistik */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Jumlah Kriteria
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-800">
                {loading ? "..." : kriteria.length}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Kriteria penilaian SAW
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ListChecks size={25} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Bobot
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-800">
                {loading ? "..." : formatPersentase(totalBobot)}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Target total bobot 100%
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Scale size={25} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Kriteria */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-800">
            Daftar Kriteria Penilaian
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Kriteria yang digunakan dalam proses pemilihan penerima penghargaan.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Kode</th>
                <th className="px-5 py-4 font-semibold">Nama Kriteria</th>
                <th className="px-5 py-4 font-semibold">Bobot</th>
                <th className="px-5 py-4 font-semibold">Persentase</th>
                <th className="px-5 py-4 font-semibold">Jenis</th>
                <th className="px-5 py-4 text-center font-semibold">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    <RefreshCw
                      size={22}
                      className="mx-auto mb-3 animate-spin"
                    />
                    Memuat data kriteria...
                  </td>
                </tr>
              ) : kriteria.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    Data kriteria belum tersedia.
                  </td>
                </tr>
              ) : (
                kriteria.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-emerald-50/40"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        {item.kode}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {item.nama_kriteria}
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-slate-400">
                        {item.deskripsi || "Tidak ada deskripsi"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      {formatBobot(item.bobot)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-12 font-semibold text-slate-700">
                          {formatPersentase(item.bobot)}
                        </span>
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Number(item.bobot) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {item.jenis}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row">
          <p>Menampilkan {kriteria.length} kriteria</p>
          <p>Data bersumber dari database APRESIA</p>
        </div>
      </section>

      {/* Informasi Bobot */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="font-semibold text-blue-800">
          Informasi Metode SAW
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-blue-700">
          Metode Simple Additive Weighting (SAW) menggunakan bobot
          untuk menunjukkan tingkat kepentingan setiap kriteria.
          Total seluruh bobot harus bernilai 1,00 atau 100%.
          Seluruh kriteria APRESIA saat ini menggunakan atribut Benefit.
        </p>
      </div>

      {/* Modal Edit */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Edit Kriteria {selected.kode}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Perbarui informasi kriteria penilaian.
                </p>
              </div>

              <button
                onClick={closeEdit}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Kode Kriteria
                </label>
                <input
                  type="text"
                  value={selected.kode}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Kriteria
                </label>
                <input
                  type="text"
                  value={form.nama_kriteria}
                  onChange={(e) =>
                    setForm({ ...form, nama_kriteria: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm({ ...form, deskripsi: e.target.value })
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Masukkan deskripsi kriteria..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Bobot (0–1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.bobot}
                  onChange={(e) =>
                    setForm({ ...form, bobot: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Bobot saat ini: {formatPersentase(selected.bobot)}.
                  Total bobot setelah perubahan wajib 100%.
                </p>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
