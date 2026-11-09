"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Users,
  Eye,
  RefreshCw,
  X,
  GraduationCap,
  Mail,
  Hash,
  Building2,
  BookOpen,
  AlertCircle,
} from "lucide-react";

type Mahasiswa = {
  id: string;
  nim: string | null;
  nama_lengkap: string | null;
  fakultas: string | null;
  prodi: string | null;
  semester: number | null;
  email: string | null;
  created_at: string;
};

export default function DataMahasiswaPage() {
  const supabase = createClient();

  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSemester, setFilterSemester] = useState("semua");
  const [selectedMahasiswa, setSelectedMahasiswa] =
    useState<Mahasiswa | null>(null);

  async function fetchMahasiswa() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("login")
        .select(
          "id, nim, nama_lengkap, fakultas, prodi, semester, email, created_at"
        )
        .eq("role", "mahasiswa")
        .order("nama_lengkap", { ascending: true });

      if (error) throw error;

      setMahasiswa(data ?? []);
    } catch (err) {
      console.error("Gagal mengambil data mahasiswa:", err);
      setError(
        "Data mahasiswa gagal dimuat. Periksa koneksi Supabase dan kebijakan RLS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMahasiswa();
  }, []);

  const filteredMahasiswa = mahasiswa.filter((item) => {
    const keyword = search.toLowerCase();

    const cocokPencarian =
      (item.nama_lengkap ?? "").toLowerCase().includes(keyword) ||
      (item.nim ?? "").toLowerCase().includes(keyword) ||
      (item.email ?? "").toLowerCase().includes(keyword) ||
      (item.prodi ?? "").toLowerCase().includes(keyword);

    const cocokSemester =
      filterSemester === "semua" ||
      String(item.semester) === filterSemester;

    return cocokPencarian && cocokSemester;
  });

  const totalMahasiswa = mahasiswa.length;

  const formatTanggal = (tanggal: string) => {
    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-sm font-medium text-emerald-600">
          APRESIA / ADMIN / DATA MAHASISWA
        </p>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
              Data Mahasiswa
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Kelola dan pantau data mahasiswa yang terdaftar di APRESIA.
            </p>
          </div>

          <button
            onClick={fetchMahasiswa}
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

      {/* Statistik */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <Users size={25} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Total Mahasiswa Terdaftar
            </p>
            <h2 className="text-2xl font-bold text-slate-800">
              {loading ? "..." : totalMahasiswa}
            </h2>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabel */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Search dan Filter */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
          <div>
            <h2 className="font-bold text-slate-800">
              Daftar Mahasiswa
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Informasi mahasiswa yang telah melakukan registrasi.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Cari nama, NIM, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-64"
              />
            </div>

            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-500"
            >
              <option value="semua">Semua Semester</option>
              {Array.from({ length: 14 }, (_, i) => i + 1).map(
                (semester) => (
                  <option key={semester} value={String(semester)}>
                    Semester {semester}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">No.</th>
                <th className="px-5 py-4 font-semibold">Mahasiswa</th>
                <th className="px-5 py-4 font-semibold">NIM</th>
                <th className="px-5 py-4 font-semibold">Program Studi</th>
                <th className="px-5 py-4 font-semibold">Semester</th>
                <th className="px-5 py-4 font-semibold">Fakultas</th>
                <th className="px-5 py-4 text-center font-semibold">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    <RefreshCw
                      size={22}
                      className="mx-auto mb-3 animate-spin"
                    />
                    Memuat data mahasiswa...
                  </td>
                </tr>
              ) : filteredMahasiswa.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    <Users
                      size={30}
                      className="mx-auto mb-3 text-slate-300"
                    />
                    <p className="font-medium text-slate-600">
                      Data mahasiswa tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs">
                      Coba ubah kata kunci pencarian atau filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMahasiswa.map((item, index) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-emerald-50/40"
                  >
                    <td className="px-5 py-4 text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.nama_lengkap || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.email || "-"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      {item.nim || "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.prodi || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {item.semester
                          ? `Semester ${item.semester}`
                          : "-"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.fakultas || "-"}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedMahasiswa(item)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Eye size={15} />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel */}
        <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row">
          <p>
            Menampilkan {filteredMahasiswa.length} dari{" "}
            {totalMahasiswa} mahasiswa
          </p>
          <p>Data bersumber dari database APRESIA</p>
        </div>
      </section>

      {/* Modal Detail */}
      {selectedMahasiswa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedMahasiswa(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Detail Mahasiswa
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Informasi lengkap mahasiswa terdaftar.
                </p>
              </div>

              <button
                onClick={() => setSelectedMahasiswa(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <GraduationCap size={30} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    {selectedMahasiswa.nama_lengkap || "-"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedMahasiswa.nim || "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: "Email",
                    value: selectedMahasiswa.email,
                    icon: Mail,
                  },
                  {
                    label: "NIM",
                    value: selectedMahasiswa.nim,
                    icon: Hash,
                  },
                  {
                    label: "Fakultas",
                    value: selectedMahasiswa.fakultas,
                    icon: Building2,
                  },
                  {
                    label: "Program Studi",
                    value: selectedMahasiswa.prodi,
                    icon: BookOpen,
                  },
                  {
                    label: "Semester",
                    value: selectedMahasiswa.semester
                      ? `Semester ${selectedMahasiswa.semester}`
                      : "-",
                    icon: GraduationCap,
                  },
                ].map((detail) => {
                  const Icon = detail.icon;

                  return (
                    <div
                      key={detail.label}
                      className="flex items-center gap-3"
                    >
                      <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
                        <Icon size={17} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">
                          {detail.label}
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {detail.value || "-"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Tanggal Registrasi
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {selectedMahasiswa.created_at
                    ? formatTanggal(selectedMahasiswa.created_at)
                    : "-"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <button
                onClick={() => setSelectedMahasiswa(null)}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}