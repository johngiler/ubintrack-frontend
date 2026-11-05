"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function StoragesViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={480}
      columns={[
        { kind: "wide", min: 240, head: 56 },
        { kind: "badge", min: 120, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
