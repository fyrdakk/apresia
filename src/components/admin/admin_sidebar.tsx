"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    ListChecks,
    FileCheck,
    Calculator,
    Trophy,
    LogOut,
} from "lucide-react";

const menus = [
    {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        label: "Data Mahasiswa",
        href: "/admin/data_mahasiswa",
        icon: Users,
    },
    {
        label: "Data Kriteria",
        href: "/admin/data_kriteria",
        icon: ListChecks,
    },
    {
        label: "Verifikasi Bukti",
        href: "/admin/verifikasi_bukti",
        icon: FileCheck,
    },
    {
        label: "Perhitungan SAW",
        href: "/admin/perhitungan_saw",
        icon: Calculator,
    },
    {
        label: "Hasil Ranking",
        href: "/admin/ranking",
        icon: Trophy,
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col p-5">

            {/* Logo */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-emerald-700">
                    APRESIA
                </h1>
                <p className="text-sm text-gray-500">
                    Apresiasi Prestasi Mahasiswa
                </p>
            </div>

            {/* Role */}
            <div className="mb-5 rounded-lg bg-emerald-50 p-3">
                <p className="text-xs text-gray-500">
                    Panel Pengelola
                </p>
                <p className="font-semibold text-emerald-700">
                    Administrator
                </p>
            </div>

            {/* Menu */}
            <nav className="flex-1 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Menu Utama
                </p>

                {menus.map((menu) => {
                    const Icon = menu.icon;

                    const active =
                        menu.href === "/admin"
                            ? pathname === menu.href
                            : pathname.startsWith(menu.href);

                    return (
                        <Link
                            key={menu.href}
                            href={menu.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                active
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                        >
                            <Icon size={20} />
                            <span>{menu.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="border-t border-gray-200 pt-4 mt-5">
                <Link
                    href="/login"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    Logout
                </Link>
            </div>

        </aside>
    );
}