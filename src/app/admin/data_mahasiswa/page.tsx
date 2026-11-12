"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Building2,
  Eye,
  GraduationCap,
  Hash,
  Mail,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

const semesterOptions = Array.from({ length: 14 }, (_, index) => index + 1);

const columns = [
  { label: "No.", width: "w-[6%]", align: "text-center" },
  { label: "Mahasiswa", width: "w-[25%]", align: "text-left" },
  { label: "NIM", width: "w-[15%]", align: "text-left" },
  { label: "Program Studi", width: "w-[16%]", align: "text-left" },
  { label: "Semester", width: "w-[12%]", align: "text-center" },
  { label: "Fakultas", width: "w-[14%]", align: "text-left" },
  { label: "Aksi", width: "w-[12%]", align: "text-center" },
];

const formatTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function DataMahasiswaPage() {
  const supabase = useMemo(() => createClient(), []);

  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSemester, setFilterSemester] = useState("semua");
  const [selectedMahasiswa, setSelectedMahasiswa] =
    useState<Mahasiswa | null>(null);

  const fetchMahasiswa = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("login")
        .select(
          "id, nim, nama_lengkap, fakultas, prodi, semester, email, created_at",
        )
        .eq("role", "mahasiswa")
        .order("nama_lengkap", { ascending: true });

      if (queryError) throw queryError;

      setMahasiswa(data ?? []);
    } catch (err) {
      console.error("Gagal mengambil data mahasiswa:", err);
      setError("Data mahasiswa gagal dimuat. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchMahasiswa();
  }, [fetchMahasiswa]);

  useEffect(() => {
    if (!selectedMahasiswa) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedMahasiswa(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedMahasiswa]);

  const keyword = search.trim().toLowerCase();

  const filteredMahasiswa = mahasiswa.filter((item) => {
    const matchesSearch = [
      item.nama_lengkap,
      item.nim,
      item.email,
      item.prodi,
    ].some((value) => (value ?? "").toLowerCase().includes(keyword));

    const matchesSemester =
      filterSemester === "semua" || String(item.semester) === filterSemester;

    return matchesSearch && matchesSemester;
  });

  return (
    <main className="min-w-0 space-y-6 py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
            Data Mahasiswa
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Lihat dan cari mahasiswa yang terdaftar di APRESIA.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMahasiswa}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={loading ? "animate-spin motion-reduce:animate-none" : ""}
          />
          {loading ? "Memuat…" : "Muat ulang"}
        </button>
      </header>

      <section
        aria-label="Total mahasiswa"
        className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5"
      >
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
          <Users size={24} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-stone-600">Total mahasiswa terdaftar</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
            {loading || error ? "—" : mahasiswa.length.toLocaleString("id-ID")}
          </p>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={18} aria-hidden="true" className="shrink-0" />
          {error}
        </p>
      )}

      <section
        aria-labelledby="student-list-title"
        className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 p-4 sm:p-5">
          <h2 id="student-list-title" className="font-semibold text-emerald-950">
            Daftar Mahasiswa
          </h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
              />
              <input
                type="search"
                aria-label="Cari mahasiswa"
                placeholder="Cari nama, NIM, atau email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm sm:w-64"
              />
            </div>

            <select
              aria-label="Filter semester"
              value={filterSemester}
              onChange={(event) => setFilterSemester(event.target.value)}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-700"
            >
              <option value="semua">Semua semester</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="overflow-x-auto"
          role="region"
          aria-labelledby="student-list-title"
          tabIndex={0}
        >
          <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
            <colgroup>
              {columns.map(({ label, width }) => (
                <col key={label} className={width} />
              ))}
            </colgroup>

            <thead className="bg-emerald-50 text-xs text-emerald-950">
              <tr>
                {columns.map(({ label, align }) => (
                  <th
                    key={label}
                    scope="col"
                    className={`px-2 py-3 font-semibold ${align}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {loading || error || filteredMahasiswa.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-stone-600"
                  >
                    {loading ? (
                      <span role="status">Memuat data mahasiswa…</span>
                    ) : error ? (
                      "Daftar mahasiswa belum bisa ditampilkan."
                    ) : (
                      "Tidak ada mahasiswa yang cocok dengan pencarian atau filter."
                    )}
                  </td>
                </tr>
              ) : (
                filteredMahasiswa.map((item, index) => (
                  <tr key={item.id} className="align-middle hover:bg-emerald-50/40">
                    <td className="px-2 py-3 text-center tabular-nums text-stone-600">
                      {index + 1}
                    </td>

                    <td className="px-2 py-3">
                      <p className="font-semibold wrap-anywhere text-stone-900">
                        {item.nama_lengkap || "—"}
                      </p>
                      <p className="mt-1 text-xs wrap-anywhere text-stone-600">
                        {item.email || "—"}
                      </p>
                    </td>

                    <td className="px-2 py-3 font-medium wrap-anywhere tabular-nums text-stone-800">
                      {item.nim || "—"}
                    </td>

                    <td className="px-2 py-3 wrap-anywhere text-stone-700">
                      {item.prodi || "—"}
                    </td>

                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex h-7 min-w-8 items-center justify-center whitespace-nowrap rounded-md bg-emerald-50 px-2 text-xs font-semibold tabular-nums text-emerald-800">
                        {item.semester ?? "—"}
                      </span>
                    </td>

                    <td className="px-2 py-3 wrap-anywhere text-stone-700">
                      {item.fakultas || "—"}
                    </td>

                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedMahasiswa(item)}
                        aria-label={`Lihat detail ${item.nama_lengkap || "mahasiswa"}`}
                        className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-50 px-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                      >
                        <Eye size={14} aria-hidden="true" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && (
          <p
            aria-live="polite"
            className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600 sm:px-5"
          >
            Menampilkan {filteredMahasiswa.length} dari {mahasiswa.length} mahasiswa.
          </p>
        )}
      </section>

      {selectedMahasiswa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4"
          onClick={() => setSelectedMahasiswa(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-detail-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-4 border-b border-stone-200 p-5">
              <h2 id="student-detail-title" className="text-lg font-semibold text-emerald-950">
                Detail Mahasiswa
              </h2>
              <button
                type="button"
                aria-label="Tutup detail mahasiswa"
                onClick={() => setSelectedMahasiswa(null)}
                className="inline-flex size-11 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                  <GraduationCap size={24} aria-hidden="true" />
                </div>
                <p className="min-w-0 font-semibold wrap-anywhere text-stone-900">
                  {selectedMahasiswa.nama_lengkap || "—"}
                </p>
              </div>

              <dl className="space-y-3">
                {[
                  { label: "Email", value: selectedMahasiswa.email, icon: Mail },
                  { label: "NIM", value: selectedMahasiswa.nim, icon: Hash },
                  { label: "Fakultas", value: selectedMahasiswa.fakultas, icon: Building2 },
                  { label: "Program Studi", value: selectedMahasiswa.prodi, icon: BookOpen },
                  { label: "Semester", value: selectedMahasiswa.semester, icon: GraduationCap },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon size={17} aria-hidden="true" className="mt-1 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <dt className="text-xs text-stone-600">{label}</dt>
                      <dd className="mt-1 text-sm font-medium wrap-anywhere text-stone-900">
                        {value ?? "—"}
                      </dd>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg bg-stone-50 p-3">
                  <dt className="text-xs text-stone-600">Tanggal Registrasi</dt>
                  <dd className="mt-1 text-sm font-medium text-stone-900">
                    {selectedMahasiswa.created_at
                      ? formatTanggal.format(new Date(selectedMahasiswa.created_at))
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <footer className="border-t border-stone-200 p-5">
              <button
                type="button"
                onClick={() => setSelectedMahasiswa(null)}
                className="min-h-11 w-full rounded-lg bg-emerald-950 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Tutup
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}