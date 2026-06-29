"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

export function WmsPageHeader({ title, description, icon: Icon, breadcrumbs = [], actions }) {
  return (
    <div className="mb-6 animate-slide-up">
      {breadcrumbs.length > 0 ? (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-[var(--foreground-muted)]">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.title} className="inline-flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3 w-3 opacity-40" /> : null}
              {crumb.href && !crumb.active ? (
                <Link href={crumb.href} className="hover:text-[var(--brand-primary)]">
                  {crumb.title}
                </Link>
              ) : (
                <span className={cn(crumb.active && "font-medium text-brand")}>
                  {crumb.title}
                </span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="brand-icon-box flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Compat rbcold Pageheader */
export default function Pageheader({ Heading, Pages = [] }) {
  return (
    <WmsPageHeader
      title={Heading}
      breadcrumbs={Pages.map((p, i) => ({
        title: p.title,
        active: p.active || i === Pages.length - 1,
        href: p.href,
      }))}
    />
  );
}
