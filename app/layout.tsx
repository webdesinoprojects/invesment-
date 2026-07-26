import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaturePower — Sustainable Investments",
  description:
    "A premium sustainable energy investment landing-page experience.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
