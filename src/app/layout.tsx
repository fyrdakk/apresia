
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apresia - Penghargaan Mahasiswa",
  description:
    "Sistem Pendukung Keputusan Pemilihan Penerima Penghargaan Mahasiswa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}