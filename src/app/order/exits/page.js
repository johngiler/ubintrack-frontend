"use client";

import dynamic from "next/dynamic";

const OrderExitsView = dynamic(() => import("@/views/OrderExitsView"), { ssr: false });

export default function Page() {
  return <OrderExitsView />;
}
