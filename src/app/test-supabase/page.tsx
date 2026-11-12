import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { Suspense } from "react";

async function SupabaseStatus() {
    await connection();

    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    return (
        <div className="rounded-xl border bg-white p-8">
            <h1 className="text-xl font-bold">
                Tes Koneksi Supabase
            </h1>

            <p className="mt-3">
                {error
                    ? "Koneksi gagal"
                    : "Supabase berhasil terhubung"}
            </p>

            {error && <p>{error.message}</p>}
        </div>
    );
}

export default function TestSupabasePage() {
    return (
        <main className="flex min-h-screen items-center justify-center">
            <Suspense
                fallback={
                    <div className="rounded-xl border bg-white p-8">
                        Memeriksa koneksi Supabase...
                    </div>
                }
            >
                <SupabaseStatus />
            </Suspense>
        </main>
    );
}