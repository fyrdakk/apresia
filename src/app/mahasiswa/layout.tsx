import type { ReactNode } from "react";
import MahasiswaSidebar from "@/components/mahasiswa/mahasiswa_sidebar";

export default function MahasiswaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <MahasiswaSidebar />

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
