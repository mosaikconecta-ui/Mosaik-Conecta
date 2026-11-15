import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Vagas de emprego em todo o Brasil`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Encontre vagas de emprego em todo o Brasil. Candidatos se cadastram grátis; empresas publicam vagas e recebem currículos qualificados.",
  applicationName: SITE_NAME,
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME, url: SITE_URL },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#0b1f3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
