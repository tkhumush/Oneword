import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tl;sr — Speed Read Nostr",
  description: "Too long; speed read. Nostr long-form content, one word at a time.",
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
