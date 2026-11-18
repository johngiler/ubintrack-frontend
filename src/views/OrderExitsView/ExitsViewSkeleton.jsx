"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function ExitsViewSkeleton({ showSelection = false }) {
  const columns = [
    ...(showSelection ? [{ kind: "short", min: 40, head: 24 }] : []),
    { kind: "text", min: 140, head: 52 },
    { kind: "stack", min: 180, head: 120 },
    { kind: "text", min: 130, head: 68 },
    { kind: "badge", min: 120, head: 48 },
    { kind: "text", min: 120, head: 60 },
    { kind: "text", min: 140, head: 48 },
    { kind: "actions", min: 150, head: 64 },
  ];

  return (
    <WmsTableSkeleton
      minWidth={showSelection ? 1100 : 1040}
      columns={columns}
    />
  );
}
