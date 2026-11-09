
import type { ReactNode } from "react";
import AdminSidebar from "@/components/admin/admin_sidebar";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Admin */}
      <AdminSidebar />

      {/* Konten Halaman */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
