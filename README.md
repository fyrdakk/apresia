<div align="center">

<img src="public/img/logo.png" alt="Logo APRESIA" width="120" />

# APRESIA

**Sistem Pendukung Keputusan Pemilihan Penerima Penghargaan Mahasiswa**
menggunakan metode *Simple Additive Weighting* (SAW)

![Next.js](https://img.shields.io/badge/Next.js-16.4.5-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth_%7C_DB_%7C_Storage-3FCF8E?logo=supabase&logoColor=white)

</div>

---

## Daftar Isi

- [Tentang Projek](#tentang-projek)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Alur Sistem](#alur-sistem)
- [Metode SAW dan Kriteria Penilaian](#metode-saw-dan-kriteria-penilaian)
- [Struktur Projek](#struktur-projek)
- [Struktur Database dan Storage](#struktur-database-dan-storage)
- [Instalasi dan Menjalankan Projek](#instalasi-dan-menjalankan-projek)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Daftar Halaman (Routing)](#daftar-halaman-routing)
- [Penjelasan AI (Groq)](#penjelasan-ai-groq)
- [Script yang Tersedia](#script-yang-tersedia)
- [Deployment](#deployment)
- [Catatan Penting untuk Pengembang](#catatan-penting-untuk-pengembang)

---

## Tentang Projek

**APRESIA** adalah aplikasi web yang membantu panitia atau administrator menentukan penerima penghargaan mahasiswa secara objektif dan transparan. Sistem ini menggabungkan:

- pendataan **akademik**, **portofolio**, dan **dokumen bukti** oleh mahasiswa,
- **verifikasi bukti** oleh administrator,
- **perhitungan peringkat** dengan metode **Simple Additive Weighting (SAW)**, dan
- **publikasi hasil** kepada mahasiswa, dilengkapi penjelasan hasil berbasis AI.

Aplikasi memiliki dua peran pengguna: **Administrator** dan **Mahasiswa**. Setiap peran memiliki portal dan menu tersendiri.

---

## Fitur Utama

### Administrator

| Fitur | Deskripsi |
| --- | --- |
| **Dashboard** | Ringkasan jumlah mahasiswa terdaftar, total dokumen bukti, data penilaian, dan hasil yang sudah dipublikasikan, beserta pintasan ke fitur lain. |
| **Data Mahasiswa** | Melihat daftar mahasiswa terdaftar (NIM, nama, fakultas, prodi, semester, email) dengan pencarian berdasarkan nama, NIM, atau email. |
| **Data Kriteria** | Mengelola nama, deskripsi, dan bobot kriteria C1–C5. Total bobot wajib tetap 1,00 (100%). |
| **Verifikasi Bukti** | Meninjau dokumen bukti yang diunggah mahasiswa, lalu menetapkan status *Tervalidasi*, *Perlu Revisi*, atau *Ditolak* disertai catatan admin. |
| **Perhitungan SAW** | Menginput nilai C3–C5, memvalidasi penilaian, lalu menjalankan perhitungan normalisasi, nilai preferensi, dan peringkat. |
| **Hasil Ranking** | Melihat peringkat, mempublikasikan atau membatalkan publikasi hasil (satuan maupun massal), serta menampilkan penjelasan AI untuk tiap mahasiswa. |

### Mahasiswa

| Fitur | Deskripsi |
| --- | --- |
| **Registrasi dan Login** | Pendaftaran akun dengan NIM, fakultas, prodi, dan semester. Login diarahkan otomatis sesuai peran. |
| **Dashboard** | Panduan langkah berikutnya (isi data, unggah dokumen, dan seterusnya) serta ringkasan status verifikasi dokumen. |
| **Data Akademik** | Mengisi IPK (skala 0–4) dan nilai bahasa Inggris (TOEFL). |
| **Portofolio dan Prestasi** | Mencatat portofolio per kategori, tingkat, jabatan, tahun, dan deskripsi. |
| **Dokumen Bukti** | Mengunggah, mengganti (*re-upload*), dan menghapus dokumen bukti untuk setiap portofolio, serta memantau status verifikasinya. |
| **Pengumuman** | Melihat hasil seleksi (peringkat dan nilai) setelah dipublikasikan oleh admin. |

---

## Teknologi yang Digunakan

| Kategori | Teknologi |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16.4.5 (App Router, Turbopack) |
| Library UI | React 19.3.0, [Lucide React](https://lucide.dev) (ikon) |
| Bahasa | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Backend-as-a-Service | [Supabase](https://supabase.com) (`@supabase/supabase-js`, `@supabase/ssr`) untuk Auth, Database (PostgreSQL), dan Storage |
| AI | [Groq API](https://groq.com) dengan model `openai/gpt-oss-20b` |
| Linter | ESLint 9 + `eslint-config-next` |

---

## Alur Sistem

```text
Mahasiswa                                Administrator
─────────                                ─────────────
1. Registrasi & login
2. Isi data akademik (IPK, TOEFL)
3. Isi portofolio & prestasi
4. Unggah dokumen bukti  ───────────►  5. Verifikasi bukti
                                          (tervalidasi / perlu revisi / ditolak)
                                       6. Input nilai C3–C5 → simpan
                                       7. Validasi penilaian
                                       8. Jalankan perhitungan SAW
                                       9. Publikasikan hasil ranking
10. Lihat hasil di halaman
    Pengumuman  ◄─────────────────────
```

---

## Metode SAW dan Kriteria Penilaian

APRESIA menggunakan **lima kriteria** (kode wajib tepat `C1`–`C5`). Seluruh kriteria saat ini bertipe **Benefit**; bobot dibaca dari tabel `kriteria` di database dan dapat diubah admin melalui halaman **Data Kriteria**.

| Kode | Kriteria | Sumber Nilai |
| --- | --- | --- |
| C1 | IPK | Diambil otomatis dari **Data Akademik** mahasiswa |
| C2 | Kemampuan Bahasa Inggris (TOEFL) | Diambil otomatis dari **Data Akademik** mahasiswa |
| C3 | Keaktifan Organisasi | Diinput admin (rentang 0–100) |
| C4 | Karya Ilmiah dan Kontribusi | Diinput admin (rentang 0–100) |
| C5 | Prestasi dan Sertifikasi | Diinput admin (rentang 0–100) |

### Rumus

**1. Normalisasi** (r<sub>ij</sub>)

- Kriteria *Benefit*: `r = x / max(x)`
- Kriteria *Cost*: `r = min(x) / x`

**2. Nilai preferensi** (V<sub>i</sub>)

```text
V_i = Σ ( w_j × r_ij )
```

dengan `w_j` adalah bobot kriteria ke-j. Mahasiswa kemudian diurutkan dari nilai preferensi **tertinggi** ke terendah untuk menentukan peringkat.

### Aturan Perhitungan

Perhitungan SAW hanya berjalan jika:

- tabel `kriteria` berisi tepat **5 kriteria** dengan kode `C1`–`C5`,
- **total bobot = 1,00**,
- terdapat minimal satu penilaian berstatus **tervalidasi**,
- nilai C3–C5 berada pada rentang **0–100**, dan data akademik (IPK serta nilai bahasa Inggris) sudah lengkap.

Hanya mahasiswa dengan penilaian **tervalidasi** yang ikut diperingkat.

### Status yang Digunakan

| Objek | Status |
| --- | --- |
| Dokumen bukti | `menunggu`, `tervalidasi`, `perlu_revisi`, `ditolak` |
| Penilaian (`hasil_penilaian`) | `menunggu`, `tervalidasi`, `perlu_revisi` |
| Publikasi hasil | `status_publikasi` bernilai `true` / `false` |

> Menyimpan ulang nilai penilaian akan mengembalikan statusnya ke `menunggu` dan membatalkan publikasi, sehingga harus divalidasi dan dihitung ulang.

---

## Struktur Projek

```text
apresia/
├── public/
│   └── img/
│       └── logo.png                    # Logo aplikasi
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (metadata, lang="id")
│   │   ├── page.tsx                    # Redirect otomatis ke /login
│   │   ├── globals.css                 # Gaya global
│   │   ├── login/                      # Halaman login
│   │   ├── registrasi/                 # Halaman registrasi mahasiswa
│   │   ├── test-supabase/              # Halaman uji koneksi Supabase
│   │   ├── api/
│   │   │   └── ai-explanation/
│   │   │       └── route.ts            # API penjelasan hasil (Groq + fallback)
│   │   ├── admin/                      # Portal Administrator
│   │   │   ├── page.tsx                # Dashboard admin
│   │   │   ├── data_mahasiswa/
│   │   │   ├── data_kriteria/
│   │   │   ├── verifikasi_bukti/
│   │   │   ├── perhitungan_saw/
│   │   │   └── ranking/
│   │   └── mahasiswa/                  # Portal Mahasiswa
│   │       ├── page.tsx                # Dashboard mahasiswa
│   │       ├── data_akademik/
│   │       ├── portofolio_prestasi/
│   │       ├── dokumen/
│   │       └── pengumuman/
│   ├── components/
│   │   ├── portal-shell.tsx            # Kerangka portal (menu, logout)
│   │   ├── auth-brand.tsx              # Panel brand halaman login/registrasi
│   │   ├── admin/admin_sidebar.tsx
│   │   └── mahasiswa/mahasiswa_sidebar.tsx
│   └── lib/
│       └── supabase/
│           ├── client.ts               # Supabase client (browser)
│           └── server.ts               # Supabase client (server / cookies)
├── .env.example                        # Contoh variabel lingkungan
├── next.config.ts
├── tsconfig.json                       # Alias path: @/* → ./src/*
├── eslint.config.mjs
└── package.json
```

---

## Struktur Database dan Storage

Aplikasi menggunakan layanan Supabase. Berdasarkan kode program, berikut tabel dan storage yang **harus tersedia** di projek Supabase Anda.

### Tabel

| Tabel | Fungsi | Kolom |
| --- | --- | --- |
| `login` | Profil pengguna dan peran | `id` (uuid, PK, terhubung ke `auth.users.id`), `nama_lengkap`, `nim` (unik), `fakultas`, `prodi`, `email` (unik), `role` (`admin` / `mahasiswa`), `created_at`, `semester` (int2) |
| `data_akademik` | Data akademik mahasiswa | `id` (uuid, PK), `mahasiswa_id` (uuid, unik), `ipk` (numeric), `nilai_bahasa_inggris` (numeric), `created_at`, `updated_at` |
| `portofolio` | Portofolio dan prestasi mahasiswa | `id` (uuid, PK), `mahasiswa_id`, `kategori`, `judul`, `penyelenggara`, `jabatan`, `tingkat`, `tahun` (int4), `deskripsi`, `created_at` |
| `dokumen_bukti` | Metadata dokumen bukti | `id` (uuid, PK), `mahasiswa_id`, `portofolio_id`, `kategori`, `nama_file`, `storage_path`, `tipe_file`, `ukuran_file` (int8), `status_verifikasi`, `catatan_admin`, `diverifikasi_oleh` (uuid, admin yang memverifikasi), `tanggal_verifikasi`, `created_at` |
| `kriteria` | Kriteria dan bobot SAW | `id` (uuid, PK), `kode` (unik), `nama_kriteria`, `deskripsi`, `bobot` (numeric), `jenis` (`Benefit` / `Cost`), `created_at` |
| `hasil_penilaian` | Nilai, normalisasi, preferensi, dan peringkat | `id` (uuid, PK), `mahasiswa_id` (uuid, unik), `admin_id` (uuid, admin yang memvalidasi), `nilai_c1`–`nilai_c5`, `normalisasi_c1`–`normalisasi_c5`, `nilai_preferensi`, `peringkat` (int4), `status_validasi`, `status_publikasi` (bool), `catatan`, `tanggal_penilaian`, `tanggal_validasi`, `tanggal_publikasi`, `created_at`, `updated_at` |

**Relasi antartabel:**

- `login.id` terhubung ke `auth.users.id`.
- `data_akademik.mahasiswa_id`, `portofolio.mahasiswa_id`, `dokumen_bukti.mahasiswa_id`, dan `hasil_penilaian.mahasiswa_id` mengacu ke `login.id`.
- `dokumen_bukti.portofolio_id` mengacu ke `portofolio.id`.
- `hasil_penilaian.admin_id` dan `dokumen_bukti.diverifikasi_oleh` mengacu ke `login.id` milik admin.

### Storage

- Bucket bernama **`dokumen-bukti`** untuk menyimpan berkas bukti.
- Berkas disimpan pada path `{user_id}/{timestamp}-{uuid}.{ekstensi}`.
- Admin membuka berkas melalui *signed URL* yang berlaku 5 menit.

### Ketentuan yang Perlu Disiapkan di Supabase

- **Database Trigger** pada `auth.users` yang menyalin metadata registrasi (`nama_lengkap`, `nim`, `fakultas`, `prodi`, `semester`) ke tabel `public.login` secara otomatis.
- **Row Level Security (RLS)** pada tabel-tabel di atas agar mahasiswa hanya dapat mengakses datanya sendiri dan admin memiliki hak membaca/mengubah data yang diperlukan (termasuk `UPDATE` pada `hasil_penilaian` dan `dokumen_bukti`).
- **Constraint** `dokumen_bukti_kategori_check` pada kolom `kategori` tabel `dokumen_bukti` yang menerima nilai: `organisasi`, `karya_ilmiah`, `pkm`, `kontribusi`, `prestasi`, `sertifikasi`.
- **Akun administrator**: akun dengan `role = 'admin'` pada tabel `login` (registrasi publik hanya membuat akun mahasiswa).
- **Data awal `kriteria`**: lima baris dengan kode `C1`–`C5` dengan total bobot 1,00.

### Aturan Input

| Data | Aturan |
| --- | --- |
| IPK | 0,00 – 4,00 |
| Nilai bahasa Inggris | Angka ≥ 0 (skala mengikuti jenis tes, contoh TOEFL: 500) |
| Semester | 1 – 14 |
| Password | Minimal 8 karakter |
| Kategori portofolio | Organisasi, Karya Ilmiah, Program Kreativitas Mahasiswa (PKM), Kontribusi Mahasiswa, Prestasi / Penghargaan, Sertifikasi |
| Tingkat portofolio | Universitas, Regional, Nasional, Internasional, Lainnya |
| Dokumen bukti | Format **PDF, JPG, JPEG, PNG**, ukuran maksimal **2 MB** per berkas |

---

## Instalasi dan Menjalankan Projek

### Prasyarat

- [Node.js](https://nodejs.org) (disarankan versi LTS terbaru) dan npm
- Akun dan projek [Supabase](https://supabase.com)
- *(Opsional)* API key [Groq](https://console.groq.com) untuk penjelasan hasil berbasis AI

### Langkah-langkah

**1. Clone repositori**

```bash
git clone <url-repositori-anda>
cd apresia
```

**2. Pasang dependensi**

```bash
npm install
```

**3. Siapkan variabel lingkungan**

Salin berkas contoh lalu isi nilainya (lihat [Variabel Lingkungan](#variabel-lingkungan)).

```bash
# Linux / macOS
cp .env.example .env.local

# Windows (Command Prompt)
copy .env.example .env.local
```

**4. Siapkan Supabase**

Buat tabel, bucket `dokumen-bukti`, trigger, RLS, dan data awal kriteria sesuai bagian [Struktur Database dan Storage](#struktur-database-dan-storage).

**5. Jalankan server pengembangan**

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Halaman utama akan langsung diarahkan ke `/login`.

**6. Uji koneksi Supabase** *(opsional)*

Buka [http://localhost:3000/test-supabase](http://localhost:3000/test-supabase). Jika konfigurasi benar akan tampil pesan **"Supabase berhasil terhubung"**.

---

## Variabel Lingkungan

Buat berkas `.env.local` di root projek:

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxx
GROQ_API_KEY=masukkan_api_key_kamu
```

| Variabel | Wajib | Keterangan |
| --- | :---: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | URL projek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | *Publishable / anon key* Supabase |
| `GROQ_API_KEY` | Tidak | API key Groq. Jika kosong, sistem memakai penjelasan cadangan (*fallback*) |

> ⚠️ **Jangan pernah** meng-*commit* berkas `.env.local`. Pola `.env*` sudah masuk ke `.gitignore`.

---

## Daftar Halaman (Routing)

### Umum

| Route | Deskripsi |
| --- | --- |
| `/` | Redirect ke `/login` |
| `/login` | Login (redirect sesuai peran) |
| `/registrasi` | Registrasi akun mahasiswa |
| `/test-supabase` | Uji koneksi Supabase |
| `POST /api/ai-explanation` | Endpoint penjelasan hasil ranking |

### Administrator (`/admin`)

| Route | Deskripsi |
| --- | --- |
| `/admin` | Dashboard |
| `/admin/data_mahasiswa` | Data mahasiswa |
| `/admin/data_kriteria` | Kriteria dan bobot |
| `/admin/verifikasi_bukti` | Verifikasi dokumen bukti |
| `/admin/perhitungan_saw` | Input nilai, validasi, dan perhitungan SAW |
| `/admin/ranking` | Hasil ranking dan publikasi |

### Mahasiswa (`/mahasiswa`)

| Route | Deskripsi |
| --- | --- |
| `/mahasiswa` | Dashboard |
| `/mahasiswa/data_akademik` | Data akademik |
| `/mahasiswa/portofolio_prestasi` | Portofolio dan prestasi |
| `/mahasiswa/dokumen` | Dokumen bukti |
| `/mahasiswa/pengumuman` | Hasil seleksi |

---

## Penjelasan AI (Groq)

Pada halaman **Hasil Ranking**, admin dapat menampilkan penjelasan singkat mengenai posisi peringkat seorang mahasiswa. Endpoint `POST /api/ai-explanation` bekerja sebagai berikut:

1. Menerima nama, peringkat, nilai C1–C5, dan nilai preferensi.
2. Mengirim *prompt* ke Groq (model `openai/gpt-oss-20b`, batas waktu 12 detik).
3. AI diminta menjelaskan dalam bahasa Indonesia formal, maksimal dua paragraf, **tanpa menghitung ulang nilai SAW**.
4. Jika `GROQ_API_KEY` tidak ada, Groq gagal, *timeout*, atau respons kosong, sistem otomatis memakai **penjelasan cadangan** berbasis templat.

Respons berisi `explanation` dan `source` (`"groq"` atau `"fallback"`).

---

## Script yang Tersedia

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Membuat build produksi |
| `npm run start` | Menjalankan hasil build produksi |
| `npm run lint` | Menjalankan ESLint |

---

## Deployment

Cara paling mudah adalah memakai [Vercel](https://vercel.com):

1. *Push* projek ke GitHub.
2. Impor repositori pada Vercel.
3. Tambahkan seluruh [variabel lingkungan](#variabel-lingkungan) pada pengaturan projek.
4. Deploy.

Pastikan URL aplikasi hasil deployment juga sudah didaftarkan pada pengaturan **Authentication → URL Configuration** di Supabase.

---

## Catatan Penting untuk Pengembang

- Projek memakai Next.js versi baru dengan opsi eksperimental (`cacheComponents`, `partialPrefetching`, `agentFeedback`) pada `next.config.ts`. Berkas `AGENTS.md` mengingatkan bahwa konvensi versi ini dapat berbeda dari versi sebelumnya; rujuk dokumentasi di `node_modules/next/dist/docs/` sebelum mengubah kode.
- Alias impor `@/*` mengarah ke `./src/*`.
- Skema database, kebijakan RLS, trigger, dan bucket **tidak disertakan** dalam repositori ini. Simpan skrip SQL-nya agar projek mudah dipasang ulang.
- Halaman `/test-supabase` hanya untuk pengujian dan sebaiknya dihapus atau dibatasi sebelum produksi.
- Kontrol akses antar peran bergantung pada **RLS Supabase**; pastikan kebijakannya dikonfigurasi dengan benar.

---

## Lisensi

Projek ini dibuat untuk keperluan akademik mata kuliah Sistem Pendukung Keputusan


