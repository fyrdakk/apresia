"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Upload,
    FileText,
    Download,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    RefreshCw,
    XCircle,
} from "lucide-react";

type Portofolio = {
    id: string;
    judul: string;
    kategori: string;
};

type Dokumen = {
    id: string;
    mahasiswa_id: string;
    portofolio_id: string;
    kategori: string;
    nama_file: string;
    storage_path: string;
    tipe_file: string;
    ukuran_file: number;
    status_verifikasi: string;
    catatan_admin: string | null;
    created_at: string;
};

// Nilai value harus sesuai dengan constraint dokumen_bukti_kategori_check di Supabase.
// Karya Ilmiah dan PKM dipisahkan, tetapi keduanya tetap termasuk kriteria SAW C4.
const KATEGORI_DOKUMEN = [
    { value: "organisasi", label: "Organisasi" },
    { value: "karya_ilmiah", label: "Karya Ilmiah" },
    { value: "pkm", label: "Program Kreativitas Mahasiswa (PKM)" },
    { value: "kontribusi", label: "Kontribusi Mahasiswa" },
    { value: "prestasi", label: "Prestasi / Penghargaan" },
    { value: "sertifikasi", label: "Sertifikasi" },
];

const getKategoriLabel = (value: string) =>
    KATEGORI_DOKUMEN.find((item) => item.value === value)?.label ?? value;

export default function DokumenPage() {
    const supabase = useMemo(() => createClient(), []);

    const [userId, setUserId] = useState("");
    const [portofolio, setPortofolio] = useState<Portofolio[]>([]);
    const [dokumen, setDokumen] = useState<Dokumen[]>([]);

    const [portofolioId, setPortofolioId] = useState("");
    const [kategori, setKategori] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [reuploadingId, setReuploadingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
            }

            setUserId(user.id);

            const [portofolioResult, dokumenResult] = await Promise.all([
                supabase
                    .from("portofolio")
                    .select("id, judul, kategori")
                    .eq("mahasiswa_id", user.id)
                    .order("created_at", { ascending: false }),

                supabase
                    .from("dokumen_bukti")
                    .select("*")
                    .eq("mahasiswa_id", user.id)
                    .order("created_at", { ascending: false }),
            ]);

            if (portofolioResult.error) throw portofolioResult.error;
            if (dokumenResult.error) throw dokumenResult.error;

            setPortofolio(portofolioResult.data || []);
            setDokumen(dokumenResult.data || []);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Gagal memuat data dokumen.";

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpload = async () => {
        setError("");
        setSuccess("");

        if (!portofolioId) {
            setError("Pilih portofolio yang berkaitan dengan dokumen.");
            return;
        }

        if (!kategori) {
            setError("Pilih kategori dokumen.");
            return;
        }

        if (!file) {
            setError("Pilih file yang ingin diunggah.");
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError("Format file harus PDF, JPG, atau PNG.");
            return;
        }

        const maxSize = 2 * 1024 * 1024;

        if (file.size > maxSize) {
            setError("Ukuran file maksimal 2 MB.");
            return;
        }

        setUploading(true);

        try {
            const extension = file.name.split(".").pop()?.toLowerCase() || "file";
            const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from("dokumen-bukti")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type,
                });

            if (uploadError) throw uploadError;

            const { error: insertError } = await supabase
                .from("dokumen_bukti")
                .insert({
                    mahasiswa_id: userId,
                    portofolio_id: portofolioId,
                    kategori,
                    nama_file: file.name,
                    storage_path: filePath,
                    tipe_file: file.type,
                    ukuran_file: file.size,
                    status_verifikasi: "menunggu",
                });

            if (insertError) {
                // Hapus file dari Storage jika penyimpanan metadata gagal.
                await supabase.storage
                    .from("dokumen-bukti")
                    .remove([filePath]);

                throw insertError;
            }

            setFile(null);
            setKategori("");
            setPortofolioId("");
            setSuccess("Dokumen berhasil diunggah dan menunggu verifikasi admin.");

            const input = document.getElementById(
                "file-upload"
            ) as HTMLInputElement | null;

            if (input) input.value = "";

            await loadData();
        } catch (err) {
            const detail = err as {
                message?: string;
                details?: string;
                hint?: string;
                code?: string;
            };

            console.error("Gagal mengunggah dokumen:", detail);

            setError(
                detail.message ||
                detail.details ||
                "Gagal mengunggah dokumen. Periksa koneksi dan kebijakan Supabase."
            );
        } finally {
            setUploading(false);
        }
    };

    // Unggah bukti pengganti untuk dokumen yang diminta revisi atau ditolak.
    // Setelah bukti pengganti berhasil tersimpan, dokumen lama dihapus dari daftar mahasiswa.
    const handleReupload = async (item: Dokumen, selectedFile: File) => {
        setError("");
        setSuccess("");

        if (
            item.status_verifikasi !== "perlu_revisi" &&
            item.status_verifikasi !== "ditolak"
        ) {
            setError("Unggah ulang hanya tersedia untuk dokumen yang perlu revisi atau ditolak.");
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            setError("Format file harus PDF, JPG, atau PNG.");
            return;
        }

        if (selectedFile.size > 2 * 1024 * 1024) {
            setError("Ukuran file maksimal 2 MB.");
            return;
        }

        setReuploadingId(item.id);

        let uploadedPath: string | null = null;

        try {
            if (!userId) {
                throw new Error("Sesi mahasiswa tidak ditemukan. Silakan login kembali.");
            }

            const extension =
                selectedFile.name.split(".").pop()?.toLowerCase() || "file";
            const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
            uploadedPath = filePath;

            const { error: uploadError } = await supabase.storage
                .from("dokumen-bukti")
                .upload(filePath, selectedFile, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: selectedFile.type,
                });

            if (uploadError) throw uploadError;

            const { error: insertError } = await supabase
                .from("dokumen_bukti")
                .insert({
                    mahasiswa_id: userId,
                    portofolio_id: item.portofolio_id,
                    kategori: item.kategori,
                    nama_file: selectedFile.name,
                    storage_path: filePath,
                    tipe_file: selectedFile.type,
                    ukuran_file: selectedFile.size,
                    status_verifikasi: "menunggu",
                    catatan_admin: null,
                });

            if (insertError) throw insertError;

            // Hapus metadata dokumen lama setelah dokumen pengganti berhasil disimpan.
            // Ini mencegah dokumen berstatus revisi/ditolak tetap tampil di daftar mahasiswa.
            const { error: deleteOldError } = await supabase
                .from("dokumen_bukti")
                .delete()
                .eq("id", item.id)
                .eq("mahasiswa_id", userId);

            if (deleteOldError) {
                throw new Error(
                    `Bukti pengganti berhasil diunggah, tetapi dokumen lama gagal dihapus: ${deleteOldError.message}`
                );
            }

            // Hapus file lama dari Storage. Jika gagal, data baru tetap aman;
            // kegagalan pembersihan file dicatat di console untuk ditindaklanjuti.
            const { error: removeOldFileError } = await supabase.storage
                .from("dokumen-bukti")
                .remove([item.storage_path]);

            if (removeOldFileError) {
                console.error("File bukti lama gagal dihapus dari Storage:", removeOldFileError);
            }

            setSuccess(
                "Bukti pengganti berhasil diunggah. Dokumen lama yang diminta revisi/ditolak telah dihapus dari daftar. Dokumen baru menunggu verifikasi admin."
            );
            await loadData();
        } catch (err) {
            if (uploadedPath) {
                await supabase.storage
                    .from("dokumen-bukti")
                    .remove([uploadedPath]);
            }

            const detail = err as { message?: string; code?: string };
            console.error("Gagal mengunggah ulang dokumen:", detail);
            setError(detail.message || "Gagal mengunggah ulang dokumen.");
        } finally {
            setReuploadingId(null);
        }
    };

    const handleDownload = async (item: Dokumen) => {
        try {
            const { data, error: urlError } = await supabase.storage
                .from("dokumen-bukti")
                .createSignedUrl(item.storage_path, 60);

            if (urlError) throw urlError;

            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Gagal membuka dokumen.";

            setError(message);
        }
    };

    const handleDelete = async (item: Dokumen) => {
        const allowed =
            item.status_verifikasi === "menunggu" ||
            item.status_verifikasi === "perlu_revisi" ||
            item.status_verifikasi === "ditolak";

        if (!allowed) {
            setError("Dokumen yang sudah tervalidasi tidak dapat dihapus.");
            return;
        }

        const confirmed = window.confirm(
            `Hapus dokumen "${item.nama_file}"?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            const { error: deleteError } = await supabase
                .from("dokumen_bukti")
                .delete()
                .eq("id", item.id)
                .eq("mahasiswa_id", userId);

            if (deleteError) throw deleteError;

            const { error: storageError } = await supabase.storage
                .from("dokumen-bukti")
                .remove([item.storage_path]);

            if (storageError) {
                console.error("File Storage belum terhapus:", storageError);
            }

            setSuccess("Dokumen berhasil dihapus.");
            await loadData();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Gagal menghapus dokumen.";

            setError(message);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const statusInfo = (status: string) => {
        switch (status) {
            case "tervalidasi":
                return {
                    label: "Tervalidasi",
                    icon: CheckCircle2,
                    style: "bg-green-50 text-green-700 border-green-200",
                };
            case "perlu_revisi":
                return {
                    label: "Perlu Revisi",
                    icon: RefreshCw,
                    style: "bg-amber-50 text-amber-700 border-amber-200",
                };
            case "ditolak":
                return {
                    label: "Ditolak",
                    icon: XCircle,
                    style: "bg-red-50 text-red-700 border-red-200",
                };
            default:
                return {
                    label: "Menunggu",
                    icon: Clock,
                    style: "bg-blue-50 text-blue-700 border-blue-200",
                };
        }
    };

    if (loading) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-700" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-5 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Dokumen Pendukung
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Unggah dan pantau status verifikasi dokumen bukti prestasi
                        atau kontribusi Anda.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Unggah Dokumen
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Format PDF, JPG, atau PNG. Ukuran maksimal 2 MB.
                        </p>
                    </div>

                    {portofolio.length === 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <p className="font-semibold">
                                Anda belum memiliki data portofolio.
                            </p>
                            <p className="mt-1">
                                Tambahkan portofolio prestasi terlebih dahulu agar
                                dokumen dapat dikaitkan dengan data yang sesuai.
                            </p>
                            <a
                                href="/mahasiswa/portofolio_prestasi"
                                className="mt-3 inline-block font-semibold underline"
                            >
                                Buka halaman Portofolio Prestasi
                            </a>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Portofolio Terkait
                                </label>
                                <select
                                    value={portofolioId}
                                    onChange={(e) => setPortofolioId(e.target.value)}
                                    required
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                >
                                    <option value="">Pilih portofolio</option>
                                    {portofolio.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.judul}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Kategori Dokumen
                                </label>
                                <select
                                    value={kategori}
                                    onChange={(e) => setKategori(e.target.value)}
                                    required
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                >
                                    <option value="">Pilih kategori</option>
                                    {KATEGORI_DOKUMEN.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Pilih File
                                </label>

                                <label
                                    htmlFor="file-upload"
                                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center transition hover:border-green-500 hover:bg-green-50"
                                >
                                    <Upload className="mb-3 h-9 w-9 text-green-700" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        {file ? file.name : "Klik untuk memilih dokumen"}
                                    </span>
                                    <span className="mt-1 text-xs text-gray-500">
                                        PDF, JPG, atau PNG (maksimal 2 MB)
                                    </span>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                        className="hidden"
                                        onChange={(e) => {
                                            const selectedFile = e.target.files?.[0] || null;
                                            setError("");
                                            setSuccess("");

                                            if (!selectedFile) {
                                                setFile(null);
                                                return;
                                            }

                                            const allowedTypes = [
                                                "application/pdf",
                                                "image/jpeg",
                                                "image/png",
                                            ];

                                            if (!allowedTypes.includes(selectedFile.type)) {
                                                setFile(null);
                                                e.target.value = "";
                                                setError("Format file harus PDF, JPG, atau PNG.");
                                                return;
                                            }

                                            if (selectedFile.size > 2 * 1024 * 1024) {
                                                setFile(null);
                                                e.target.value = "";
                                                setError("Ukuran file maksimal 2 MB.");
                                                return;
                                            }

                                            setFile(selectedFile);
                                        }}
                                    />
                                </label>

                                {file && (
                                    <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-sm">
                                        <span className="truncate text-gray-700">
                                            {file.name} · {formatSize(file.size)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFile(null);
                                                const input = document.getElementById(
                                                    "file-upload"
                                                ) as HTMLInputElement | null;
                                                if (input) input.value = "";
                                            }}
                                            className="ml-3 text-red-600 hover:text-red-700"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={uploading || portofolio.length === 0}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Mengunggah...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            Unggah Dokumen
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Dokumen Saya
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Daftar dokumen yang sudah Anda unggah.
                            </p>
                        </div>
                        <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                            {dokumen.length} Dokumen
                        </span>
                    </div>

                    {dokumen.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
                            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                            <p className="font-medium text-gray-700">
                                Belum ada dokumen
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                Dokumen yang Anda unggah akan muncul di sini.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dokumen.map((item) => {
                                const status = statusInfo(item.status_verifikasi);
                                const StatusIcon = status.icon;

                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-lg border border-gray-200 p-4"
                                    >
                                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                                                    <FileText size={22} />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="break-all font-semibold text-gray-900">
                                                        {item.nama_file}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {getKategoriLabel(item.kategori)}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        {formatSize(item.ukuran_file)} · Diunggah{" "}
                                                        {formatDate(item.created_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.style}`}
                                                >
                                                    <StatusIcon size={14} />
                                                    {status.label}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(item)}
                                                    className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                                                    title="Unduh dokumen"
                                                >
                                                    <Download size={17} />
                                                </button>

                                                {(item.status_verifikasi === "perlu_revisi" ||
                                                    item.status_verifikasi === "ditolak") && (
                                                    <label
                                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 ${
                                                            reuploadingId === item.id
                                                                ? "pointer-events-none opacity-60"
                                                                : ""
                                                        }`}
                                                    >
                                                        {reuploadingId === item.id ? (
                                                            <Loader2 size={15} className="animate-spin" />
                                                        ) : (
                                                            <Upload size={15} />
                                                        )}
                                                        {reuploadingId === item.id
                                                            ? "Mengunggah..."
                                                            : "Unggah Ulang"}
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                                            className="hidden"
                                                            disabled={reuploadingId === item.id}
                                                            onChange={(e) => {
                                                                const selectedFile =
                                                                    e.target.files?.[0] || null;
                                                                e.currentTarget.value = "";
                                                                if (selectedFile) {
                                                                    void handleReupload(item, selectedFile);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                )}

                                                {item.status_verifikasi !== "tervalidasi" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(item)}
                                                        className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                                        title="Hapus dokumen"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {item.catatan_admin && (
                                            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                                <p className="font-semibold">Catatan Admin</p>
                                                <p className="mt-1">{item.catatan_admin}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
