"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Plus,
    Pencil,
    Trash2,
    Award,
    BookOpen,
    Users,
    FileText,
    Loader2,
    X,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    RefreshCw,
} from "lucide-react";

type Portofolio = {
    id: string;
    mahasiswa_id: string;
    kategori: string;
    judul: string;
    penyelenggara: string;
    jabatan: string | null;
    tingkat: string;
    tahun: number;
    deskripsi: string | null;
    created_at: string;
};

type FormData = {
    kategori: string;
    judul: string;
    penyelenggara: string;
    jabatan: string;
    tingkat: string;
    tahun: string;
    deskripsi: string;
};

const initialForm: FormData = {
    kategori: "",
    judul: "",
    penyelenggara: "",
    jabatan: "",
    tingkat: "",
    tahun: String(new Date().getFullYear()),
    deskripsi: "",
};

const kategoriOptions = [
    "Organisasi",
    "Karya Ilmiah",
    "Program Kreativitas Mahasiswa (PKM)",
    "Kontribusi Mahasiswa",
    "Prestasi / Penghargaan",
    "Sertifikasi",
];

const tingkatOptions = [
    "Universitas",
    "Regional",
    "Nasional",
    "Internasional",
    "Lainnya",
];

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;

    if (err && typeof err === "object") {
        const e = err as Record<string, unknown>;

        const parts = [
            e.message,
            e.details,
            e.hint,
            e.code ? `Kode: ${e.code}` : null,
        ].filter(Boolean);

        if (parts.length) return parts.join(" | ");
    }

    return "Terjadi kesalahan yang tidak diketahui.";
}

export default function PortofolioPrestasiPage() {
    // Client dibuat satu kali agar tidak berubah setiap render.
    const supabase = useMemo(() => createClient(), []);

    const [userId, setUserId] = useState("");
    const [items, setItems] = useState<Portofolio[]>([]);

    const [form, setForm] = useState<FormData>(initialForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

            if (authError) throw authError;

            if (!user) {
                throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
            }

            setUserId(user.id);

            const { data, error: queryError } = await supabase
                .from("portofolio")
                .select(
                    "id, mahasiswa_id, kategori, judul, penyelenggara, jabatan, tingkat, tahun, deskripsi, created_at"
                )
                .eq("mahasiswa_id", user.id)
                .order("tahun", { ascending: false });

            if (queryError) {
                throw new Error(
                    `Gagal mengambil data portofolio: ${getErrorMessage(queryError)}`
                );
            }

            setItems((data || []) as Portofolio[]);
        } catch (err) {
            console.error("LOAD PORTOFOLIO:", err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const updateField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const openAddForm = () => {
        setForm(initialForm);
        setEditingId(null);
        setError("");
        setSuccess("");
        setShowForm(true);
    };

    const openEditForm = (item: Portofolio) => {
        setForm({
            kategori: item.kategori,
            judul: item.judul,
            penyelenggara: item.penyelenggara,
            jabatan: item.jabatan || "",
            tingkat: item.tingkat,
            tahun: String(item.tahun),
            deskripsi: item.deskripsi || "",
        });

        setEditingId(item.id);
        setError("");
        setSuccess("");
        setShowForm(true);
    };

    const handleSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (saving) return;

        setError("");
        setSuccess("");

        const judul = form.judul.trim();
        const penyelenggara = form.penyelenggara.trim();
        const tahun = Number(form.tahun);

        if (
            !form.kategori ||
            !judul ||
            !penyelenggara ||
            !form.tingkat ||
            !form.tahun
        ) {
            setError("Lengkapi seluruh kolom yang wajib diisi.");
            return;
        }

        if (
            !Number.isInteger(tahun) ||
            tahun < 1900 ||
            tahun > new Date().getFullYear()
        ) {
            setError("Tahun tidak valid.");
            return;
        }

        setSaving(true);

        try {
            // Ambil identitas langsung dari sesi Supabase.
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) throw authError;

            if (!user) {
                throw new Error("Sesi login berakhir. Silakan login kembali.");
            }

            const payload = {
                mahasiswa_id: user.id,
                kategori: form.kategori,
                judul,
                penyelenggara,
                jabatan: form.jabatan.trim() || null,
                tingkat: form.tingkat,
                tahun,
                deskripsi: form.deskripsi.trim() || null,
            };

            if (editingId) {
                const { error: updateError, count } = await supabase
                    .from("portofolio")
                    .update({
                        kategori: payload.kategori,
                        judul: payload.judul,
                        penyelenggara: payload.penyelenggara,
                        jabatan: payload.jabatan,
                        tingkat: payload.tingkat,
                        tahun: payload.tahun,
                        deskripsi: payload.deskripsi,
                    })
                    .eq("id", editingId)
                    .eq("mahasiswa_id", user.id);

                if (updateError) {
                    throw new Error(
                        `Gagal memperbarui portofolio: ${getErrorMessage(updateError)}`
                    );
                }

                setSuccess("Portofolio berhasil diperbarui.");
            } else {
                const { error: insertError } = await supabase
                    .from("portofolio")
                    .insert(payload);

                if (insertError) {
                    throw new Error(
                        `Gagal menambahkan portofolio: ${getErrorMessage(insertError)}`
                    );
                }

                setSuccess("Portofolio berhasil ditambahkan.");
            }

            setShowForm(false);
            setEditingId(null);
            setForm(initialForm);

            // Ambil ulang data setelah penyimpanan berhasil.
            await loadData();
        } catch (err) {
            console.error("KESALAHAN SIMPAN PORTOFOLIO:", err);
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: Portofolio) => {
        const confirmed = window.confirm(
            `Apakah Anda yakin ingin menghapus "${item.judul}"?`
        );

        if (!confirmed || deletingId) return;

        setError("");
        setSuccess("");
        setDeletingId(item.id);

        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) throw authError;
            if (!user) throw new Error("Sesi login tidak ditemukan.");

            const { error: deleteError } = await supabase
                .from("portofolio")
                .delete()
                .eq("id", item.id)
                .eq("mahasiswa_id", user.id);

            if (deleteError) {
                throw new Error(
                    `Gagal menghapus portofolio: ${getErrorMessage(deleteError)}`
                );
            }

            setSuccess("Portofolio berhasil dihapus.");
            await loadData();
        } catch (err) {
            console.error("KESALAHAN HAPUS PORTOFOLIO:", err);
            setError(getErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    };

    const getIcon = (kategori: string) => {
        if (kategori === "Organisasi") return Users;
        if (
            kategori === "Karya Ilmiah" ||
            kategori === "Program Kreativitas Mahasiswa (PKM)" ||
            kategori === "Karya Ilmiah / PKM"
        ) return BookOpen;
        if (kategori === "Sertifikasi") return FileText;
        return Award;
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

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

                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Portofolio Prestasi
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Kelola prestasi, organisasi, karya ilmiah, sertifikasi,
                            dan kontribusi Anda.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openAddForm}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
                    >
                        <Plus size={18} />
                        Tambah Portofolio
                    </button>
                </div>

                {/* Pesan */}
                {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle size={20} className="shrink-0" />
                        <p className="break-words">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        <CheckCircle2 size={20} className="shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                {/* Statistik */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            label: "Total Portofolio",
                            value: items.length,
                            icon: Award,
                        },
                        {
                            label: "Prestasi",
                            value: items.filter((i) =>
                                i.kategori.includes("Prestasi")
                            ).length,
                            icon: Award,
                        },
                        {
                            label: "Organisasi",
                            value: items.filter((i) => i.kategori === "Organisasi").length,
                            icon: Users,
                        },
                        {
                            label: "Karya Ilmiah & PKM",
                            value: items.filter(
                                (i) =>
                                    i.kategori === "Karya Ilmiah" ||
                                    i.kategori === "Program Kreativitas Mahasiswa (PKM)" ||
                                    i.kategori === "Karya Ilmiah / PKM"
                            ).length,
                            icon: BookOpen,
                        },
                    ].map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <div
                                key={stat.label}
                                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500">{stat.label}</p>
                                    <Icon size={20} className="text-green-700" />
                                </div>
                                <p className="mt-3 text-2xl font-bold text-gray-900">
                                    {stat.value}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Daftar Portofolio */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Daftar Portofolio
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Data pengalaman dan pencapaian Anda.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadData}
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                            title="Muat ulang"
                        >
                            <RefreshCw size={17} />
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 py-14 text-center">
                            <Award className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                            <h3 className="font-semibold text-gray-800">
                                Belum ada portofolio
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Tambahkan prestasi atau pengalaman pertama Anda.
                            </p>
                            <button
                                type="button"
                                onClick={openAddForm}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                            >
                                <Plus size={16} />
                                Tambah Portofolio
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {items.map((item) => {
                                const Icon = getIcon(item.kategori);

                                return (
                                    <article
                                        key={item.id}
                                        className="rounded-xl border border-gray-200 p-5 transition hover:border-green-300"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                                                    <Icon size={22} />
                                                </div>

                                                <div className="min-w-0">
                                                    <span className="text-xs font-semibold text-green-700">
                                                        {item.kategori}
                                                    </span>
                                                    <h3 className="mt-1 break-words font-semibold text-gray-900">
                                                        {item.judul}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditForm(item)}
                                                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-700"
                                                    title="Edit"
                                                >
                                                    <Pencil size={17} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item)}
                                                    disabled={deletingId === item.id}
                                                    className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                    title="Hapus"
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 size={17} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={17} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                                            <p>
                                                <span className="font-medium text-gray-800">
                                                    Penyelenggara:
                                                </span>{" "}
                                                {item.penyelenggara}
                                            </p>

                                            {item.jabatan && (
                                                <p>
                                                    <span className="font-medium text-gray-800">
                                                        Jabatan/Peran:
                                                    </span>{" "}
                                                    {item.jabatan}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                                                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                                                    {item.tingkat}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays size={14} />
                                                    {item.tahun}
                                                </span>
                                            </div>
                                        </div>

                                        {item.deskripsi && (
                                            <p className="mt-4 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-600">
                                                {item.deskripsi}
                                            </p>
                                        )}

                                        <div className="mt-4 border-t border-gray-100 pt-3">
                                            <a
                                                href="/mahasiswa/dokumen"
                                                className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
                                            >
                                                <FileText size={16} />
                                                Kelola Dokumen Bukti
                                            </a>
                                        </div>

                                        <p className="mt-3 text-xs text-gray-400">
                                            Ditambahkan {formatDate(item.created_at)}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Form Tambah/Edit */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                        <div className="my-auto w-full max-w-2xl rounded-xl bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-200 p-5">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {editingId ? "Edit Portofolio" : "Tambah Portofolio"}
                                    </h2>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Lengkapi informasi portofolio Anda.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    disabled={saving}
                                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                                    aria-label="Tutup formulir"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4 p-5">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Kategori <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.kategori}
                                        onChange={(e) => updateField("kategori", e.target.value)}
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                    >
                                        <option value="">Pilih kategori</option>
                                        {form.kategori === "Karya Ilmiah / PKM" && (
                                            <option value="Karya Ilmiah / PKM">
                                                Karya Ilmiah / PKM (kategori lama)
                                            </option>
                                        )}
                                        {kategoriOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Judul / Nama Kegiatan{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.judul}
                                        onChange={(e) => updateField("judul", e.target.value)}
                                        required
                                        maxLength={200}
                                        placeholder="Contoh: Juara 1 Lomba Karya Tulis Ilmiah"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                            Penyelenggara <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={form.penyelenggara}
                                            onChange={(e) =>
                                                updateField("penyelenggara", e.target.value)
                                            }
                                            required
                                            maxLength={200}
                                            placeholder="Nama instansi atau penyelenggara"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                            Jabatan / Peran
                                        </label>
                                        <input
                                            value={form.jabatan}
                                            onChange={(e) => updateField("jabatan", e.target.value)}
                                            maxLength={150}
                                            placeholder="Contoh: Ketua, Anggota, atau Individu"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                            Tingkat <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={form.tingkat}
                                            onChange={(e) => updateField("tingkat", e.target.value)}
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                        >
                                            <option value="">Pilih tingkat</option>
                                            {tingkatOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                            Tahun <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1900"
                                            max={new Date().getFullYear()}
                                            value={form.tahun}
                                            onChange={(e) => updateField("tahun", e.target.value)}
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Deskripsi
                                    </label>
                                    <textarea
                                        value={form.deskripsi}
                                        onChange={(e) => updateField("deskripsi", e.target.value)}
                                        rows={4}
                                        maxLength={2000}
                                        placeholder="Jelaskan kegiatan, pencapaian, atau kontribusi Anda."
                                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                    />
                                </div>

                                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving && (
                                            <Loader2 size={17} className="animate-spin" />
                                        )}
                                        {saving
                                            ? "Menyimpan..."
                                            : editingId
                                                ? "Simpan Perubahan"
                                                : "Simpan Portofolio"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}