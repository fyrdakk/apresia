"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Calculator, RefreshCw, Save, CheckCircle2, AlertCircle, Users,
    Trophy, FileCheck, Search, ChevronDown, ChevronUp, Info, Play,
} from "lucide-react";

type Kriteria = {
    id: string;
    kode: string;
    nama_kriteria: string;
    bobot: number;
    jenis: "Benefit" | "Cost";
};

type Mahasiswa = {
    id: string;
    nama_lengkap: string | null;
    nim: string | null;
    prodi: string | null;
    fakultas: string | null;
    semester: number | null;
};

type Akademik = {
    mahasiswa_id: string;
    ipk: number | null;
    nilai_bahasa_inggris: number | null;
};

type Portofolio = {
    id: string;
    mahasiswa_id: string;
    kategori: string;
    judul: string | null;
    tingkat: string | null;
    jabatan: string | null;
    tahun: number | null;
};

type Bukti = {
    mahasiswa_id: string;
    kategori: string;
    status_verifikasi: string;
};

type PenilaianDB = {
    id: string;
    mahasiswa_id: string;
    nilai_c1: number;
    nilai_c2: number;
    nilai_c3: number;
    nilai_c4: number;
    nilai_c5: number;
    normalisasi_c1: number | null;
    normalisasi_c2: number | null;
    normalisasi_c3: number | null;
    normalisasi_c4: number | null;
    normalisasi_c5: number | null;
    nilai_preferensi: number | null;
    peringkat: number | null;
    status_validasi: "menunggu" | "tervalidasi" | "perlu_revisi";
    status_publikasi: boolean;
};

type Kandidat = Mahasiswa & {
    akademik: Akademik | null;
    portofolio: Portofolio[];
    buktiTervalidasi: number;
    penilaian: PenilaianDB | null;
};

type Hasil = {
    id: string;
    mahasiswa_id: string;
    nama: string;
    nim: string;
    nilai: number[];
    normalisasi: number[];
    preferensi: number;
    peringkat: number;
};

const nilaiFields = ["nilai_c1", "nilai_c2", "nilai_c3", "nilai_c4", "nilai_c5"] as const;

const formatNumber = (value: number | null | undefined, digits = 2) =>
    value == null || !Number.isFinite(Number(value))
        ? "-"
        : Number(value).toLocaleString("id-ID", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        });

export default function PerhitunganSAWPage() {
    const supabase = useMemo(() => createClient(), []);
    const [kriteria, setKriteria] = useState<Kriteria[]>([]);
    const [kandidat, setKandidat] = useState<Kandidat[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [validatingId, setValidatingId] = useState<string | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("semua");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [draftScores, setDraftScores] = useState<Record<string, { c3: string; c4: string; c5: string }>>({});
    const [hasil, setHasil] = useState<Hasil[]>([]);
    const [hasCalculated, setHasCalculated] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        setSuccess("");
        setHasCalculated(false);
        setHasil([]);

        try {
            const [criteriaRes, studentsRes, academicRes, portfolioRes, evidenceRes, resultsRes] =
                await Promise.all([
                    supabase.from("kriteria")
                        .select("id,kode,nama_kriteria,bobot,jenis")
                        .order("kode", { ascending: true }),
                    supabase.from("login")
                        .select("id,nama_lengkap,nim,prodi,fakultas,semester")
                        .eq("role", "mahasiswa")
                        .order("nama_lengkap", { ascending: true }),
                    supabase.from("data_akademik")
                        .select("mahasiswa_id,ipk,nilai_bahasa_inggris"),
                    supabase.from("portofolio")
                        .select("id,mahasiswa_id,kategori,judul,tingkat,jabatan,tahun"),
                    supabase.from("dokumen_bukti")
                        .select("mahasiswa_id,kategori,status_verifikasi")
                        .eq("status_verifikasi", "tervalidasi"),
                    supabase.from("hasil_penilaian")
                        .select("id,mahasiswa_id,nilai_c1,nilai_c2,nilai_c3,nilai_c4,nilai_c5,normalisasi_c1,normalisasi_c2,normalisasi_c3,normalisasi_c4,normalisasi_c5,nilai_preferensi,peringkat,status_validasi,status_publikasi"),
                ]);

            const firstError = [criteriaRes, studentsRes, academicRes, portfolioRes, evidenceRes, resultsRes]
                .find((result) => result.error)?.error;
            if (firstError) throw firstError;

            const criteria = (criteriaRes.data ?? []) as Kriteria[];
            if (criteria.length !== 5) {
                throw new Error("Data pada tabel kriteria harus berjumlah tepat lima (C1–C5).");
            }

            const students = (studentsRes.data ?? []) as Mahasiswa[];
            const academics = (academicRes.data ?? []) as Akademik[];
            const portfolios = (portfolioRes.data ?? []) as Portofolio[];
            const evidences = (evidenceRes.data ?? []) as Bukti[];
            const results = (resultsRes.data ?? []) as PenilaianDB[];

            const joined: Kandidat[] = students.map((student) => ({
                ...student,
                akademik: academics.find((item) => item.mahasiswa_id === student.id) ?? null,
                portofolio: portfolios.filter((item) => item.mahasiswa_id === student.id),
                buktiTervalidasi: evidences.filter((item) => item.mahasiswa_id === student.id).length,
                penilaian: results.find((item) => item.mahasiswa_id === student.id) ?? null,
            }));

            const drafts: Record<string, { c3: string; c4: string; c5: string }> = {};
            joined.forEach((student) => {
                drafts[student.id] = {
                    c3: student.penilaian ? String(student.penilaian.nilai_c3) : "",
                    c4: student.penilaian ? String(student.penilaian.nilai_c4) : "",
                    c5: student.penilaian ? String(student.penilaian.nilai_c5) : "",
                };
            });

            setKriteria(criteria);
            setKandidat(joined);
            setDraftScores(drafts);
        } catch (err: unknown) {
            const error = err as Record<string, unknown>;

            const detail = {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                errorString: String(err),
                rawError: JSON.stringify(
                    err,
                    Object.getOwnPropertyNames(err as object)
                ),
            };

            console.error("Gagal memuat data perhitungan SAW:", detail);

            setError(
                String(error?.message || error?.details || error?.hint || "Terjadi kesalahan saat menyimpan penilaian.")
            );
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const totalBobot = useMemo(
        () => kriteria.reduce((total, item) => total + Number(item.bobot), 0),
        [kriteria]
    );

    const filteredCandidates = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return kandidat.filter((student) => {
            const matchSearch =
                !keyword ||
                (student.nama_lengkap ?? "").toLowerCase().includes(keyword) ||
                (student.nim ?? "").toLowerCase().includes(keyword) ||
                (student.prodi ?? "").toLowerCase().includes(keyword);
            const status = student.penilaian?.status_validasi ?? "belum_dinilai";
            const matchStatus =
                filterStatus === "semua" ||
                (filterStatus === "belum_dinilai" && !student.penilaian) ||
                status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [kandidat, search, filterStatus]);

    const validatedCount = kandidat.filter((item) => item.penilaian?.status_validasi === "tervalidasi").length;
    const readyCount = kandidat.filter((item) => {
        const a = item.akademik;
        const d = draftScores[item.id];
        return a?.ipk != null && a?.nilai_bahasa_inggris != null &&
            d?.c3 !== "" && d?.c4 !== "" && d?.c5 !== "" &&
            [d?.c3, d?.c4, d?.c5].every((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100);
    }).length;

    function updateDraft(studentId: string, field: "c3" | "c4" | "c5", value: string) {
        setDraftScores((current) => ({
            ...current,
            [studentId]: { ...(current[studentId] ?? { c3: "", c4: "", c5: "" }), [field]: value },
        }));
    }

    async function saveAssessment(student: Kandidat) {
        setError("");
        setSuccess("");
        const draft = draftScores[student.id];
        const ipk = student.akademik?.ipk;
        const english = student.akademik?.nilai_bahasa_inggris;
        const c3 = Number(draft?.c3);
        const c4 = Number(draft?.c4);
        const c5 = Number(draft?.c5);

        if (ipk == null || english == null) {
            setError(`Data akademik ${student.nama_lengkap ?? "mahasiswa"} belum lengkap. IPK dan nilai bahasa Inggris harus tersedia.`);
            return;
        }
        if ([draft?.c3, draft?.c4, draft?.c5].some((value) => value === "" || value == null)) {
            setError("Nilai C3, C4, dan C5 wajib diisi terlebih dahulu.");
            return;
        }
        if (![c3, c4, c5].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) {
            setError("Nilai C3, C4, dan C5 harus berada pada rentang 0–100.");
            return;
        }

        setSavingId(student.id);
        try {
            const payload = {
                mahasiswa_id: student.id,
                nilai_c1: Number(ipk),
                nilai_c2: Number(english),
                nilai_c3: c3,
                nilai_c4: c4,
                nilai_c5: c5,
                status_validasi: "menunggu",
                status_publikasi: false,
                updated_at: new Date().toISOString(),
            };
            const { error } = await supabase.from("hasil_penilaian")
                .upsert(payload, { onConflict: "mahasiswa_id" });
            if (error) throw error;
            await fetchData();
            setSuccess(`Penilaian ${student.nama_lengkap ?? "mahasiswa"} berhasil disimpan dan menunggu validasi.`);
        } catch (err: unknown) {
            // Supabase/PostgREST dapat mengembalikan objek error yang tidak
            // selalu tampil dengan benar jika langsung dicetak ke Console.
            const errorObject =
                err !== null && typeof err === "object"
                    ? (err as Record<string, unknown>)
                    : {};

            const message = String(
                errorObject.message ??
                errorObject.error_description ??
                (err instanceof Error ? err.message : "") ??
                ""
            );
            const code = String(errorObject.code ?? "");
            const details = String(errorObject.details ?? "");
            const hint = String(errorObject.hint ?? "");

            const errorMessage = [
                message,
                details,
                hint,
                code ? `Kode: ${code}` : "",
            ].filter(Boolean).join(" | ");

            const debugInfo = {
                message: message || null,
                code: code || null,
                details: details || null,
                hint: hint || null,
                raw: (() => {
                    try {
                        if (err instanceof Error) {
                            return {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                            };
                        }
                        return JSON.parse(
                            JSON.stringify(err, Object.getOwnPropertyNames(
                                err !== null && typeof err === "object" ? err : {}
                            ))
                        );
                    } catch {
                        return String(err);
                    }
                })(),
            };

            console.error(
                "DETAIL ERROR SIMPAN PENILAIAN:\\n" +
                JSON.stringify(debugInfo, null, 2)
            );

            setError(
                errorMessage ||
                `Penilaian gagal disimpan. Detail error: ${String(err)}`
            );
        } finally {
            setSavingId(null);
        }
    }

    async function validateAssessment(student: Kandidat) {
        if (!student.penilaian) return;
        setError("");
        setSuccess("");
        setValidatingId(student.id);
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;
            if (!authData.user) throw new Error("Sesi admin tidak ditemukan. Silakan login kembali.");

            const { data, error } = await supabase.from("hasil_penilaian")
                .update({
                    status_validasi: "tervalidasi",
                    admin_id: authData.user.id,
                    tanggal_validasi: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", student.penilaian.id)
                .select("id")
                .maybeSingle();
            if (error) throw error;
            if (!data) throw new Error("Penilaian tidak berubah. Periksa kebijakan RLS UPDATE untuk admin.");
            await fetchData();
            setSuccess(`Penilaian ${student.nama_lengkap ?? "mahasiswa"} berhasil divalidasi.`);
        } catch (err) {
            console.error("Gagal memvalidasi penilaian:", err);
            setError(err instanceof Error ? err.message : "Validasi penilaian gagal.");
        } finally {
            setValidatingId(null);
        }
    }

    async function calculateSAW() {
        setError("");
        setSuccess("");
        setHasCalculated(false);
        setHasil([]);

        if (kriteria.length !== 5) {
            setError("Lima kriteria C1–C5 belum tersedia.");
            return;
        }
        if (Math.abs(totalBobot - 1) > 0.000001) {
            setError(`Total bobot kriteria harus 1,00. Saat ini ${(totalBobot).toFixed(4)}.`);
            return;
        }

        const eligible = kandidat.filter((student) =>
            student.penilaian?.status_validasi === "tervalidasi"
        );
        if (eligible.length === 0) {
            setError("Belum ada penilaian mahasiswa dengan status tervalidasi.");
            return;
        }

        const criteriaByCode = [...kriteria].sort((a, b) => a.kode.localeCompare(b.kode));
        if (criteriaByCode.some((item, index) => item.kode !== `C${index + 1}`)) {
            setError("Kode kriteria harus tepat C1, C2, C3, C4, dan C5.");
            return;
        }

        const values = eligible.map((student) => [
            Number(student.penilaian!.nilai_c1),
            Number(student.penilaian!.nilai_c2),
            Number(student.penilaian!.nilai_c3),
            Number(student.penilaian!.nilai_c4),
            Number(student.penilaian!.nilai_c5),
        ]);
        if (values.some((row) => row.some((value) => !Number.isFinite(value) || value < 0))) {
            setError("Terdapat nilai yang tidak valid pada data tervalidasi.");
            return;
        }

        setCalculating(true);
        try {
            const maxima = criteriaByCode.map((_, index) => Math.max(...values.map((row) => row[index])));
            const minima = criteriaByCode.map((_, index) => Math.min(...values.map((row) => row[index])));

            const computed = eligible.map((student, rowIndex) => {
                const normalized = values[rowIndex].map((value, index) => {
                    const type = criteriaByCode[index].jenis;
                    if (type === "Benefit") return maxima[index] === 0 ? 0 : value / maxima[index];
                    return value === 0 ? 0 : minima[index] / value;
                });
                const preference = normalized.reduce(
                    (sum, value, index) => sum + value * Number(criteriaByCode[index].bobot), 0
                );
                return {
                    id: student.penilaian!.id,
                    mahasiswa_id: student.id,
                    nama: student.nama_lengkap ?? "-",
                    nim: student.nim ?? "-",
                    nilai: values[rowIndex],
                    normalisasi: normalized,
                    preferensi: preference,
                    peringkat: 0,
                };
            }).sort((a, b) => b.preferensi - a.preferensi);

            computed.forEach((item, index) => { item.peringkat = index + 1; });

            const updates = await Promise.all(computed.map((item) =>
                supabase.from("hasil_penilaian").update({
                    normalisasi_c1: item.normalisasi[0],
                    normalisasi_c2: item.normalisasi[1],
                    normalisasi_c3: item.normalisasi[2],
                    normalisasi_c4: item.normalisasi[3],
                    normalisasi_c5: item.normalisasi[4],
                    nilai_preferensi: item.preferensi,
                    peringkat: item.peringkat,
                    updated_at: new Date().toISOString(),
                }).eq("id", item.id)
            ));
            const failed = updates.find((item) => item.error);
            if (failed?.error) throw failed.error;

            setHasil(computed);
            setHasCalculated(true);
            setSuccess(`Perhitungan SAW berhasil untuk ${computed.length} mahasiswa tervalidasi.`);
            await fetchData();
            setHasil(computed);
            setHasCalculated(true);
        } catch (err) {
            console.error("Perhitungan SAW gagal:", err);
            setError(err instanceof Error ? err.message : "Perhitungan gagal disimpan. Periksa kebijakan UPDATE tabel hasil_penilaian.");
        } finally {
            setCalculating(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="mb-1 text-sm font-semibold text-emerald-700">APRESIA / ADMIN / PERHITUNGAN SAW</p>
                        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Perhitungan SAW</h1>
                        <p className="mt-2 text-sm text-slate-500">Kelola kandidat, input nilai kriteria, validasi penilaian, dan hitung peringkat mahasiswa.</p>
                    </div>
                    <button onClick={() => void fetchData()} disabled={loading || calculating}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh Data
                    </button>
                </header>

                {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19} className="mt-0.5 shrink-0" /><p>{error}</p></div>}
                {success && <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={19} className="mt-0.5 shrink-0" /><p>{success}</p></div>}

                <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: "Total Kandidat", value: kandidat.length, icon: Users, tone: "bg-blue-50 text-blue-600" },
                        { label: "Bukti Tervalidasi", value: kandidat.reduce((sum, item) => sum + item.buktiTervalidasi, 0), icon: FileCheck, tone: "bg-purple-50 text-purple-600" },
                        { label: "Penilaian Tervalidasi", value: validatedCount, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
                        { label: "Siap Dinilai", value: readyCount, icon: Trophy, tone: "bg-amber-50 text-amber-600" },
                    ].map((item) => {
                        const Icon = item.icon;
                        return <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "…" : item.value}</p></div><div className={`rounded-xl p-3 ${item.tone}`}><Icon size={23} /></div></div>
                        </div>;
                    })}
                </section>

                <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div><h2 className="font-bold text-slate-900">Bobot Kriteria</h2><p className="mt-1 text-xs text-slate-500">Bobot dibaca dari tabel kriteria pada database.</p></div>
                        <p className={`text-sm font-bold ${Math.abs(totalBobot - 1) < 0.000001 ? "text-emerald-700" : "text-red-600"}`}>Total: {(totalBobot * 100).toLocaleString("id-ID")}%</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {kriteria.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold text-emerald-700">{item.kode}</p>
                            <p className="mt-1 min-h-10 text-sm font-medium text-slate-700">{item.nama_kriteria}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{(Number(item.bobot) * 100).toLocaleString("id-ID")}%</p>
                            <p className="mt-1 text-xs text-slate-400">{item.jenis}</p>
                        </div>)}
                    </div>
                </section>

                <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                    <Info size={19} className="mt-0.5 shrink-0" />
                    <div><p className="font-semibold">Alur penilaian</p><p className="mt-1 leading-relaxed">C1 (IPK) dan C2 (Bahasa Inggris) diambil otomatis dari data akademik. Admin mengisi C3 (Organisasi), C4 (Karya Ilmiah dan Kontribusi), serta C5 (Prestasi dan Sertifikasi) dengan nilai 0–100 berdasarkan portofolio dan bukti yang telah diverifikasi. Tingkat lokal, regional, nasional, atau internasional tetap ditampilkan sebagai informasi portofolio.</p></div>
                </div>

                <section className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5">
                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                            <div><h2 className="font-bold text-slate-900">Data Kandidat dan Penilaian</h2><p className="mt-1 text-xs text-slate-500">Simpan nilai terlebih dahulu, lalu validasi agar kandidat dapat dihitung dengan SAW.</p></div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIM, prodi..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 sm:w-64" /></div>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                                    <option value="semua">Semua status</option><option value="belum_dinilai">Belum dinilai</option><option value="menunggu">Menunggu validasi</option><option value="tervalidasi">Tervalidasi</option><option value="perlu_revisi">Perlu revisi</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 animate-spin" />Memuat data kandidat...</div> :
                        filteredCandidates.length === 0 ? <div className="p-12 text-center text-sm text-slate-500"><Users size={30} className="mx-auto mb-3 text-slate-300" />Belum ada kandidat yang sesuai.</div> :
                            <div className="divide-y divide-slate-100">
                                {filteredCandidates.map((student) => {
                                    const isExpanded = expandedId === student.id;
                                    const status = student.penilaian?.status_validasi ?? "belum_dinilai";
                                    const draft = draftScores[student.id] ?? { c3: "", c4: "", c5: "" };
                                    const statusClass = status === "tervalidasi" ? "bg-emerald-50 text-emerald-700" : status === "menunggu" ? "bg-amber-50 text-amber-700" : status === "perlu_revisi" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600";
                                    return <article key={student.id} className="p-5">
                                        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{student.nama_lengkap ?? "Nama belum tersedia"}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>{status === "belum_dinilai" ? "Belum dinilai" : status === "menunggu" ? "Menunggu validasi" : status === "tervalidasi" ? "Tervalidasi" : "Perlu revisi"}</span></div>
                                                <p className="mt-1 text-xs text-slate-500">{student.nim ?? "-"} · {student.prodi ?? "-"} · Semester {student.semester ?? "-"}</p>
                                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span>IPK: <b>{formatNumber(student.akademik?.ipk, 2)}</b></span><span>Bahasa Inggris: <b>{formatNumber(student.akademik?.nilai_bahasa_inggris, 2)}</b></span><span>Portofolio: <b>{student.portofolio.length}</b></span><span>Bukti tervalidasi: <b>{student.buktiTervalidasi}</b></span></div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button onClick={() => setExpandedId(isExpanded ? null : student.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{isExpanded ? "Tutup detail" : "Detail & nilai"}{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                                                {student.penilaian && status !== "tervalidasi" && <button onClick={() => void validateAssessment(student)} disabled={validatingId === student.id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><CheckCircle2 size={15} />{validatingId === student.id ? "Memvalidasi..." : "Validasi nilai"}</button>}
                                            </div>
                                        </div>

                                        {isExpanded && <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                            <div className="mb-4"><h4 className="text-sm font-bold text-slate-800">Ringkasan portofolio</h4>
                                                {student.portofolio.length === 0 ? <p className="mt-2 text-xs text-slate-500">Belum ada data portofolio.</p> : <div className="mt-2 grid gap-2 md:grid-cols-2">
                                                    {student.portofolio.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><p className="font-semibold text-slate-800">{item.judul || item.kategori}</p><p className="mt-1 text-slate-500">{item.kategori} · {item.tingkat || "Tingkat belum diisi"} · {item.jabatan || "Peran belum diisi"} · {item.tahun || "-"}</p></div>)}
                                                </div>}
                                                <p className="mt-3 text-xs text-slate-500">Jumlah bukti yang telah diverifikasi: <b>{student.buktiTervalidasi}</b>. Pastikan bukti pendukung sudah diperiksa pada menu Verifikasi Bukti sebelum memberikan nilai.</p>
                                            </div>
                                            <div className="border-t border-slate-200 pt-4">
                                                <h4 className="mb-3 text-sm font-bold text-slate-800">Input nilai kriteria</h4>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                                    <div className="rounded-lg border border-slate-200 bg-white p-3"><label className="text-xs font-semibold text-slate-600">C1 · IPK</label><p className="mt-2 text-lg font-bold text-slate-900">{formatNumber(student.akademik?.ipk, 2)}</p><p className="text-[11px] text-slate-400">Otomatis dari data akademik</p></div>
                                                    <div className="rounded-lg border border-slate-200 bg-white p-3"><label className="text-xs font-semibold text-slate-600">C2 · Bahasa Inggris</label><p className="mt-2 text-lg font-bold text-slate-900">{formatNumber(student.akademik?.nilai_bahasa_inggris, 2)}</p><p className="text-[11px] text-slate-400">Otomatis dari data akademik</p></div>
                                                    {([
                                                        ["c3", "C3 · Organisasi"],
                                                        ["c4", "C4 · Karya Ilmiah & Kontribusi"],
                                                        ["c5", "C5 · Prestasi & Sertifikasi"],
                                                    ] as const).map(([field, label]) => <div key={field} className="rounded-lg border border-slate-200 bg-white p-3"><label className="text-xs font-semibold text-slate-600">{label}</label><input type="number" min="0" max="100" step="0.01" value={draft[field]} onChange={(e) => updateDraft(student.id, field, e.target.value)} placeholder="0–100" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /><p className="mt-1 text-[11px] text-slate-400">Diisi admin berdasarkan bukti</p></div>)}
                                                </div>
                                                <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">Menyimpan perubahan akan mengatur status penilaian kembali menjadi “menunggu”.</p><button onClick={() => void saveAssessment(student)} disabled={savingId === student.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Save size={15} />{savingId === student.id ? "Menyimpan..." : "Simpan penilaian"}</button></div>
                                            </div>
                                        </div>}
                                    </article>;
                                })}
                            </div>}
                </section>

                <section className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                    <div><h2 className="font-bold text-slate-900">Jalankan Perhitungan SAW</h2><p className="mt-1 text-sm text-slate-500">Hanya mahasiswa dengan status penilaian “tervalidasi” yang dihitung.</p><p className="mt-1 text-xs text-slate-500">Kandidat siap dihitung: {validatedCount}</p></div>
                    <button onClick={() => void calculateSAW()} disabled={loading || calculating || validatedCount === 0 || Math.abs(totalBobot - 1) > 0.000001} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{calculating ? <RefreshCw size={17} className="animate-spin" /> : <Play size={17} />}{calculating ? "Menghitung..." : "Hitung SAW"}</button>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Hasil Perhitungan dan Peringkat</h2><p className="mt-1 text-xs text-slate-500">Nilai normalisasi, preferensi, dan peringkat kandidat berdasarkan metode SAW.</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Peringkat</th><th className="px-4 py-3">Mahasiswa</th><th className="px-4 py-3">C1</th><th className="px-4 py-3">C2</th><th className="px-4 py-3">C3</th><th className="px-4 py-3">C4</th><th className="px-4 py-3">C5</th><th className="px-4 py-3">Preferensi</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {!hasCalculated ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400"><Calculator size={30} className="mx-auto mb-3 text-slate-300" /><p className="font-medium text-slate-600">Belum ada hasil perhitungan pada sesi ini</p><p className="mt-1 text-xs">Validasi penilaian kandidat, lalu klik Hitung SAW.</p></td></tr> :
                                    hasil.map((item) => <tr key={item.id} className="hover:bg-emerald-50/40"><td className="px-4 py-3"><span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">#{item.peringkat}</span></td><td className="px-4 py-3"><p className="font-semibold text-slate-800">{item.nama}</p><p className="text-xs text-slate-400">{item.nim}</p></td>{item.normalisasi.map((value, index) => <td key={index} className="px-4 py-3 text-slate-600">{formatNumber(value, 4)}</td>)}<td className="px-4 py-3 font-bold text-emerald-700">{formatNumber(item.preferensi, 4)}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                    {hasCalculated && <p className="border-t border-slate-100 p-4 text-xs text-slate-500">Hasil normalisasi, nilai preferensi, dan peringkat telah disimpan ke tabel hasil_penilaian.</p>}
                </section>
            </div>
        </main>
    );
}
