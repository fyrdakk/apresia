import Image from "next/image";

export default function AuthBrand() {
  return (
    <aside className="auth-brand">
      <Image src="/img/logo.png" alt="Logo APRESIA" width={104} height={104} priority />
      <p className="auth-wordmark">APRESIA</p>
      <p className="auth-title">Apresiasi Prestasi Mahasiswa</p>
    </aside>
  );
}

