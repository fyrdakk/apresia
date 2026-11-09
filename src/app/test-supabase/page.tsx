import { createClient } from "@/lib/supabase/server";

export default async function TestSupabasePage() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getSession();

    return (
        <main className="flex min-h-screen items-center justify-center">
            <div className="rounded-xl border bg-white p-8">
                <h1 className="text-xl font-bold">Tes Koneksi Supabase</h1>

                <p className="mt-3">
                    {error ? "Koneksi gagal" : "Supabase berhasil terhubung"}
                </p>

                {error && <p>{error.message}</p>}
            </div>
        </main>
    );
}