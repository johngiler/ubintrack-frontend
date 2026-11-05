"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function ProductsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={1080}
      columns={[
        { kind: "text", min: 180, head: 52 },
        { kind: "stack", min: 240, head: 110 },
        { kind: "text", min: 140, head: 68 },
        { kind: "badge", min: 110, head: 68 },
        { kind: "short", min: 120, head: 72 },
        { kind: "badge", min: 100, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
