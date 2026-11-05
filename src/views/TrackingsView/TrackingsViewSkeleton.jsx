"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function TrackingsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={860}
      columns={[
        { kind: "text", min: 160, head: 40 },
        { kind: "text", min: 140, head: 56 },
        { kind: "badge", min: 130, head: 88 },
        { kind: "text", min: 120, head: 44 },
        { kind: "text", min: 120, head: 28 },
        { kind: "short", min: 100, head: 60 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
