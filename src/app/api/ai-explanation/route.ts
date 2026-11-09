
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY belum ditemukan di .env.local." },
        { status: 500 }
      );
    }

    const body = await request.json();

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
          temperature: 0.3,
          max_completion_tokens: 300,
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const detail =
        result?.error?.message ??
        result?.message ??
        JSON.stringify(result);

      console.error("GROQ ERROR:", response.status, detail);

      return NextResponse.json(
        {
          error: `Groq API (${response.status}): ${detail}`,
        },
        { status: response.status }
      );
    }

    const explanation =
      result.choices?.[0]?.message?.content?.trim();

    if (!explanation) {
      console.error("Groq response kosong:", result);

      return NextResponse.json(
        { error: "Groq tidak menghasilkan teks penjelasan." },
        { status: 502 }
      );
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("AI ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
