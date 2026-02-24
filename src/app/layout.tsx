import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oneword — Speed Read Nostr",
  description: "Speed read long-form nostr content, one word at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
