"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function ExitsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={1040}
      columns={[
        { kind: "text", min: 140, head: 52 },
        { kind: "stack", min: 180, head: 120 },
        { kind: "text", min: 130, head: 68 },
        { kind: "badge", min: 120, head: 48 },
        { kind: "text", min: 120, head: 60 },
        { kind: "text", min: 140, head: 48 },
        { kind: "actions", min: 150, head: 64 },
      ]}
    />
  );
}
