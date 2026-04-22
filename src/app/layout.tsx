import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  themeColor:        "#3b82f6",
  colorScheme:       "dark",
  width:             "device-width",
  initialScale:      1,
  minimumScale:      1,
  viewportFit:       "cover",
};

export const metadata: Metadata = {
  title: {
    default:  "VaccinationBD Centers",
    template: "%s — VaccinationBD Centers",
  },
  description: "Vaccination center & health worker portal — offline-first PWA",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:           true,
    statusBarStyle:    "black-translucent",
    title:             "VaccinBD",
    startupImage:      "/icons/icon-512.png",
  },
  icons: {
    icon:    [
      { url: "/icons/icon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icons/icon-96.png",  sizes: "96x96",   type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple:   [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    other:   [
      { rel: "mask-icon", url: "/icons/icon.svg", color: "#3b82f6" },
    ],
  },
  other: {
    "mobile-web-app-capable":        "yes",
    "apple-mobile-web-app-capable":  "yes",
    "msapplication-TileColor":       "#0f172a",
    "msapplication-TileImage":       "/icons/icon-144.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Registers sw.js, Background Sync tags, and handles SW messages */}
        <ServiceWorkerRegistrar />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
