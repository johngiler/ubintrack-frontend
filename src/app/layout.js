import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/layout/Providers";
import { ThemeScript } from "@/components/layout/ThemeScript";

import "./globals.css";
import "./bootstrap-compat.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "WMS",
    template: "%s | WMS",
  },
  description: "Sistema de gestión de almacén multi-tenant.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${jakarta.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)] antialiased font-sans transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
