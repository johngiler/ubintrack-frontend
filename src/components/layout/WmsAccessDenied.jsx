"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/bootstrap";
import { getDefaultHomeRoute, getRouteAccessMessage } from "@/lib/wmsRouteAccess";

export default function WmsAccessDenied({ pathname, user }) {
  const router = useRouter();
  const homeHref = getDefaultHomeRoute(user);
  const message = getRouteAccessMessage(pathname);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <ShieldX className="h-7 w-7" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[var(--foreground)]">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-[var(--foreground-muted)]">{message}</p>
        <Button variant="primary" className="mt-6" onClick={() => router.push(homeHref)}>
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
