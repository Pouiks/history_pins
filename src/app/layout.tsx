import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

// Indispensable mobile : rendu à l'échelle de l'appareil (sinon site dézoomé).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HistoFrance — L'histoire de France découpée en courtes stories",
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
    title: "HistoFrance — L'histoire de France découpée en courtes stories",
    description:
      "Des centaines de récits historiques géolocalisés de France, à explorer sur une carte interactive.",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "HistoFrance — L'histoire de France" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HistoFrance — L'histoire de France découpée en courtes stories",
    description:
      "Des centaines de récits historiques géolocalisés de France, à explorer sur une carte interactive.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

