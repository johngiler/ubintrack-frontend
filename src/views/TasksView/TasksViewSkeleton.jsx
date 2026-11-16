"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function TasksViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={1100}
      columns={[
        { kind: "stack", min: 160, head: 52 },
        { kind: "badge", min: 140, head: 36 },
        { kind: "badge", min: 90, head: 64 },
        { kind: "text", min: 140, head: 56 },
        { kind: "stack", min: 120, head: 72 },
        { kind: "text", min: 120, head: 68 },
        { kind: "badge", min: 120, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
