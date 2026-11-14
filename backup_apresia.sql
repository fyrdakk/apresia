--
-- PostgreSQL database dump
--

\restrict AObClh5qFCXTAlvePjCxJ3VSRhDeF8xSqWQHtPLc3ZUvvOmQ7Qk52giddiuBboG

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    INSERT INTO public.login (
        id,
        nama_lengkap,
        nim,
        fakultas,
        prodi,
        email,
        role,
        semester
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'nama_lengkap',
        NEW.raw_user_meta_data ->> 'nim',
        NEW.raw_user_meta_data ->> 'fakultas',
        NEW.raw_user_meta_data ->> 'prodi',
        NEW.email,
        'mahasiswa',
        (NEW.raw_user_meta_data ->> 'semester')::SMALLINT
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.login
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: data_akademik; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_akademik (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mahasiswa_id uuid NOT NULL,
    ipk numeric(3,2),
    nilai_bahasa_inggris numeric(8,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT data_akademik_ipk_check CHECK (((ipk >= (0)::numeric) AND (ipk <= 4.00))),
    CONSTRAINT data_akademik_nilai_bahasa_inggris_check CHECK ((nilai_bahasa_inggris >= (0)::numeric))
);


ALTER TABLE public.data_akademik OWNER TO postgres;

--
-- Name: dokumen_bukti; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dokumen_bukti (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mahasiswa_id uuid NOT NULL,
    portofolio_id uuid,
    kategori character varying(30) NOT NULL,
    nama_file character varying(255) NOT NULL,
    storage_path text NOT NULL,
    tipe_file character varying(100),
    ukuran_file bigint,
    status_verifikasi character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    catatan_admin text,
    diverifikasi_oleh uuid,
    tanggal_verifikasi timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dokumen_bukti_kategori_check CHECK (((kategori)::text = ANY ((ARRAY['akademik'::character varying, 'bahasa_inggris'::character varying, 'organisasi'::character varying, 'karya_ilmiah'::character varying, 'pkm'::character varying, 'kontribusi'::character varying, 'prestasi'::character varying, 'sertifikasi'::character varying])::text[]))),
    CONSTRAINT dokumen_bukti_status_verifikasi_check CHECK (((status_verifikasi)::text = ANY ((ARRAY['menunggu'::character varying, 'tervalidasi'::character varying, 'perlu_revisi'::character varying, 'ditolak'::character varying])::text[])))
);


ALTER TABLE public.dokumen_bukti OWNER TO postgres;

--
-- Name: hasil_penilaian; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hasil_penilaian (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mahasiswa_id uuid NOT NULL,
    admin_id uuid,
    nilai_c1 numeric(12,4) DEFAULT 0 NOT NULL,
    nilai_c2 numeric(12,4) DEFAULT 0 NOT NULL,
    nilai_c3 numeric(12,4) DEFAULT 0 NOT NULL,
    nilai_c4 numeric(12,4) DEFAULT 0 NOT NULL,
    nilai_c5 numeric(12,4) DEFAULT 0 NOT NULL,
    normalisasi_c1 numeric(12,8),
    normalisasi_c2 numeric(12,8),
    normalisasi_c3 numeric(12,8),
    normalisasi_c4 numeric(12,8),
    normalisasi_c5 numeric(12,8),
    nilai_preferensi numeric(12,8),
    peringkat integer,
    status_validasi character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    status_publikasi boolean DEFAULT false NOT NULL,
    catatan text,
    tanggal_penilaian timestamp with time zone DEFAULT now(),
    tanggal_validasi timestamp with time zone,
    tanggal_publikasi timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT hasil_penilaian_peringkat_check CHECK (((peringkat IS NULL) OR (peringkat > 0))),
    CONSTRAINT hasil_penilaian_status_validasi_check CHECK (((status_validasi)::text = ANY ((ARRAY['menunggu'::character varying, 'tervalidasi'::character varying, 'perlu_revisi'::character varying])::text[])))
);


ALTER TABLE public.hasil_penilaian OWNER TO postgres;

--
-- Name: kriteria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kriteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kode character varying(5) NOT NULL,
    nama_kriteria character varying(150) NOT NULL,
    deskripsi text,
    bobot numeric(5,4) NOT NULL,
    jenis character varying(10) DEFAULT 'Benefit'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT kriteria_bobot_check CHECK (((bobot >= (0)::numeric) AND (bobot <= (1)::numeric))),
    CONSTRAINT kriteria_jenis_check CHECK (((jenis)::text = ANY ((ARRAY['Benefit'::character varying, 'Cost'::character varying])::text[])))
);


ALTER TABLE public.kriteria OWNER TO postgres;

--
-- Name: login; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login (
    id uuid NOT NULL,
    nama_lengkap text NOT NULL,
    nim character varying(20),
    fakultas text,
    prodi text,
    email text NOT NULL,
    role text DEFAULT 'mahasiswa'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    semester smallint,
    CONSTRAINT login_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'mahasiswa'::text])))
);


ALTER TABLE public.login OWNER TO postgres;

--
-- Name: portofolio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portofolio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mahasiswa_id uuid NOT NULL,
    kategori character varying(100) NOT NULL,
    judul character varying(200) NOT NULL,
    penyelenggara character varying(150),
    jabatan character varying(150),
    tingkat character varying(50),
    tahun integer,
    deskripsi text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT portofolio_kategori_check CHECK (((kategori)::text = ANY ((ARRAY['Organisasi'::character varying, 'Karya Ilmiah'::character varying, 'Program Kreativitas Mahasiswa (PKM)'::character varying, 'Kontribusi Mahasiswa'::character varying, 'Prestasi / Penghargaan'::character varying, 'Sertifikasi'::character varying, 'Karya Ilmiah / PKM'::character varying])::text[])))
);


ALTER TABLE public.portofolio OWNER TO postgres;

--
-- Data for Name: data_akademik; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_akademik (id, mahasiswa_id, ipk, nilai_bahasa_inggris, created_at, updated_at) FROM stdin;
3f7fc7d2-2f85-4158-b546-46a90c430a97	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	3.80	500.00	2026-11-11 16:42:36.041536+00	2026-11-11 16:42:36.041536+00
a263b5f6-f278-4b3e-8a6a-66c1a98f0447	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	3.60	450.00	2026-11-11 16:52:37.649279+00	2026-11-11 16:52:37.649279+00
8d208ecb-8f86-4da9-b58e-007d22ceef8d	c1e90de2-86dc-48be-8d63-52fcb0dceb26	3.90	550.00	2026-11-11 17:10:53.4765+00	2026-11-11 17:10:53.4765+00
\.


--
-- Data for Name: dokumen_bukti; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dokumen_bukti (id, mahasiswa_id, portofolio_id, kategori, nama_file, storage_path, tipe_file, ukuran_file, status_verifikasi, catatan_admin, diverifikasi_oleh, tanggal_verifikasi, created_at) FROM stdin;
10b181ee-9c32-4746-ab3f-18ddf32fb90e	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	cf94237b-518f-46a8-a936-0902fd48bf3a	organisasi	Sertifikat.pdf	9ee7021e-57f3-49b4-a9f6-c0ed80b14791/1794415597357-0f136b0b-3cb8-4144-982e-0e86428cbcc3.pdf	application/pdf	24011	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 16:47:55.48+00	2026-11-11 16:46:32.227547+00
b2e4a1ad-96f8-46bb-a686-810417fece87	c1e90de2-86dc-48be-8d63-52fcb0dceb26	8ad9486a-be32-4216-a6f9-09a7a00814c9	karya_ilmiah	Daeng Mhd El Faritsi.pdf	c1e90de2-86dc-48be-8d63-52fcb0dceb26/1794417494650-116ace71-16f1-4c07-a8d6-3c4cb149e322.pdf	application/pdf	1268743	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 17:19:00.977+00	2026-11-11 17:18:10.827889+00
cabc377b-914d-414d-a901-ccf0fc3957b3	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	6fbd7570-8ebd-4228-8a49-3e9082835b38	prestasi	Sertifikat Penghargaan Juara 1 UI_UX.png	9ee7021e-57f3-49b4-a9f6-c0ed80b14791/1794415825681-5f008973-b7a1-4c91-a8d0-3903180e81dd.png	image/png	1778139	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 16:50:55.591+00	2026-11-11 16:50:23.244242+00
39803860-5222-40a0-934c-9747fe906e6f	c1e90de2-86dc-48be-8d63-52fcb0dceb26	7b089870-a3ee-45b6-8c25-a09b3a738312	prestasi	Sertifikat.pdf	c1e90de2-86dc-48be-8d63-52fcb0dceb26/1794417464591-4f55055c-a8e0-479d-afa7-ab0bbc6e4f93.pdf	application/pdf	24011	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 17:19:04.006+00	2026-11-11 17:17:39.910997+00
63d8dce3-893e-44d5-89ec-231d85c68e9d	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	c495618e-5840-44ee-879c-72ce90ed9281	pkm	Sertifikat.pdf	9ee7021e-57f3-49b4-a9f6-c0ed80b14791/1794415580365-38da1875-d2dd-4c4d-9951-1041fa97baaf.pdf	application/pdf	24011	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 16:51:02.631+00	2026-11-11 16:46:15.531558+00
71854ffd-7d76-4509-8d8d-39a587fc810c	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	1824a4c4-6eff-46e5-8fb5-97efbb916d05	organisasi	Sertifikat.pdf	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d/1794416326817-9305342d-c40c-4b67-82db-99af7b100d46.pdf	application/pdf	24011	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 16:59:13.445+00	2026-11-11 16:58:41.691043+00
eefb12bd-9410-42f6-9d14-918e0f4fddf3	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	0df3e044-0757-4732-b8a7-afd123e5c91c	karya_ilmiah	07. Contoh Artikel SAW.pdf	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d/1794416314879-75f8c522-04f5-4a98-8cec-ec218fbf202c.pdf	application/pdf	469215	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 16:59:16.859+00	2026-11-11 16:58:30.593019+00
cf671216-b4fd-4b04-89d3-ed37763fbf70	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	33f36003-1c04-47e2-ada0-56157090287b	prestasi	Sertifikat.pdf	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d/1794416303931-bda0c3c5-8ef3-4ae3-b9bc-768fbfc321af.pdf	application/pdf	24011	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-11 16:59:20.712+00	2026-11-11 16:58:19.669065+00
7094e76f-441a-4442-85e0-d49f87a96dfb	c1e90de2-86dc-48be-8d63-52fcb0dceb26	300b38d2-4cb0-4510-8ad1-c72f35dc8e39	organisasi	Sertifikat.pdf	c1e90de2-86dc-48be-8d63-52fcb0dceb26/1794417513106-c1ccef21-ab28-4559-928c-5af7b801caf0.pdf	application/pdf	24011	tervalidasi	\N	66dbcb8f-a6ba-43c6-8748-1908e766650a	2026-11-12 03:15:17.951+00	2026-11-11 17:18:28.027304+00
\.


--
-- Data for Name: hasil_penilaian; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hasil_penilaian (id, mahasiswa_id, admin_id, nilai_c1, nilai_c2, nilai_c3, nilai_c4, nilai_c5, normalisasi_c1, normalisasi_c2, normalisasi_c3, normalisasi_c4, normalisasi_c5, nilai_preferensi, peringkat, status_validasi, status_publikasi, catatan, tanggal_penilaian, tanggal_validasi, tanggal_publikasi, created_at, updated_at) FROM stdin;
35f27027-d050-416d-b6b9-fe4be64d0d40	c1e90de2-86dc-48be-8d63-52fcb0dceb26	66dbcb8f-a6ba-43c6-8748-1908e766650a	3.9000	550.0000	70.0000	95.0000	80.0000	1.00000000	1.00000000	0.77777778	1.00000000	0.88888889	0.94444444	1	tervalidasi	t	\N	2026-11-11 17:19:31.289543+00	2026-11-11 17:19:39.037+00	2026-11-12 15:45:32.879+00	2026-11-11 17:19:31.289543+00	2026-11-12 15:45:32.879+00
15217efc-d66b-48b4-aee0-1c3fb557cd57	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	66dbcb8f-a6ba-43c6-8748-1908e766650a	3.8000	500.0000	80.0000	90.0000	85.0000	0.97435897	0.90909091	0.88888889	0.94736842	0.94444444	0.93582178	2	tervalidasi	t	\N	2026-11-11 16:51:45.341661+00	2026-11-11 16:52:01.401+00	2026-11-12 15:47:25.347258+00	2026-11-11 16:51:45.341661+00	2026-11-12 15:47:25.347258+00
aa08ea89-4635-4f93-827c-63b0f2f88156	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	66dbcb8f-a6ba-43c6-8748-1908e766650a	3.6000	450.0000	90.0000	80.0000	90.0000	0.92307692	0.81818182	1.00000000	0.84210526	1.00000000	0.90898049	3	tervalidasi	t	\N	2026-11-11 17:08:32.847936+00	2026-11-11 17:10:05.175+00	2026-11-12 15:47:25.347258+00	2026-11-11 17:08:32.847936+00	2026-11-12 15:47:25.347258+00
\.


--
-- Data for Name: kriteria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kriteria (id, kode, nama_kriteria, deskripsi, bobot, jenis, created_at) FROM stdin;
c7eece7f-c303-4bad-9b38-0141deea890d	C2	Kemampuan Bahasa Inggris (TOEFL)	Menilai kemampuan mahasiswa dalam berbahasa Inggris berdasarkan hasil tes TOEFL sebagai indikator kompetensi bahasa asing.	0.2000	Benefit	2026-11-11 05:40:29.121231+00
8baf2d2d-3f6d-43b7-96f2-503d88417474	C3	Keaktifan dan Jabatan Organisasi	Menilai keterlibatan mahasiswa dalam organisasi kemahasiswaan berdasarkan tingkat keaktifan, tanggung jawab, jabatan, dan kontribusi yang diberikan.	0.2000	Benefit	2026-11-11 05:40:29.121231+00
8ed72cc2-0679-46c2-947e-0819fc9bdcc9	C4	Karya Ilmiah dan Kontribusi Mahasiswa (PKM)	Menilai keterlibatan dan pencapaian mahasiswa dalam menghasilkan karya ilmiah, penelitian, serta kegiatan Program Kreativitas Mahasiswa (PKM) yang menunjukkan kemampuan akademik dan inovasi.	0.2000	Benefit	2026-11-11 05:40:29.121231+00
79ba58d0-07c9-456d-a861-5405171baa1c	C5	Prestasi dan Sertifikasi	Menilai pencapaian mahasiswa melalui penghargaan akademik maupun nonakademik serta kepemilikan sertifikat kompetensi yang relevan.	0.1000	Benefit	2026-11-11 05:40:29.121231+00
fdc9d49b-8b27-4256-8b60-08d7dfdd2649	C1	IPK	Menilai pencapaian akademik mahasiswa berdasarkan Indeks Prestasi Kumulatif (IPK) sebagai indikator keberhasilan dalam mengikuti kegiatan pembelajaran di perguruan tinggi.	0.3000	Benefit	2026-11-11 05:40:29.121231+00
\.


--
-- Data for Name: login; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login (id, nama_lengkap, nim, fakultas, prodi, email, role, created_at, semester) FROM stdin;
66dbcb8f-a6ba-43c6-8748-1908e766650a	Admin Kampus	\N	\N	\N	freydaninini@gmail.com	admin	2026-11-08 17:06:08.366675+00	\N
9ee7021e-57f3-49b4-a9f6-c0ed80b14791	Firda Nabilah	1213232320	Fakultas Teknik	PTIK	firdanabilah2009@gmail.com	mahasiswa	2026-11-11 04:47:13.672972+00	5
b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	Yuhda	5243623010	Fakultas Teknik	Teknik Sipil	yuhda@gmail.com	mahasiswa	2026-11-11 04:48:06.931961+00	5
c1e90de2-86dc-48be-8d63-52fcb0dceb26	Fransiskus	5243115620	Fakultas Teknik	Tata Boga	fransiskus@gmail.com	mahasiswa	2026-11-11 04:49:10.879389+00	5
\.


--
-- Data for Name: portofolio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.portofolio (id, mahasiswa_id, kategori, judul, penyelenggara, jabatan, tingkat, tahun, deskripsi, created_at) FROM stdin;
cf94237b-518f-46a8-a936-0902fd48bf3a	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	Organisasi	UKM FT UNIMED	FT UNIMED	Anggota	Universitas	2026	ikut UKM FT UNIMED 2025-2026	2026-11-11 16:43:34.4251+00
6fbd7570-8ebd-4228-8a49-3e9082835b38	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	Prestasi / Penghargaan	Juara 1 UI/UX Desain	Devfest Medan	Individu	Regional	2026	Juara 1 UI/UX Desain diselenggarakan Devfest Medan	2026-11-11 16:44:33.409094+00
c495618e-5840-44ee-879c-72ce90ed9281	9ee7021e-57f3-49b4-a9f6-c0ed80b14791	Program Kreativitas Mahasiswa (PKM)	Poster favorit PKM 2025	kemdiktisaintek	Anggota	Nasional	2025	Poster favorit PKM 2025 diselenggarakan di UNDIP	2026-11-11 16:46:00.588702+00
1824a4c4-6eff-46e5-8fb5-97efbb916d05	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	Organisasi	BEM UNIMED	UNIMED	Ketua	Universitas	2026	BEM UNIMED 2026	2026-11-11 16:55:13.287238+00
0df3e044-0757-4732-b8a7-afd123e5c91c	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	Karya Ilmiah	Sinta 3 Artikel SAW	BULLETIN OF COMPUTER SCIENCE RESEARCH	Anggota	Nasional	2024	Sinta 3 Artikel SAW terbit 2024	2026-11-11 16:56:43.454228+00
33f36003-1c04-47e2-ada0-56157090287b	b3fa7427-30b1-40bf-9a98-d1b8cc32f88d	Prestasi / Penghargaan	Juara 1 hackathon USU 2026	USU	Ketua	Nasional	2026	Juara 1 hackathon USU 2026 sebagai ketua tim	2026-11-11 16:58:08.240365+00
300b38d2-4cb0-4510-8ad1-c72f35dc8e39	c1e90de2-86dc-48be-8d63-52fcb0dceb26	Organisasi	Anggota UKM Tari FBS	FBS UNIMED	Anggota	Universitas	2024	Sebagai Anggota UKM Tari FBS hingga 2024	2026-11-11 17:11:59.627715+00
8ad9486a-be32-4216-a6f9-09a7a00814c9	c1e90de2-86dc-48be-8d63-52fcb0dceb26	Karya Ilmiah	Scopus 1 International Journal of Engineering and Technology	International Journal of Engineering and Technology	Ketua	Internasional	2026	Terbit artikel Scopus 1 jurnal International Journal of Engineering and Technology	2026-11-11 17:14:35.959854+00
7b089870-a3ee-45b6-8c25-a09b3a738312	c1e90de2-86dc-48be-8d63-52fcb0dceb26	Prestasi / Penghargaan	Harapan 1 Media Kreatif di UNP	UNP	Anggota	Nasional	2025	Harapan 1 Media Kreatif di UNP tahun 2025	2026-11-11 17:17:27.598616+00
\.


--
-- Name: data_akademik data_akademik_mahasiswa_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_akademik
    ADD CONSTRAINT data_akademik_mahasiswa_id_key UNIQUE (mahasiswa_id);


--
-- Name: data_akademik data_akademik_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_akademik
    ADD CONSTRAINT data_akademik_pkey PRIMARY KEY (id);


--
-- Name: dokumen_bukti dokumen_bukti_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokumen_bukti
    ADD CONSTRAINT dokumen_bukti_pkey PRIMARY KEY (id);


--
-- Name: hasil_penilaian hasil_penilaian_mahasiswa_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hasil_penilaian
    ADD CONSTRAINT hasil_penilaian_mahasiswa_id_key UNIQUE (mahasiswa_id);


--
-- Name: hasil_penilaian hasil_penilaian_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hasil_penilaian
    ADD CONSTRAINT hasil_penilaian_pkey PRIMARY KEY (id);


--
-- Name: kriteria kriteria_kode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kriteria
    ADD CONSTRAINT kriteria_kode_key UNIQUE (kode);


--
-- Name: kriteria kriteria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kriteria
    ADD CONSTRAINT kriteria_pkey PRIMARY KEY (id);


--
-- Name: login login_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login
    ADD CONSTRAINT login_email_key UNIQUE (email);


--
-- Name: login login_nim_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login
    ADD CONSTRAINT login_nim_key UNIQUE (nim);


--
-- Name: login login_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login
    ADD CONSTRAINT login_pkey PRIMARY KEY (id);


--
-- Name: portofolio portofolio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portofolio
    ADD CONSTRAINT portofolio_pkey PRIMARY KEY (id);


--
-- Name: data_akademik data_akademik_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_akademik
    ADD CONSTRAINT data_akademik_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.login(id) ON DELETE CASCADE;


--
-- Name: dokumen_bukti dokumen_bukti_diverifikasi_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokumen_bukti
    ADD CONSTRAINT dokumen_bukti_diverifikasi_oleh_fkey FOREIGN KEY (diverifikasi_oleh) REFERENCES public.login(id) ON DELETE SET NULL;


--
-- Name: dokumen_bukti dokumen_bukti_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokumen_bukti
    ADD CONSTRAINT dokumen_bukti_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.login(id) ON DELETE CASCADE;


--
-- Name: dokumen_bukti dokumen_bukti_portofolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokumen_bukti
    ADD CONSTRAINT dokumen_bukti_portofolio_id_fkey FOREIGN KEY (portofolio_id) REFERENCES public.portofolio(id) ON DELETE SET NULL;


--
-- Name: hasil_penilaian hasil_penilaian_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hasil_penilaian
    ADD CONSTRAINT hasil_penilaian_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.login(id) ON DELETE SET NULL;


--
-- Name: hasil_penilaian hasil_penilaian_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hasil_penilaian
    ADD CONSTRAINT hasil_penilaian_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.login(id) ON DELETE CASCADE;


--
-- Name: login login_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login
    ADD CONSTRAINT login_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: portofolio portofolio_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portofolio
    ADD CONSTRAINT portofolio_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.login(id) ON DELETE CASCADE;


--
-- Name: kriteria Admin dapat melihat data kriteria; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat melihat data kriteria" ON public.kriteria FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.login
  WHERE ((login.id = auth.uid()) AND (login.role = 'admin'::text)))));


--
-- Name: login Admin dapat melihat data login; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat melihat data login" ON public.login FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: hasil_penilaian Admin dapat melihat hasil penilaian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat melihat hasil penilaian" ON public.hasil_penilaian FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: data_akademik Admin dapat melihat semua data akademik; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat melihat semua data akademik" ON public.data_akademik FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: dokumen_bukti Admin dapat melihat semua dokumen; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat melihat semua dokumen" ON public.dokumen_bukti FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: portofolio Admin dapat melihat semua portofolio; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat melihat semua portofolio" ON public.portofolio FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: hasil_penilaian Admin dapat memperbarui hasil penilaian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat memperbarui hasil penilaian" ON public.hasil_penilaian FOR UPDATE TO authenticated USING (( SELECT public.is_admin() AS is_admin)) WITH CHECK (( SELECT public.is_admin() AS is_admin));


--
-- Name: dokumen_bukti Admin dapat memperbarui status dokumen; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat memperbarui status dokumen" ON public.dokumen_bukti FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.login
  WHERE ((login.id = ( SELECT auth.uid() AS uid)) AND (login.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.login
  WHERE ((login.id = ( SELECT auth.uid() AS uid)) AND (login.role = 'admin'::text)))));


--
-- Name: hasil_penilaian Admin dapat menambahkan hasil penilaian; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat menambahkan hasil penilaian" ON public.hasil_penilaian FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_admin() AS is_admin));


--
-- Name: kriteria Admin dapat mengubah data kriteria; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin dapat mengubah data kriteria" ON public.kriteria FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.login
  WHERE ((login.id = auth.uid()) AND (login.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.login
  WHERE ((login.id = auth.uid()) AND (login.role = 'admin'::text)))));


--
-- Name: data_akademik Mahasiswa melihat data akademik sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa melihat data akademik sendiri" ON public.data_akademik FOR SELECT TO authenticated USING ((auth.uid() = mahasiswa_id));


--
-- Name: dokumen_bukti Mahasiswa melihat dokumen sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa melihat dokumen sendiri" ON public.dokumen_bukti FOR SELECT TO authenticated USING ((mahasiswa_id = auth.uid()));


--
-- Name: hasil_penilaian Mahasiswa melihat hasil sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa melihat hasil sendiri" ON public.hasil_penilaian FOR SELECT TO authenticated USING ((mahasiswa_id = ( SELECT auth.uid() AS uid)));


--
-- Name: portofolio Mahasiswa melihat portofolio sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa melihat portofolio sendiri" ON public.portofolio FOR SELECT TO authenticated USING ((auth.uid() = mahasiswa_id));


--
-- Name: data_akademik Mahasiswa memperbarui data akademik sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa memperbarui data akademik sendiri" ON public.data_akademik FOR UPDATE TO authenticated USING ((auth.uid() = mahasiswa_id)) WITH CHECK ((auth.uid() = mahasiswa_id));


--
-- Name: portofolio Mahasiswa memperbarui portofolio sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa memperbarui portofolio sendiri" ON public.portofolio FOR UPDATE TO authenticated USING ((auth.uid() = mahasiswa_id)) WITH CHECK ((auth.uid() = mahasiswa_id));


--
-- Name: data_akademik Mahasiswa menambahkan data akademik sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa menambahkan data akademik sendiri" ON public.data_akademik FOR INSERT TO authenticated WITH CHECK ((auth.uid() = mahasiswa_id));


--
-- Name: dokumen_bukti Mahasiswa menambahkan dokumen sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa menambahkan dokumen sendiri" ON public.dokumen_bukti FOR INSERT TO authenticated WITH CHECK ((mahasiswa_id = auth.uid()));


--
-- Name: portofolio Mahasiswa menambahkan portofolio sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa menambahkan portofolio sendiri" ON public.portofolio FOR INSERT TO authenticated WITH CHECK ((auth.uid() = mahasiswa_id));


--
-- Name: dokumen_bukti Mahasiswa menghapus dokumen sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa menghapus dokumen sendiri" ON public.dokumen_bukti FOR DELETE TO authenticated USING ((mahasiswa_id = auth.uid()));


--
-- Name: portofolio Mahasiswa menghapus portofolio sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Mahasiswa menghapus portofolio sendiri" ON public.portofolio FOR DELETE TO authenticated USING ((auth.uid() = mahasiswa_id));


--
-- Name: login Pengguna dapat melihat profil sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna dapat melihat profil sendiri" ON public.login FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: data_akademik; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_akademik ENABLE ROW LEVEL SECURITY;

--
-- Name: dokumen_bukti; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.dokumen_bukti ENABLE ROW LEVEL SECURITY;

--
-- Name: hasil_penilaian; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.hasil_penilaian ENABLE ROW LEVEL SECURITY;

--
-- Name: kriteria; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.kriteria ENABLE ROW LEVEL SECURITY;

--
-- Name: login; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.login ENABLE ROW LEVEL SECURITY;

--
-- Name: portofolio; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.portofolio ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: TABLE data_akademik; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_akademik TO anon;
GRANT ALL ON TABLE public.data_akademik TO authenticated;
GRANT ALL ON TABLE public.data_akademik TO service_role;


--
-- Name: TABLE dokumen_bukti; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dokumen_bukti TO anon;
GRANT ALL ON TABLE public.dokumen_bukti TO authenticated;
GRANT ALL ON TABLE public.dokumen_bukti TO service_role;


--
-- Name: TABLE hasil_penilaian; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.hasil_penilaian TO anon;
GRANT ALL ON TABLE public.hasil_penilaian TO authenticated;
GRANT ALL ON TABLE public.hasil_penilaian TO service_role;


--
-- Name: TABLE kriteria; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kriteria TO anon;
GRANT ALL ON TABLE public.kriteria TO authenticated;
GRANT ALL ON TABLE public.kriteria TO service_role;


--
-- Name: TABLE login; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.login TO anon;
GRANT ALL ON TABLE public.login TO authenticated;
GRANT ALL ON TABLE public.login TO service_role;


--
-- Name: TABLE portofolio; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portofolio TO anon;
GRANT ALL ON TABLE public.portofolio TO authenticated;
GRANT ALL ON TABLE public.portofolio TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict AObClh5qFCXTAlvePjCxJ3VSRhDeF8xSqWQHtPLc3ZUvvOmQ7Qk52giddiuBboG

