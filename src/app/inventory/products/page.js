"use client";

import dynamic from "next/dynamic";

const ProductsView = dynamic(() => import("@/views/ProductsView"), { ssr: false });

export default function Page() {
  return <ProductsView />;
}
