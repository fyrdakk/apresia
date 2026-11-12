
import { NextResponse } from "next/server";

type Kriteria = {
    kode: string;
    nama: string;
    bobot: number;
    normalisasi: number;
    kontribusi: number;
};

const DAFTAR_KRITERIA = [
    { kode: "C1", nama: "IPK", bobot: 0.30 },
    { kode: "C2", nama: "TOEFL", bobot: 0.20 },
    { kode: "C3", nama: "Organisasi", bobot: 0.20 },
    { kode: "C4", nama: "Karya Ilmiah", bobot: 0.20 },
    { kode: "C5", nama: "Prestasi dan Sertifikasi", bobot: 0.10 },
];

function formatNumber(value: number) {
    return value.toLocaleString("id-ID", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });
}

// Mengambil data normalisasi dari dua format request
function ambilNormalisasi(body: any, kode: string): number {
    const nomor = kode.toLowerCase();

    // Format kolom langsung dari tabel hasil_penilaian
    const kolom = body[`normalisasi_${nomor}`];

    if (kolom !== undefined && kolom !== null) {
        return Number(kolom);
    }

    // Format array dari kode frontend sebelumnya
    const item = body.kontribusi_kriteria?.find(
        (data: any) => data.kode === kode
    );

    return Number(item?.normalisasi);
}

// Menghitung kontribusi berdasarkan bobot dan normalisasi
function hitungSAW(body: any): Kriteria[] {
    return DAFTAR_KRITERIA.map((item) => {
        const normalisasi = ambilNormalisasi(body, item.kode);

        return {
            ...item,
            normalisasi,
            kontribusi: item.bobot * normalisasi,
        };
    });
}

// Membuat penjelasan faktual oleh sistem, bukan AI
function buatPenjelasanSAW(
    body: any,
    hasil: Kriteria[]
): string {
    const nilaiPreferensi = Number(body.nilai_preferensi);

    const kontribusiTerbesar = Math.max(
        ...hasil.map((item) => item.kontribusi)
    );

    const kriteriaTerbesar = hasil
        .filter(
            (item) =>
                Math.abs(item.kontribusi - kontribusiTerbesar) < 0.0000001
        )
        .map((item) => item.nama)
        .join(" dan ");

    const rincian = hasil
        .map(
            (item) =>
                `${item.nama} ${formatNumber(item.kontribusi)}`
        )
        .join(", ");

    return (
        `Berdasarkan perhitungan metode Simple Additive Weighting (SAW), ` +
        `${body.nama || "Mahasiswa"} memperoleh peringkat ${body.peringkat} ` +
        `dengan nilai preferensi ${formatNumber(nilaiPreferensi)}. ` +
        `Kontribusi terbesar berasal dari ${kriteriaTerbesar}. ` +
        `Rincian kontribusi setiap kriteria adalah ${rincian}.`
    );
}

// Saran cadangan apabila Groq tidak tersedia
function buatMotivasiFallback(hasil: Kriteria[]): string {
    const normalisasiTerendah = Math.min(
        ...hasil.map((item) => item.normalisasi)
    );

    const aspekPengembangan = hasil
        .filter(
            (item) =>
                Math.abs(item.normalisasi - normalisasiTerendah) < 0.0000001
        )
        .map((item) => item.nama)
        .join(" dan ");

    return (
        `Pertahankan pencapaian yang telah diraih dan terus kembangkan ` +
        `potensi diri. ${aspekPengembangan} dapat menjadi salah satu ` +
        `aspek yang diperhatikan dalam pengembangan berikutnya. ` +
        `Tetap semangat belajar, berproses, dan meraih prestasi baru.`
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const nilaiPreferensi = Number(body.nilai_preferensi);
        const peringkat = Number(body.peringkat);

        // Validasi data utama
        if (
            !Number.isFinite(nilaiPreferensi) ||
            nilaiPreferensi < 0 ||
            nilaiPreferensi > 1 ||
            !Number.isInteger(peringkat) ||
            peringkat < 1
        ) {
            return NextResponse.json(
                { error: "Data peringkat atau nilai preferensi tidak valid." },
                { status: 400 }
            );
        }

        const hasil = hitungSAW(body);

        // Validasi nilai normalisasi
        const normalisasiValid = hasil.every(
            (item) =>
                Number.isFinite(item.normalisasi) &&
                item.normalisasi >= 0 &&
                item.normalisasi <= 1
        );

        if (!normalisasiValid) {
            return NextResponse.json(
                { error: "Data normalisasi kriteria belum lengkap." },
                { status: 400 }
            );
        }

        const totalBobot = hasil.reduce(
            (total, item) => total + item.bobot,
            0
        );

        if (Math.abs(totalBobot - 1) > 0.0001) {
            return NextResponse.json(
                { error: "Total bobot kriteria tidak sesuai." },
                { status: 422 }
            );
        }

        const totalKontribusi = hasil.reduce(
            (total, item) => total + item.kontribusi,
            0
        );

        // Memastikan perhitungan sistem konsisten
        if (Math.abs(totalKontribusi - nilaiPreferensi) > 0.0001) {
            return NextResponse.json(
                {
                    error: "Total kontribusi tidak sesuai dengan nilai preferensi.",
                },
                { status: 422 }
            );
        }

        // Paragraf pertama dibuat secara deterministik
        const penjelasanSAW = buatPenjelasanSAW(body, hasil);

        // Paragraf kedua merupakan motivasi dan saran
        const motivasiFallback = buatMotivasiFallback(hasil);

        const apiKey = process.env.GROQ_API_KEY;

        // Fallback jika API key tidak tersedia
        if (!apiKey) {
            return NextResponse.json({
                explanation: `${penjelasanSAW}\n\n${motivasiFallback}`,
                source: "fallback",
            });
        }

        const normalisasiTerendah = Math.min(
            ...hasil.map((item) => item.normalisasi)
        );

        const aspekPengembangan = hasil
            .filter(
                (item) =>
                    Math.abs(item.normalisasi - normalisasiTerendah) < 0.0000001
            )
            .map((item) => item.nama)
            .join(" dan ");


        const prompt = `
Kamu adalah asisten akademik website APRESIA.

Tugasmu adalah memberikan motivasi dan saran pengembangan
diri kepada mahasiswa berdasarkan hasil penilaian SAW.

DATA MAHASISWA:
Nama: ${body.nama || "Mahasiswa"}
Peringkat: ${peringkat}
Nilai preferensi: ${formatNumber(nilaiPreferensi)}

DATA KONTRIBUSI:
${hasil.map(
            (item) =>
                `- ${item.nama}: bobot ${formatNumber(item.bobot)}, normalisasi ${formatNumber(item.normalisasi)}, kontribusi ${formatNumber(item.kontribusi)}`
        ).join("\n")}

ASPEK YANG DAPAT DIKEMBANGKAN:
${aspekPengembangan}

INSTRUKSI:
1. Buat satu paragraf berisi 3 kalimat.
2. Awali dengan motivasi positif atas pencapaian mahasiswa.
3. Berikan saran pengembangan berdasarkan aspek yang tersedia.
4. Arahkan saran pada peningkatan pengalaman, kompetensi,
   partisipasi, atau pencapaian sesuai kriteria terkait.
5. Jangan menganggap kontribusi yang lebih rendah sebagai
   bukti bahwa mahasiswa memiliki kemampuan yang buruk.
6. Jangan menyimpulkan karakter, kepemimpinan, komunikasi,
   komitmen, atau pengalaman mahasiswa tanpa data pendukung.
7. Jangan mengubah atau menambahkan hasil perhitungan SAW.
8. Jangan mengulang peringkat dan nilai preferensi.
9. Jangan membandingkan mahasiswa dengan mahasiswa lain.
10. Gunakan bahasa Indonesia yang formal, ramah, dan memotivasi.
11. Maksimal 3 kalimat.
12. Langsung berikan paragraf tanpa judul.
`;
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            12000
        );

        try {
            const response = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-oss-20b",
                        messages: [
                            {
                                role: "user",
                                content: prompt,
                            },
                        ],
                        reasoning_effort: "low",
                        include_reasoning: false,
                        temperature: 0.1,
                        max_completion_tokens: 180,
                    }),
                    signal: controller.signal,
                }
            );

            if (!response.ok) {
                console.error("GROQ ERROR:", response.status);

                return NextResponse.json({
                    explanation: `${penjelasanSAW}\n\n${motivasiFallback}`,
                    source: "fallback",
                });
            }

            const result = await response.json();

            const motivasiAI =
                result?.choices?.[0]?.message?.content?.trim();

            if (!motivasiAI) {
                return NextResponse.json({
                    explanation: `${penjelasanSAW}\n\n${motivasiFallback}`,
                    source: "fallback",
                });
            }

            return NextResponse.json({
                explanation: `${penjelasanSAW}\n\n${motivasiAI}`,
                source: "groq",
            });
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        console.error("AI PENGUMUMAN ERROR:", error);

        return NextResponse.json(
            {
                error: "Penjelasan hasil penilaian belum dapat ditampilkan.",
            },
            { status: 500 }
        );
    }
}
