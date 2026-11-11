"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Calculator,
  ChevronRight,
  FileCheck,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  Trophy,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menus = {
  admin: [
    ["Dashboard", "/admin", LayoutDashboard],
    ["Data Mahasiswa", "/admin/data_mahasiswa", Users],
    ["Data Kriteria SAW", "/admin/data_kriteria", ListChecks],
    ["Verifikasi Bukti", "/admin/verifikasi_bukti", FileCheck],
    ["Perhitungan SAW", "/admin/perhitungan_saw", Calculator],
    ["Hasil Ranking", "/admin/ranking", Trophy],
  ],
  mahasiswa: [
    ["Dashboard", "/mahasiswa", LayoutDashboard],
    ["Data Akademik", "/mahasiswa/data_akademik", BookOpen],
    ["Portofolio Prestasi", "/mahasiswa/portofolio_prestasi", Trophy],
    ["Dokumen Bukti", "/mahasiswa/dokumen", FolderOpen],
    ["Pengumuman", "/mahasiswa/pengumuman", Megaphone],
  ],
} as const;

const pageActions: Partial<
  Record<string, { hint: string; label: string; href: string }>
> = {
  "/mahasiswa/portofolio_prestasi": {
    hint: "Lengkapi portofolio dengan dokumen pendukung",
    label: "Unggah dokumen bukti",
    href: "/mahasiswa/dokumen",
  },
  "/admin/data_kriteria": {
    hint: "Gunakan bobot kriteria untuk penilaian",
    label: "Buka perhitungan SAW",
    href: "/admin/perhitungan_saw",
  },
  "/admin/verifikasi_bukti": {
    hint: "Lanjut ke penilaian setelah memeriksa bukti",
    label: "Buka perhitungan SAW",
    href: "/admin/perhitungan_saw",
  },
  "/admin/perhitungan_saw": {
    hint: "Periksa urutan peringkat setelah menghitung nilai",
    label: "Lihat hasil ranking",
    href: "/admin/ranking",
  },
};

const desktopQuery = "(min-width: 960px)";

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}

function getServerSnapshot() {
  return false;
}

type PortalShellProps = {
  role: keyof typeof menus;
  children: ReactNode;
};

export default function PortalShell({ role, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerSnapshot,
  );

  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const expanded = desktop ? desktopOpen : mobilePath === pathname;
  const home = `/${role}`;
  const portal = role === "admin" ? "Portal Penilaian" : "Portal Mahasiswa";
  const pages = menus[role];
  const activePage = pages.find(([, href]) => pathname === href)?.[0];
  const action = pageActions[pathname];

  function setExpanded(open: boolean) {
    if (desktop) {
      setDesktopOpen(open);
    } else {
      setMobilePath(open ? pathname : null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Gagal keluar. Coba lagi.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div
      className="portal portal-with-sidebar"
      data-sidebar-open={expanded}
      onKeyDown={(event) => {
        const target = event.target;

        if (
          event.key === "Escape" &&
          expanded &&
          target instanceof Element &&
          target.closest(".portal-navigation, .portal-masthead")
        ) {
          setExpanded(false);
          document.getElementById("portal-menu-toggle")?.focus();
        }
      }}
    >
      <a className="portal-skip" href="#konten">
        Lewati ke konten
      </a>

      <header className="portal-masthead">
        <div className="portal-brand">
          <button
            id="portal-menu-toggle"
            type="button"
            className="portal-toggle"
            aria-controls="portal-navigation"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <Menu size={22} aria-hidden="true" />
            <span className="sr-only">
              {expanded ? "Tutup menu" : "Buka menu"}
            </span>
          </button>

          <Link href={home}>
            <Image src="/img/logo.png" alt="" width={46} height={46} />
            <span>
              <strong>APRESIA</strong>
              <small>Apresiasi Prestasi Mahasiswa</small>
            </span>
          </Link>
        </div>
      </header>

      <aside
        id="portal-navigation"
        className="portal-navigation"
        data-open={expanded}
      >
        <p className="portal-role">
          {role === "admin" ? "Administrator" : "Mahasiswa"}
        </p>

        <nav aria-label={portal}>
          {pages.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => {
                if (!desktop) setExpanded(false);
              }}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="portal-exit"
          onClick={signOut}
          disabled={signingOut}
        >
          <LogOut size={19} aria-hidden="true" />
          {signingOut ? "Sedang keluar..." : "Keluar sistem"}
        </button>

        {signOutError && (
          <p className="mt-2 text-sm text-red-800" role="alert">
            {signOutError}
          </p>
        )}
      </aside>

      <div className="portal-body">
        <header className="portal-topbar">
          <Link href={home}>{portal}</Link>
          {activePage && (
            <>
              <ChevronRight size={15} aria-hidden="true" />
              <span>{activePage}</span>
            </>
          )}
        </header>

        <div id="konten" className="portal-content" tabIndex={-1}>
          {children}
        </div>

        {action && (
          <footer className="portal-next">
            <Link href={action.href}>
              <span>
                <small>{action.hint}</small>
                <strong>{action.label}</strong>
              </span>
              <ChevronRight size={22} aria-hidden="true" />
            </Link>
          </footer>
        )}
      </div>
    </div>
  );
}