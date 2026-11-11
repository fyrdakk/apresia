"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Search,
  RefreshCw,
  Trophy,
  Medal,
  Users,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  Brain,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mahasiswa = {
  id: string;
  nama_lengkap: string | null;
  nim: string | null;
  prodi: string | null;
  fakultas: string | null;
};

type HasilPenilaian = {
  id: string;
  mahasiswa_id: string;
  nilai_c1: number | null;
  nilai_c2: number | null;
  nilai_c3: number | null;
  nilai_c4: number | null;
  nilai_c5: number | null;
  nilai_preferensi: number | null;
  peringkat: number | null;
  status_validasi: string | null;
  status_publikasi: boolean | null;
};

type RankingItem = HasilPenilaian & {
  mahasiswa: Mahasiswa | null;
};

const formatNilai = (nilai: number | null) =>
  nilai === null || !Number.isFinite(Number(nilai))
    ? "-"
    : Number(nilai).toFixed(3);

const formatIPK = (nilai: number | null) =>
  nilai === null || !Number.isFinite(Number(nilai))
    ? "-"
    : Number(nilai).toFixed(2);

export default function RankingPage() {
  const supabase = useMemo(() => createClient(), []);

  const [data, setData] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);

  const [search, setSearch] = useState("");
  const [filterPublikasi, setFilterPublikasi] = useState("semua");
  const [error, setError] = useState("");

  const [selectedStudent, setSelectedStudent] =
    useState<RankingItem | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiError, setAiError] = useState("");

  // Mengambil data ranking mahasiswa yang sudah divalidasi
  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: hasil, error: hasilError } = await supabase
        .from("hasil_penilaian")
        .select(
          "id, mahasiswa_id, nilai_c1, nilai_c2, nilai_c3, nilai_c4, nilai_c5, nilai_preferensi, peringkat, status_validasi, status_publikasi"
        )
        .eq("status_validasi", "tervalidasi")
        .order("peringkat", { ascending: true });

      if (hasilError) throw hasilError;

      const hasilData = (hasil ?? []) as HasilPenilaian[];

      if (hasilData.length === 0) {
        setData([]);
        return;
      }

      const mahasiswaIds = [
        ...new Set(hasilData.map((item) => item.mahasiswa_id)),
      ];

      const { data: mahasiswa, error: mahasiswaError } = await supabase
        .from("login")
        .select("id, nama_lengkap, nim, prodi, fakultas")
        .in("id", mahasiswaIds);

      if (mahasiswaError) throw mahasiswaError;

      const mahasiswaData = (mahasiswa ?? []) as Mahasiswa[];

      const ranking: RankingItem[] = hasilData.map((item) => ({
        ...item,
        mahasiswa:
          mahasiswaData.find((m) => m.id === item.mahasiswa_id) ?? null,
      }));

      ranking.sort(
        (a, b) =>
          (a.peringkat ?? Number.MAX_SAFE_INTEGER) -
          (b.peringkat ?? Number.MAX_SAFE_INTEGER)
      );

      setData(ranking);
    } catch (err) {
      console.error("Gagal mengambil ranking:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data ranking."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchRanking();
  }, [fetchRanking]);

  // Pencarian dan filter publikasi
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keyword = search.toLowerCase();

      const nama = item.mahasiswa?.nama_lengkap?.toLowerCase() ?? "";
      const nim = item.mahasiswa?.nim?.toLowerCase() ?? "";
      const prodi = item.mahasiswa?.prodi?.toLowerCase() ?? "";

      const cocokSearch =
        nama.includes(keyword) ||
        nim.includes(keyword) ||
        prodi.includes(keyword);

      const cocokPublikasi =
        filterPublikasi === "semua" ||
        (filterPublikasi === "terpublikasi" &&
          item.status_publikasi === true) ||
        (filterPublikasi === "belum" &&
          item.status_publikasi !== true);

      return cocokSearch && cocokPublikasi;
    });
  }, [data, search, filterPublikasi]);

  const totalPublikasi = data.filter(
    (item) => item.status_publikasi === true
  ).length;

  const totalBelumPublikasi = data.length - totalPublikasi;

  // Publikasi atau membatalkan publikasi satu mahasiswa
  const handlePublikasi = async (item: RankingItem) => {
    setUpdatingId(item.id);
    setError("");

    const statusBaru = item.status_publikasi !== true;

    try {
      const { error: updateError } = await supabase
        .from("hasil_penilaian")
        .update({
          status_publikasi: statusBaru,
          tanggal_publikasi: statusBaru
            ? new Date().toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      setData((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, status_publikasi: statusBaru }
            : row
        )
      );
    } catch (err) {
      console.error("Gagal memperbarui publikasi:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status publikasi."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Publikasi seluruh hasil ranking
  const handlePublikasiSemua = async () => {
    const belumPublikasi = data.filter(
      (item) => item.status_publikasi !== true
    );

    if (belumPublikasi.length === 0) return;

    const konfirmasi = window.confirm(
      `Publikasikan hasil untuk ${belumPublikasi.length} mahasiswa?`
    );

    if (!konfirmasi) return;

    setPublishingAll(true);
    setError("");

    try {
      const ids = belumPublikasi.map((item) => item.id);

      const { error: updateError } = await supabase
        .from("hasil_penilaian")
        .update({
          status_publikasi: true,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (updateError) throw updateError;

      setData((prev) =>
        prev.map((item) =>
          ids.includes(item.id)
            ? { ...item, status_publikasi: true }
            : item
        )
      );
    } catch (err) {
      console.error("Gagal memublikasikan ranking:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memublikasikan seluruh hasil."
      );
    } finally {
      setPublishingAll(false);
    }
  };


  // Meminta penjelasan hasil ranking melalui Groq
  const handleAIExplanation = async (item: RankingItem) => {
    setSelectedStudent(item);
    setAiExplanation("");
    setAiError("");
    setAiLoading(true);

    // Penjelasan cadangan jika Groq gagal
    const createFallbackExplanation = () => {
      const nama = item.mahasiswa?.nama_lengkap ?? "Mahasiswa";
      const preferensi = Number(item.nilai_preferensi);

      const nilai =
        Number.isFinite(preferensi)
          ? preferensi.toFixed(4)
          : String(item.nilai_preferensi ?? "-");

      return `Berdasarkan hasil perhitungan metode Simple Additive Weighting (SAW), ${nama} berada pada peringkat ${item.peringkat} dengan nilai preferensi ${nilai}. Hasil tersebut diperoleh melalui pengolahan lima kriteria penilaian yang telah ditetapkan dalam sistem APRESIA.

Penilaian meliputi IPK sebesar ${item.nilai_c1 ?? "-"}, kemampuan bahasa Inggris sebesar ${item.nilai_c2 ?? "-"}, organisasi sebesar ${item.nilai_c3 ?? "-"}, karya ilmiah dan kontribusi sebesar ${item.nilai_c4 ?? "-"}, serta prestasi dan sertifikasi sebesar ${item.nilai_c5 ?? "-"}. Hasil pemeringkatan ini dapat menjadi bahan pertimbangan panitia dalam menentukan penerima penghargaan mahasiswa.`;
    };

    try {
      const controller = new AbortController();

      // Maksimal menunggu 12 detik
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch("/api/ai-explanation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nama: item.mahasiswa?.nama_lengkap ?? "Mahasiswa",
            peringkat: item.peringkat,
            nilai_c1: item.nilai_c1,
            nilai_c2: item.nilai_c2,
            nilai_c3: item.nilai_c3,
            nilai_c4: item.nilai_c4,
            nilai_c5: item.nilai_c5,
            nilai_preferensi: item.nilai_preferensi,
          }),
          signal: controller.signal,
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.explanation) {
          throw new Error("Layanan AI tidak tersedia.");
        }

        setAiExplanation(result.explanation);

        // Beri informasi jika menggunakan penjelasan cadangan
        if (result.source === "fallback") {
          console.info(
            "Groq tidak tersedia. Sistem menggunakan penjelasan cadangan."
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      console.error("Gagal mendapatkan penjelasan AI:", err);

      // Jangan tampilkan error kepada pengguna.
      // Tetap tampilkan penjelasan berdasarkan data SAW.
      setAiExplanation(createFallbackExplanation());
    } finally {
      setAiLoading(false);
    }
  };

  const closeAIModal = () => {
    if (aiLoading) return;

    setSelectedStudent(null);
    setAiExplanation("");
    setAiError("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Trophy size={17} />
            Hasil Seleksi
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Ranking Mahasiswa
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Daftar peringkat mahasiswa berdasarkan hasil perhitungan metode
            SAW.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void fetchRanking()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={() => void handlePublikasiSemua()}
            disabled={
              publishingAll || loading || totalBelumPublikasi === 0
            }
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishingAll ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Eye size={16} />
            )}
            Publikasikan Semua
          </button>
        </div>
      </div>

      {/* Pesan error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Mahasiswa Dinilai"
          value={data.length}
          icon={<Users size={22} />}
          color="blue"
        />

        <StatCard
          label="Sudah Dipublikasikan"
          value={totalPublikasi}
          icon={<CheckCircle2 size={22} />}
          color="green"
        />

        <StatCard
          label="Belum Dipublikasikan"
          value={totalBelumPublikasi}
          icon={<EyeOff size={22} />}
          color="amber"
        />
      </div>

      {/* Informasi metode */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Award size={21} className="mt-0.5 text-emerald-700" />

          <div>
            <p className="font-semibold text-emerald-900">
              Pemeringkatan Metode Simple Additive Weighting (SAW)
            </p>

            <p className="mt-1 text-sm text-emerald-800">
              Peringkat ditentukan berdasarkan nilai preferensi. AI hanya
              memberikan penjelasan terhadap hasil penilaian dan tidak
              mengubah nilai maupun peringkat SAW.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel ranking */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">
              Daftar Peringkat Mahasiswa
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Urutan berdasarkan nilai preferensi SAW.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau NIM..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 sm:w-60"
              />
            </div>

            <select
              value={filterPublikasi}
              onChange={(e) => setFilterPublikasi(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              <option value="semua">Semua Status</option>
              <option value="terpublikasi">Sudah Dipublikasikan</option>
              <option value="belum">Belum Dipublikasikan</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Memuat data ranking...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Trophy size={38} className="mx-auto text-gray-300" />

            <p className="mt-3 font-medium text-gray-700">
              {data.length === 0
                ? "Belum ada hasil ranking"
                : "Data tidak ditemukan"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {data.length === 0
                ? "Hasil akan muncul setelah data penilaian mahasiswa dihitung dan divalidasi."
                : "Coba gunakan kata kunci atau filter publikasi yang berbeda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Peringkat</th>
                  <th className="px-5 py-4">Mahasiswa</th>
                  <th className="px-5 py-4">Program Studi</th>
                  <th className="px-4 py-4 text-center">C1</th>
                  <th className="px-4 py-4 text-center">C2</th>
                  <th className="px-4 py-4 text-center">C3</th>
                  <th className="px-4 py-4 text-center">C4</th>
                  <th className="px-4 py-4 text-center">C5</th>
                  <th className="px-5 py-4 text-center">Preferensi</th>
                  <th className="px-5 py-4 text-center">Publikasi</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {item.peringkat === 1 ? (
                          <Trophy
                            size={20}
                            className="text-amber-500"
                          />
                        ) : item.peringkat === 2 ? (
                          <Medal
                            size={20}
                            className="text-gray-400"
                          />
                        ) : item.peringkat === 3 ? (
                          <Medal
                            size={20}
                            className="text-orange-600"
                          />
                        ) : null}

                        <span className="font-semibold text-gray-800">
                          {item.peringkat ?? "-"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {item.mahasiswa?.nama_lengkap ??
                          "Data tidak ditemukan"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.mahasiswa?.nim ?? "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <p>{item.mahasiswa?.prodi ?? "-"}</p>

                      <p className="mt-1 text-xs text-gray-400">
                        {item.mahasiswa?.fakultas ?? "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-center">
                      {formatIPK(item.nilai_c1)}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {formatNilai(item.nilai_c2)}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {formatNilai(item.nilai_c3)}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {formatNilai(item.nilai_c4)}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {formatNilai(item.nilai_c5)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-emerald-700">
                        {formatNilai(item.nilai_preferensi)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      {item.status_publikasi ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 size={13} />
                          Terpublikasi
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Belum
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => void handleAIExplanation(item)}
                          disabled={aiLoading}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Sparkles size={14} />
                          Jelaskan AI
                        </button>

                        <button
                          onClick={() => void handlePublikasi(item)}
                          disabled={updatingId === item.id}
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50 ${item.status_publikasi
                            ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                            : "bg-emerald-700 text-white hover:bg-emerald-800"
                            }`}
                        >
                          {updatingId === item.id ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : item.status_publikasi ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}

                          {item.status_publikasi
                            ? "Batalkan"
                            : "Publikasikan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          Menampilkan {filteredData.length} dari {data.length} mahasiswa.
        </div>
      </div>

      {/* Modal penjelasan AI */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAIModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
          >
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                  <Brain size={22} />
                </div>

                <div>
                  <h2
                    id="ai-title"
                    className="font-bold text-gray-900"
                  >
                    Penjelasan Hasil Seleksi
                  </h2>

                  <p className="text-xs text-gray-500">
                    Analisis hasil pemeringkatan menggunakan metode SAW
                  </p>
                </div>
              </div>

              <button
                onClick={closeAIModal}
                disabled={aiLoading}
                aria-label="Tutup"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Identitas mahasiswa */}
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  {selectedStudent.mahasiswa?.nama_lengkap ??
                    "Mahasiswa"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  NIM: {selectedStudent.mahasiswa?.nim ?? "-"}
                </p>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span>
                    Peringkat:{" "}
                    <strong>
                      {selectedStudent.peringkat ?? "-"}
                    </strong>
                  </span>

                  <span>
                    Nilai preferensi:{" "}
                    <strong className="text-emerald-700">
                      {formatNilai(selectedStudent.nilai_preferensi)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Rincian nilai kriteria */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-800">
                  Rincian Nilai Kriteria
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ["C1 - IPK", formatIPK(selectedStudent.nilai_c1)],
                    ["C2 - Inggris", formatNilai(selectedStudent.nilai_c2)],
                    ["C3 - Organisasi", formatNilai(selectedStudent.nilai_c3)],
                    ["C4 - Karya", formatNilai(selectedStudent.nilai_c4)],
                    ["C5 - Prestasi", formatNilai(selectedStudent.nilai_c5)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-gray-100 p-3"
                    >
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hasil penjelasan AI */}
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-violet-900">
                  <Sparkles size={17} />
                  Penjelasan Hasil SAW
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-2 py-5 text-sm text-violet-700">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    AI sedang menyiapkan penjelasan...
                  </div>
                ) : aiError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-700">
                      {aiError}
                    </p>

                    <button
                      onClick={() =>
                        void handleAIExplanation(selectedStudent)
                      }
                      disabled={aiLoading}
                      className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                    >
                      Coba Lagi
                    </button>
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
                    {aiExplanation}
                  </p>
                )}
              </div>

              <p className="text-xs leading-5 text-gray-500">
                Penjelasan AI bersifat informatif. Nilai preferensi dan
                peringkat tetap ditentukan oleh perhitungan metode SAW.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </p>
        </div>

        <div className={`rounded-lg p-3 ${styles[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
