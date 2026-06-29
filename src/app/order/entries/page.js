"use client";

import dynamic from "next/dynamic";

const OrderEntriesView = dynamic(() => import("@/views/OrderEntriesView"), { ssr: false });

export default function Page() {
  return <OrderEntriesView />;
}
