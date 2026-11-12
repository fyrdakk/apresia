import { NextResponse } from "next/server";

// Penjelasan cadangan jika Groq tidak tersedia
function createFallbackExplanation(body: any): string {
  const nama = body.nama ?? body.name ?? "Mahasiswa";
  const peringkat = body.peringkat ?? body.rank ?? "-";

  const preferensi = Number(body.nilai_preferensi);
  const nilaiPreferensi = Number.isFinite(preferensi)
    ? preferensi.toFixed(4)
    : body.nilai_preferensi ?? "-";

  return `Berdasarkan hasil perhitungan metode Simple Additive Weighting (SAW), ${nama} berada pada peringkat ${peringkat} dengan nilai preferensi ${nilaiPreferensi}. Hasil pemeringkatan tersebut diperoleh berdasarkan penilaian terhadap lima kriteria yang telah ditetapkan dalam sistem APRESIA.

Kriteria penilaian meliputi IPK sebesar ${body.nilai_c1 ?? "-"}, kemampuan bahasa Inggris sebesar ${body.nilai_c2 ?? "-"}, keaktifan organisasi sebesar ${body.nilai_c3 ?? "-"}, karya ilmiah dan kontribusi sebesar ${body.nilai_c4 ?? "-"}, serta prestasi dan sertifikasi sebesar ${body.nilai_c5 ?? "-"}. Hasil ini dapat digunakan sebagai bahan pertimbangan panitia dalam menentukan penerima penghargaan mahasiswa.`;
}

export async function POST(request: Request) {
  let body: any = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Data permintaan tidak valid.",
      },
      { status: 400 }
    );
  }

  // Siapkan penjelasan cadangan
  const fallback = createFallbackExplanation(body);

  try {
    const apiKey = process.env.GROQ_API_KEY;

    // Jika API key tidak tersedia, gunakan penjelasan cadangan
    if (!apiKey) {
      console.warn("GROQ_API_KEY tidak ditemukan. Menggunakan fallback.");

      return NextResponse.json({
        explanation: fallback,
        source: "fallback",
      });
    }

    const nama = body.nama ?? body.name ?? "Mahasiswa";
    const peringkat = body.peringkat ?? body.rank ?? "-";

    const prompt = `
Kamu adalah asisten akademik website APRESIA.

Jelaskan hasil pemeringkatan mahasiswa menggunakan metode SAW.

Nama: ${nama}
Peringkat: ${peringkat}
IPK (C1): ${body.nilai_c1 ?? "-"}
Bahasa Inggris (C2): ${body.nilai_c2 ?? "-"}
Organisasi (C3): ${body.nilai_c3 ?? "-"}
Karya Ilmiah dan Kontribusi (C4): ${body.nilai_c4 ?? "-"}
Prestasi dan Sertifikasi (C5): ${body.nilai_c5 ?? "-"}
Nilai Preferensi: ${body.nilai_preferensi ?? "-"}

Buat penjelasan dalam bahasa Indonesia yang formal,
objektif, singkat, dan mudah dipahami.

Jelaskan posisi peringkat dan kontribusi nilai kriteria.
Jangan mengarang informasi.
Jangan menghitung ulang nilai SAW.
Maksimal dua paragraf.
`;

    // Batasi waktu tunggu Groq maksimal 12 detik
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 12000);

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
            temperature: 0.3,
            max_completion_tokens: 700,
          }),
          signal: controller.signal,
        }
      );

      // Periksa respons dari Groq
      if (!response.ok) {
        const detail = await response.text();

        console.error("GROQ API ERROR:", response.status, detail);

        return NextResponse.json({
          explanation: fallback,
          source: "fallback",
        });
      }

      const result = await response.json();

      const explanation =
        result?.choices?.[0]?.message?.content?.trim();

      // Jika Groq tidak menghasilkan teks
      if (!explanation) {
        console.warn("Respons Groq kosong. Menggunakan fallback.");

        return NextResponse.json({
          explanation: fallback,
          source: "fallback",
        });
      }

      // Jika berhasil, tampilkan penjelasan dari AI
      return NextResponse.json({
        explanation,
        source: "groq",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("GROQ TIDAK TERSEDIA:", error);

    // Timeout, koneksi terputus, atau gangguan lainnya
    return NextResponse.json({
      explanation: fallback,
      source: "fallback",
    });
  }
}
