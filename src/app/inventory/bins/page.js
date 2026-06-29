"use client";

import dynamic from "next/dynamic";

const BinsView = dynamic(() => import("@/views/BinsView"), { ssr: false });

export default function Page() {
  return <BinsView />;
}
