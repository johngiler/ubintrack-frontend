"use client";

import dynamic from "next/dynamic";

const DashboardView = dynamic(() => import("@/views/DashboardView"), { ssr: false });

export default function Page() {
  return <DashboardView />;
}
