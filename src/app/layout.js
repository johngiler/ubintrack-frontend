import { headers } from "next/headers";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/layout/Providers";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { tenantSlugFromHostname, workspaceSlugRequestHeaders } from "@/lib/tenant";

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

export async function generateMetadata() {
  const headerList = await headers();
  const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim();
  const { workspace } = await loadInitialWorkspace(host.split(":")[0]);
  const owner = (workspace?.app_title || workspace?.name || "WMS").trim() || "WMS";
  return {
    title: {
      default: owner,
      template: `${owner} | %s`,
    },
    description: "Sistema de gestión de almacén multi-tenant.",
  };
}

async function loadInitialWorkspace(hostname) {
  const slug = tenantSlugFromHostname(hostname);
  const api = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
  try {
    const res = await fetch(`${api}/api/workspace/current/`, {
      headers: workspaceSlugRequestHeaders(hostname),
      cache: "no-store",
    });
    if (!res.ok) return { slug, workspace: null };
    return { slug, workspace: await res.json() };
  } catch {
    return { slug, workspace: null };
  }
}

export default async function RootLayout({ children }) {
  const headerList = await headers();
  const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim();
  const hostname = host.split(":")[0];
  const { slug, workspace } = await loadInitialWorkspace(hostname);

  return (
    <html lang="es" className={`${jakarta.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)] antialiased font-sans transition-colors duration-300">
        <Providers initialTenantSlug={slug} initialWorkspace={workspace}>{children}</Providers>
      </body>
    </html>
  );
}
