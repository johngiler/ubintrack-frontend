"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function TasksViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={980}
      columns={[
        { kind: "text", min: 120, head: 52 },
        { kind: "badge", min: 110, head: 36 },
        { kind: "badge", min: 110, head: 48 },
        { kind: "badge", min: 110, head: 64 },
        { kind: "text", min: 140, head: 68 },
        { kind: "text", min: 140, head: 44 },
        { kind: "text", min: 140, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
