import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "Mosaik — Cerâmica, luz e mesa posta", template: "%s · Mosaik" },
  description: "Cerâmica, iluminação, mesa posta e aromas para a casa. Frete grátis acima de R$ 299, Pix e cartão em até 6× sem juros.",
  applicationName: "Mosaik",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f4f1ea", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
