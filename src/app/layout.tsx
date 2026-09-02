import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { getServerEnvironment } from "@/lib/env";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const environment = getServerEnvironment();

export const metadata: Metadata = {
  metadataBase: new URL(environment.SITE_URL),
  title: {
    default: "AstraOps — Live space intelligence",
    template: "%s · AstraOps",
  },
  description:
    "Independent live space intelligence, explainable mission planning, and reproducible mission dossiers.",
  applicationName: "AstraOps",
  category: "science",
  creator: "AstraOps",
  openGraph: {
    type: "website",
    siteName: "AstraOps",
    title: "AstraOps — Live space intelligence",
    description:
      "Explore global launches, the near-Earth environment, and explainable mission concepts.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstraOps — Live space intelligence",
    description:
      "Explore global launches, the near-Earth environment, and explainable mission concepts.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#07090F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
