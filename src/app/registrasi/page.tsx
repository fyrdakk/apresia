"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const daftarFakultas = [
  "Fakultas Teknik",
  "Fakultas Bahasa dan Seni",
  "Fakultas Ekonomi",
  "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  "Fakultas Ilmu Pendidikan",
  "Fakultas Kedokteran",
  "Fakultas Olahraga",
];

const daftarSemester = Array.from(
  { length: 14 },
  (_, index) => index + 1
);

export default function RegistrasiPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const nama = String(formData.get("nama") ?? "").trim();
    const nim = String(formData.get("nim") ?? "").trim();
    const fakultas = String(formData.get("fakultas") ?? "");
    const prodi = String(formData.get("prodi") ?? "").trim();
    const semester = Number(formData.get("semester"));
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
      formData.get("confirmPassword") ?? ""
    );

    if (
      !nama ||
      !nim ||
      !fakultas ||
      !prodi ||
      !semester ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setMessage("Semua data wajib diisi.");
      return;
    }

    if (!Number.isInteger(semester) || semester < 1 || semester > 14) {
      setMessage("Semester yang dipilih tidak valid.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Konfirmasi password tidak sesuai.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Registrasi akun melalui Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama_lengkap: nama,
            nim: nim,
            fakultas: fakultas,
            prodi: prodi,
            semester: semester,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Registrasi gagal. Silakan coba kembali.");
        return;
      }

      // Pastikan metadata berhasil dikirim
      // Database Trigger akan menyimpan semester
      // ke tabel public.login secara otomatis.

      if (data.user.user_metadata?.semester !== semester) {
        setMessage(
          "Akun dibuat, tetapi metadata semester tidak sesuai. Silakan hubungi administrator."
        );
        return;
      }

      // Keluar agar mahasiswa melakukan login secara manual.
      if (data.session) {
        const { error: signOutError } =
          await supabase.auth.signOut();

        if (signOutError) {
          setMessage(
            "Akun berhasil dibuat, tetapi sesi belum berhasil diakhiri. Silakan keluar sebelum mencoba login."
          );
          return;
        }
      }

      setSuccess(true);
      setMessage(
        "Registrasi berhasil! Data semester telah dikirim untuk disimpan. Silakan masuk menggunakan email dan password."
      );

      form.reset();
    } catch (error) {
      console.error("Registrasi error:", error);
      setMessage("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#047244] focus:bg-white focus:ring-4 focus:ring-emerald-100";

  const labelClass =
    "mb-1.5 block text-sm font-semibold text-slate-700";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5] px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-7 shadow-lg sm:p-10">

        {/* Logo */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#047244] text-2xl font-bold text-white">
            A
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-wider text-[#047244]">
            APRESIA
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Sistem Penghargaan Mahasiswa
          </p>
        </div>

        {/* Judul */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#047244]">
            Pendaftaran Mahasiswa
          </p>

          <h2 className="text-2xl font-bold text-slate-900">
            Buat Akun Baru
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Lengkapi data diri untuk membuat akun Apresia.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nama */}
          <div>
            <label htmlFor="nama" className={labelClass}>
              Nama Lengkap
            </label>

            <input
              id="nama"
              name="nama"
              type="text"
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              required
              className={inputClass}
            />
          </div>

          {/* NIM */}
          <div>
            <label htmlFor="nim" className={labelClass}>
              Nomor Induk Mahasiswa (NIM)
            </label>

            <input
              id="nim"
              name="nim"
              type="text"
              placeholder="Masukkan NIM"
              autoComplete="off"
              required
              className={inputClass}
            />
          </div>

          {/* Fakultas */}
          <div>
            <label htmlFor="fakultas" className={labelClass}>
              Fakultas
            </label>

            <select
              id="fakultas"
              name="fakultas"
              defaultValue=""
              required
              className={`${inputClass} cursor-pointer`}
            >
              <option value="" disabled>
                Pilih fakultas
              </option>

              {daftarFakultas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Program Studi */}
          <div>
            <label htmlFor="prodi" className={labelClass}>
              Program Studi
            </label>

            <input
              id="prodi"
              name="prodi"
              type="text"
              placeholder="Masukkan program studi"
              required
              className={inputClass}
            />
          </div>

          {/* Semester */}
          <div>
            <label htmlFor="semester" className={labelClass}>
              Semester
            </label>

            <select
              id="semester"
              name="semester"
              defaultValue=""
              required
              className={`${inputClass} cursor-pointer`}
            >
              <option value="" disabled>
                Pilih semester
              </option>

              {daftarSemester.map((item) => (
                <option key={item} value={item}>
                  Semester {item}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                minLength={8}
                autoComplete="new-password"
                required
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? "Sembunyikan password"
                    : "Lihat password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#047244]"
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Konfirmasi Password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Masukkan ulang password"
                minLength={8}
                autoComplete="new-password"
                required
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((v) => !v)
                }
                aria-label={
                  showConfirmPassword
                    ? "Sembunyikan konfirmasi password"
                    : "Lihat konfirmasi password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#047244]"
              >
                <EyeIcon hidden={showConfirmPassword} />
              </button>
            </div>
          </div>

          {/* Pesan */}
          {message && (
            <p
              role="status"
              className={`rounded-lg p-3 text-sm ${
                success
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          {/* Tombol */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#047244] py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#035c37] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Buat Akun"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="font-bold text-[#047244] hover:underline"
          >
            Masuk sekarang
          </Link>
        </p>

        <p className="mt-7 text-center text-xs text-slate-400">
          © 2026 Apresia. All rights reserved.
        </p>
      </div>
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
          <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.9 5.2A11 11 0 0112 5c5 0 9 5 9 7a10.8 10.8 0 01-3.1 4.1" />
          <path d="M6.2 6.2C3.9 7.8 3 10.2 3 12c0 2 4 7 9 7a10 10 0 004-.8" />
        </>
      )}
    </svg>
  );
}
