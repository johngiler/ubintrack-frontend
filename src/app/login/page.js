"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { getDefaultHomeRoute } from "@/lib/wmsRouteAccess";
import { getWorkspaceLogoUrl, getWorkspaceLogotypeUrl } from "@/lib/workspaceMedia";

const HIGHLIGHTS = [
  "Inventario y bins en tiempo real",
  "Entradas y salidas coordinadas",
  "Trazabilidad de punta a punta",
];

function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070b14]" />

      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 0% 30%, color-mix(in srgb, var(--brand-primary) 22%, transparent), transparent 60%),
            radial-gradient(ellipse 70% 50% at 100% 70%, color-mix(in srgb, var(--brand-secondary) 16%, transparent), transparent 55%)
          `,
        }}
      />

      <div
        className="login-orb absolute -left-40 top-[20%] h-[480px] w-[480px] rounded-full blur-[100px]"
        style={{ background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)" }}
      />
      <div
        className="login-orb login-orb-delay absolute -right-32 bottom-[10%] h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ background: "color-mix(in srgb, var(--brand-secondary) 10%, transparent)" }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/40 via-transparent to-[#070b14]/60" />
    </div>
  );
}

function LoginBrandPanel({ workspace, displayName, logoUrl, logotypeUrl }) {
  const brandName = useMemo(
    () => (workspace?.app_title || workspace?.name || displayName || "WMS").trim(),
    [workspace?.app_title, workspace?.name, displayName],
  );

  const tagline = workspace?.app_tagline?.trim() || "";
  const heroTitle = tagline || brandName;
  const heroSubtitle = tagline ? brandName : "Gestión de almacén";
  const footerName = (workspace?.legal_name || workspace?.name || brandName).trim();
  const brandImage = logoUrl || logotypeUrl;

  return (
    <div className="relative hidden lg:flex lg:w-1/2 lg:items-center lg:justify-end lg:pr-12 xl:pr-20">
      <div className="w-full max-w-[440px]">
        {brandImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandImage}
            alt={brandName}
            className={
              logoUrl
                ? "mb-12 h-28 w-auto max-w-[360px] object-contain object-left xl:h-32 xl:max-w-[400px]"
                : "mb-12 h-24 w-auto max-w-[180px] object-contain object-left xl:h-28 xl:max-w-[220px]"
            }
          />
        ) : (
          <p className="mb-12 text-2xl font-semibold tracking-tight text-white">{brandName}</p>
        )}

        <div className="space-y-5">
          <div className="h-px w-10 bg-[var(--brand-primary)]" aria-hidden />

          <div className="space-y-2">
            <h1 className="text-[2rem] font-semibold leading-[1.2] tracking-tight text-white xl:text-[2.35rem]">
              {heroTitle}
            </h1>
            <p className="text-base font-medium text-white/55">{heroSubtitle}</p>
          </div>

          <p className="max-w-sm text-[15px] leading-relaxed text-white/40">
            Accede a tu panel para coordinar productos, bins, entradas y salidas desde un solo
            lugar.
          </p>
        </div>

        <ul className="mt-10 space-y-0 border-t border-white/[0.08] pt-8">
          {HIGHLIGHTS.map((label) => (
            <li
              key={label}
              className="flex items-center gap-3 border-b border-white/[0.06] py-3.5 text-[13px] text-white/50 last:border-b-0"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--brand-gradient)" }}
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-16 space-y-0.5 text-[11px] text-white/25">
          <p>© {new Date().getFullYear()} {footerName}</p>
          <p>Ubintrack WMS</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { workspace, displayName, workspaceStatus } = useWorkspace();
  const router = useRouter();

  const logotypeUrl = getWorkspaceLogotypeUrl(workspace);
  const logoUrl = getWorkspaceLogoUrl(workspace);
  const brandImage = logoUrl || logotypeUrl;

  const brandName = useMemo(
    () => (workspace?.app_title || workspace?.name || displayName || "WMS").trim(),
    [workspace?.app_title, workspace?.name, displayName],
  );

  useEffect(() => {
    if (!loading && user) {
      router.replace(getDefaultHomeRoute(user));
    }
  }, [user, loading, router]);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#070b14]">
      <LoginBackground />

      <LoginBrandPanel
        workspace={workspace}
        displayName={displayName}
        logoUrl={logoUrl}
        logotypeUrl={logotypeUrl}
      />

      <div className="relative flex flex-1 items-center justify-center px-6 py-10 lg:justify-start lg:pl-12 lg:pr-16 xl:pl-16 xl:pr-24">
        <div className="w-full max-w-[400px] animate-slide-up rounded-3xl border border-white/[0.08] bg-white p-8 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45)] sm:p-9">
          <div className="mb-8 lg:hidden">
            {brandImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandImage}
                alt={brandName}
                className="h-16 w-auto max-w-[280px] object-contain object-left sm:h-[4.5rem] sm:max-w-[320px]"
              />
            ) : workspaceStatus === "loading" ? (
              <div className="h-16 w-40 animate-pulse rounded-lg bg-slate-100 sm:h-[4.5rem] sm:w-48" />
            ) : (
              <p className="text-lg font-semibold text-slate-900">{brandName}</p>
            )}
          </div>

          <div className="mb-7 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="text-sm text-slate-500">
              Cuenta de <span className="font-medium text-slate-700">{brandName}</span>
            </p>
          </div>

          <LoginForm />

          <p className="mt-7 text-center text-[11px] text-slate-400">
            Conexión segura · token de API
          </p>
        </div>
      </div>
    </div>
  );
}
