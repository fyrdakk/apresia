"use client";

import AuthBrand from "@/components/auth-brand";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // 1. Login melalui Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setMessage("Email atau password tidak sesuai.");
        return;
      }

      // 2. Mengambil role dari tabel login
      const { data: profile, error: profileError } = await supabase
        .from("login")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage(
          "Profil akun tidak ditemukan. Silakan hubungi administrator."
        );
        return;
      }

      // 3. Redirect berdasarkan role
      if (profile.role === "admin") {
        router.replace("/admin");
        router.refresh();
        return;
      }

      if (profile.role === "mahasiswa") {
        router.replace("/mahasiswa");
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      setMessage("Hak akses akun tidak dikenali.");
    } catch {
      setMessage("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <AuthBrand />
      <section className="auth-form-panel">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-lg sm:p-10">

        {/* Judul */}
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#047244]">
            Selamat Datang
          </p>

          <h1 className="text-2xl font-bold text-slate-900">
            Masuk ke Akun
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Masukkan email dan password untuk melanjutkan ke akun Apresia.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#047244] focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#047244] focus:bg-white focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#047244]"
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          {/* Pesan */}
          {message && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {message}
            </p>
          )}

          {/* Tombol Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#047244] py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#035c37] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk ke Apresia"}
          </button>
        </form>

        {/* Link Registrasi */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">PENGGUNA BARU?</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="text-center text-sm text-slate-500">
          Belum memiliki akun?{" "}
          <Link
            href="/registrasi"
            className="font-bold text-[#047244] hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>

        <p className="mt-8 text-center text-xs text-slate-400">
          Â© 2026 Apresia. All rights reserved.
        </p>
      </div>
      </section>
    </main>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {hidden ? (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.9 5.2A10.7 10.7 0 0112 5c5 0 8.3 4.5 9 7-.3 1.1-1.1 2.5-2.3 3.7" />
          <path d="M6.6 6.6C4.4 8 3.3 10 3 12c.4 1.4 1.5 3.2 3.7 4.6A9.5 9.5 0 0012 19c1.2 0 2.4-.2 3.4-.7" />
        </>
      )}
    </svg>
  );
}