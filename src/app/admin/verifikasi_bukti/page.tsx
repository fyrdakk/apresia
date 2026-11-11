"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    FileCheck,
    FileClock,
    FileText,
    Search,
    RefreshCw,
    Eye,
    CheckCircle2,
    XCircle,
    AlertCircle,
    X,
    Save,
} from "lucide-react";

type Dokumen = {
    id: string;
    mahasiswa_id: string;
    portofolio_id: string | null;
    kategori: string;
    nama_file: string;
    storage_path: string;
    tipe_file: string | null;
    ukuran_file: number | null;
    status_verifikasi: string;
    catatan_admin: string | null;
    tanggal_verifikasi: string | null;
    created_at: string;
};

type Mahasiswa = {
    id: string;
    nim: string | null;
    nama_lengkap: string | null;
    prodi: string | null;
};

type DokumenDenganMahasiswa = Dokumen & {
    mahasiswa: Mahasiswa | null;
};

type StatusFilter =
    | "semua"
    | "menunggu"
    | "tervalidasi"
    | "perlu_revisi"
    | "ditolak";

export default function VerifikasiBuktiPage() {
    const supabase = createClient();

    const [dokumen, setDokumen] = useState<DokumenDenganMahasiswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] =
        useState<StatusFilter>("semua");

    const [selected, setSelected] =
        useState<DokumenDenganMahasiswa | null>(null);

    const [catatan, setCatatan] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");

    async function fetchDokumen() {
        setLoading(true);
        setError("");

        try {
            const { data: dokumenData, error: dokumenError } =
                await supabase
                    .from("dokumen_bukti")
                    .select(
                        "id, mahasiswa_id, portofolio_id, kategori, nama_file, storage_path, tipe_file, ukuran_file, status_verifikasi, catatan_admin, tanggal_verifikasi, created_at"
                    )
                    .order("created_at", { ascending: false });

            if (dokumenError) throw dokumenError;

            const mahasiswaIds = [
                ...new Set(
                    (dokumenData ?? []).map((item) => item.mahasiswa_id)
                ),
            ];

            let mahasiswaData: Mahasiswa[] = [];

            if (mahasiswaIds.length > 0) {
                const { data, error: mahasiswaError } = await supabase
                    .from("login")
                    .select("id, nim, nama_lengkap, prodi")
                    .in("id", mahasiswaIds);

                if (mahasiswaError) throw mahasiswaError;

                mahasiswaData = data ?? [];
            }

            const hasil: DokumenDenganMahasiswa[] = (
                dokumenData ?? []
            ).map((item) => ({
                ...item,
                mahasiswa:
                    mahasiswaData.find(
                        (mahasiswa) => mahasiswa.id === item.mahasiswa_id
                    ) ?? null,
            }));

            setDokumen(hasil);
        } catch (err) {
            console.error("Gagal mengambil dokumen:", err);
            setError(
                "Data dokumen gagal dimuat. Periksa nama kolom, koneksi Supabase, dan kebijakan RLS."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDokumen();
    }, []);

    const jumlahMenunggu = dokumen.filter(
        (item) => item.status_verifikasi === "menunggu"
    ).length;

    const jumlahTervalidasi = dokumen.filter(
        (item) => item.status_verifikasi === "tervalidasi"
    ).length;

    const jumlahRevisi = dokumen.filter(
        (item) => item.status_verifikasi === "perlu_revisi"
    ).length;

    const filteredDokumen = dokumen.filter((item) => {
        const keyword = search.toLowerCase();

        const cocokPencarian =
            (item.nama_file ?? "").toLowerCase().includes(keyword) ||
            (item.kategori ?? "").toLowerCase().includes(keyword) ||
            (item.mahasiswa?.nama_lengkap ?? "")
                .toLowerCase()
                .includes(keyword) ||
            (item.mahasiswa?.nim ?? "").toLowerCase().includes(keyword);

        const cocokStatus =
            filterStatus === "semua" ||
            item.status_verifikasi === filterStatus;

        return cocokPencarian && cocokStatus;
    });

    function getStatusStyle(status: string) {
        switch (status) {
            case "tervalidasi":
                return "bg-emerald-50 text-emerald-700";

            case "menunggu":
                return "bg-amber-50 text-amber-700";

            case "perlu_revisi":
                return "bg-blue-50 text-blue-700";

            case "ditolak":
                return "bg-red-50 text-red-700";

            default:
                return "bg-slate-100 text-slate-600";
        }
    }

    function getStatusLabel(status: string) {
        switch (status) {
            case "tervalidasi":
                return "Tervalidasi";
            case "menunggu":
                return "Menunggu";
            case "perlu_revisi":
                return "Perlu Revisi";
            case "ditolak":
                return "Ditolak";
            default:
                return status;
        }
    }

    function formatKategori(kategori: string) {
        return kategori
            .replaceAll("_", " ")
            .replace(/\b\w/g, (huruf) => huruf.toUpperCase());
    }

    function formatUkuran(ukuran: number | null) {
        if (ukuran === null) return "-";

        if (ukuran < 1024 * 1024) {
            return `${(ukuran / 1024).toFixed(1)} KB`;
        }

        return `${(ukuran / (1024 * 1024)).toFixed(2)} MB`;
    }

    function formatTanggal(tanggal: string) {
        return new Date(tanggal).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    }

    function openDetail(item: DokumenDenganMahasiswa) {
        setSelected(item);
        setCatatan(item.catatan_admin ?? "");
        setPreviewUrl("");
        setError("");
        setSuccess("");
    }

    async function lihatDokumen(item: DokumenDenganMahasiswa) {
        try {
            setError("");

            // Sesuaikan nama bucket dengan bucket Supabase Storage.
            const { data, error } = await supabase.storage
                .from("dokumen-bukti")
                .createSignedUrl(item.storage_path, 300);

            if (error) throw error;

            if (!data?.signedUrl) {
                throw new Error("URL dokumen tidak tersedia.");
            }

            setPreviewUrl(data.signedUrl);
            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error("Gagal membuka dokumen:", err);
            setError(
                "Dokumen gagal dibuka. Pastikan bucket dokumen-bukti tersedia dan storage_path sesuai."
            );
        }
    }

    async function updateStatus(
        status: "tervalidasi" | "perlu_revisi" | "ditolak"
    ) {
        if (!selected) return;

        if (
            (status === "perlu_revisi" || status === "ditolak") &&
            !catatan.trim()
        ) {
            setError("Catatan admin wajib diisi untuk keputusan ini.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) throw authError;

            if (!user) {
                throw new Error("Sesi admin tidak ditemukan. Silakan login kembali.");
            }

            const { data, error } = await supabase
                .from("dokumen_bukti")
                .update({
                    status_verifikasi: status,
                    catatan_admin: catatan.trim() || null,
                    diverifikasi_oleh: user.id,
                    tanggal_verifikasi: new Date().toISOString(),
                })
                .eq("id", selected.id)
                .select("id, status_verifikasi")
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                throw new Error(
                    "Status tidak berubah. Periksa policy UPDATE RLS dan pastikan akun memiliki role admin."
                );
            }

            if (data.status_verifikasi !== status) {
                throw new Error("Status dokumen tidak sesuai dengan keputusan admin.");
            }

            setSuccess("Status dokumen berhasil diperbarui.");

            setSelected(null);
            setCatatan("");
            setPreviewUrl("");

            await fetchDokumen();
        } catch (err) {
            console.error("Gagal memperbarui status:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Status dokumen gagal diperbarui."
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
                    APRESIA / ADMIN / VERIFIKASI BUKTI
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                            Verifikasi Bukti
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Periksa dan validasi dokumen prestasi mahasiswa.
                        </p>
                    </div>

                    <button
                        onClick={fetchDokumen}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
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
                    <AlertCircle size={19} className="shrink-0" />
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
            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: "Total Dokumen",
                        value: dokumen.length,
                        icon: FileText,
                        color: "bg-purple-50 text-purple-600",
                    },
                    {
                        label: "Menunggu Verifikasi",
                        value: jumlahMenunggu,
                        icon: FileClock,
                        color: "bg-amber-50 text-amber-600",
                    },
                    {
                        label: "Tervalidasi",
                        value: jumlahTervalidasi,
                        icon: FileCheck,
                        color: "bg-emerald-50 text-emerald-600",
                    },
                    {
                        label: "Perlu Revisi",
                        value: jumlahRevisi,
                        icon: AlertCircle,
                        color: "bg-blue-50 text-blue-600",
                    },
                ].map((item) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">
                                        {item.label}
                                    </p>
                                    <h2 className="mt-2 text-3xl font-bold text-slate-800">
                                        {loading ? "..." : item.value}
                                    </h2>
                                </div>

                                <div className={`rounded-xl p-3 ${item.color}`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Daftar Dokumen */}
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
                    <div>
                        <h2 className="font-bold text-slate-800">
                            Daftar Dokumen Mahasiswa
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Periksa dokumen sebelum digunakan dalam penilaian SAW.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari mahasiswa, NIM..."
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 sm:w-60"
                            />
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) =>
                                setFilterStatus(e.target.value as StatusFilter)
                            }
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-500"
                        >
                            <option value="semua">Semua Status</option>
                            <option value="menunggu">Menunggu</option>
                            <option value="tervalidasi">Tervalidasi</option>
                            <option value="perlu_revisi">Perlu Revisi</option>
                            <option value="ditolak">Ditolak</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-5 py-4">No.</th>
                                <th className="px-5 py-4">Mahasiswa</th>
                                <th className="px-5 py-4">Kategori</th>
                                <th className="px-5 py-4">Nama Dokumen</th>
                                <th className="px-5 py-4">Tanggal Upload</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                                        <RefreshCw
                                            size={22}
                                            className="mx-auto mb-3 animate-spin"
                                        />
                                        Memuat dokumen...
                                    </td>
                                </tr>
                            ) : filteredDokumen.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <FileText
                                            size={30}
                                            className="mx-auto mb-3 text-slate-300"
                                        />
                                        <p className="font-medium text-slate-600">
                                            Dokumen tidak ditemukan
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Belum ada dokumen atau tidak sesuai pencarian.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDokumen.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-emerald-50/40">
                                        <td className="px-5 py-4 text-slate-500">
                                            {index + 1}
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-800">
                                                {item.mahasiswa?.nama_lengkap || "Mahasiswa"}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {item.mahasiswa?.nim || "-"}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 text-slate-600">
                                            {formatKategori(item.kategori)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="max-w-48 truncate font-medium text-slate-700">
                                                {item.nama_file}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {formatUkuran(item.ukuran_file)}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 text-slate-500">
                                            {formatTanggal(item.created_at)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${getStatusStyle(item.status_verifikasi)}`}
                                            >
                                                {getStatusLabel(item.status_verifikasi)}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => openDetail(item)}
                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                            >
                                                <Eye size={15} />
                                                Periksa
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                    Menampilkan {filteredDokumen.length} dari {dokumen.length} dokumen.
                </div>
            </section>

            {/* Modal Pemeriksaan */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Pemeriksaan Dokumen
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Periksa informasi dan bukti mahasiswa.
                                </p>
                            </div>

                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs text-slate-400">Nama Mahasiswa</p>
                                <p className="mt-1 font-semibold text-slate-800">
                                    {selected.mahasiswa?.nama_lengkap || "-"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    NIM: {selected.mahasiswa?.nim || "-"}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400">Kategori</p>
                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {formatKategori(selected.kategori)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">Tanggal Upload</p>
                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {formatTanggal(selected.created_at)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">Nama File</p>
                                    <p className="mt-1 break-all text-sm font-medium text-slate-700">
                                        {selected.nama_file}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">Ukuran File</p>
                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {formatUkuran(selected.ukuran_file)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-sm font-semibold text-slate-700">
                                    File Bukti
                                </p>

                                <button
                                    onClick={() => lihatDokumen(selected)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                    <Eye size={17} />
                                    Lihat / Buka Dokumen
                                </button>

                                <p className="mt-2 text-xs text-slate-400">
                                    Pastikan bucket Storage bernama dokumen-bukti atau sesuaikan
                                    nama bucket pada kode.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Catatan Admin
                                </label>
                                <textarea
                                    rows={3}
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    placeholder="Masukkan catatan pemeriksaan..."
                                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                    Wajib diisi apabila dokumen perlu revisi atau ditolak.
                                </p>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="mb-3 text-sm font-semibold text-slate-700">
                                    Keputusan Verifikasi
                                </p>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <button
                                        onClick={() => updateStatus("tervalidasi")}
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                    >
                                        <CheckCircle2 size={16} />
                                        Validasi
                                    </button>

                                    <button
                                        onClick={() => updateStatus("perlu_revisi")}
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                                    >
                                        <AlertCircle size={16} />
                                        Revisi
                                    </button>

                                    <button
                                        onClick={() => updateStatus("ditolak")}
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                        <XCircle size={16} />
                                        Tolak
                                    </button>
                                </div>

                                {saving && (
                                    <p className="mt-3 text-center text-xs text-slate-400">
                                        Menyimpan keputusan...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}