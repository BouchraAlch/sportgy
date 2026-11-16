"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideNavbar =
    pathname.startsWith("/coach") ||
    pathname.startsWith("/club-owner") ||
    pathname.startsWith("/admin");

  return (
    <body className="min-h-screen flex flex-col bg-slate-50">
      {!hideNavbar && <Navbar />}

      <main className="flex-1">{children}</main>

      {!hideNavbar && <Footer />}
    </body>
  );
}