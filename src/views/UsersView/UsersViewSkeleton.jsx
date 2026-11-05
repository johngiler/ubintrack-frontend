"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function UsersViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={880}
      columns={[
        { kind: "stack", min: 180, head: 56 },
        { kind: "text", min: 200, head: 40 },
        { kind: "badge", min: 120, head: 36 },
        { kind: "text", min: 140, head: 48 },
        { kind: "text", min: 130, head: 96 },
        { kind: "badge", min: 100, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
