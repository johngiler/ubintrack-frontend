"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function BinsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={980}
      columns={[
        { kind: "text", min: 130, head: 52 },
        { kind: "stack", min: 220, head: 110 },
        { kind: "text", min: 130, head: 68 },
        { kind: "text", min: 130, head: 60 },
        { kind: "badge", min: 120, head: 48 },
        { kind: "actions", min: 150, head: 64 },
      ]}
    />
  );
}
