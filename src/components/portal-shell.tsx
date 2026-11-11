"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ListChecks, FileCheck, Calculator, Trophy, BookOpen, FolderOpen, Megaphone, LogOut, ChevronRight, Menu } from "lucide-react";

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

const desktopQuery = "(min-width: 960px)";

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function PortalShell({ role, children }: { role: keyof typeof menus; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

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

  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const expanded = desktop ? desktopOpen : mobilePath === pathname;

  function setExpanded(open: boolean) {
    if (desktop) setDesktopOpen(open);
    else setMobilePath(open ? pathname : null);
  }
  const portal = role === "admin" ? "Portal Penilaian" : "Portal Mahasiswa";
  const pages = menus[role];
  const currentIndex = pages.findIndex(([, href]) => pathname === href);
  const activePage = pages[currentIndex]?.[0];
  const nextPage = currentIndex >= 0 ? pages[currentIndex + 1] : undefined;

  return (
    <div className="portal portal-with-sidebar" data-sidebar-open={expanded} onKeyDown={(event) => {
      if (event.key === "Escape" && expanded && (event.target as HTMLElement).closest(".portal-navigation, .portal-masthead")) {
        setExpanded(false);
        document.getElementById("portal-menu-toggle")?.focus();
      }
    }}>
      <a className="portal-skip" href="#konten">Lewati ke konten</a>
      <header className="portal-masthead">
        <div className="portal-brand">
          <Link href={"/" + role}>
            <Image src="/img/logo.png" alt="" width={46} height={46} />
            <span><strong>APRESIA</strong><small>Apresiasi Prestasi Mahasiswa</small></span>
          </Link>
          <button id="portal-menu-toggle" type="button" aria-controls="portal-navigation" aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)} className="portal-toggle">
            <Menu aria-hidden size={22} />
            <span className="sr-only">{expanded ? "Tutup menu" : "Buka menu"}</span>
          </button>
        </div>
      </header>
      <aside id="portal-navigation" className="portal-navigation" data-open={expanded}>
          <p className="portal-role">{role === "admin" ? "Administrator" : "Mahasiswa"}</p>
          <nav aria-label={portal}>
            {menus[role].map(([label, href, Icon]) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => { if (!desktop) setExpanded(false); }}>
                <Icon size={19} aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <button type="button" className="portal-exit" onClick={signOut} disabled={signingOut}>
            <LogOut size={19} aria-hidden /> {signingOut ? "Sedang keluar..." : "Keluar sistem"}
          </button>
          {signOutError && <p className="mt-2 text-sm text-red-800" role="alert">{signOutError}</p>}
      </aside>
      <div className="portal-body">
        <header className="portal-topbar">
          <Link href={"/" + role}>{portal}</Link>
          {activePage && <><ChevronRight size={15} aria-hidden /><span>{activePage}</span></>}
        </header>
        <div id="konten" className="portal-content" tabIndex={-1}>{children}</div>
        {nextPage && currentIndex > 0 && (
          <footer className="portal-next">
            <Link href={nextPage[1]}>
              <span><small>Buka menu berikutnya</small><strong>{nextPage[0]}</strong></span>
              <ChevronRight size={22} aria-hidden />
            </Link>
          </footer>
        )}
      </div>
    </div>
  );
}



