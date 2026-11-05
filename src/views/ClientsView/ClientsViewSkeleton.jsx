"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function ClientsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={920}
      columns={[
        { kind: "stack", min: 200, head: 56 },
        { kind: "text", min: 120, head: 44 },
        { kind: "short", min: 110, head: 72 },
        { kind: "short", min: 100, head: 60 },
        { kind: "text", min: 130, head: 96 },
        { kind: "badge", min: 100, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
