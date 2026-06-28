import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "History Pins — Histoires de France",
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Explorez l'histoire de France sur une carte interactive : des centaines de récits géolocalisés, de la préhistoire à nos jours, illustrés scène par scène.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fr_FR",
    url: SITE_URL,
    title: "History Pins — Histoires de France",
    description:
      "Des centaines de récits historiques géolocalisés de France, à explorer sur une carte interactive.",
  },
  twitter: {
    card: "summary_large_image",
    title: "History Pins — Histoires de France",
    description:
      "Des centaines de récits historiques géolocalisés de France, à explorer sur une carte interactive.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

