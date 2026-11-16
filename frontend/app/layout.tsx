import type { Metadata } from "next";
import LayoutContent from "@/components/LayoutContent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sporty",
  description:
    "Discover sports, coaches, communities, competitions, and sports equipment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <LayoutContent>{children}</LayoutContent>
    </html>
  );
}