"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function ProfilesViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={720}
      columns={[
        { kind: "text", min: 180, head: 56 },
        { kind: "badge", min: 120, head: 36 },
        { kind: "wide", min: 280, head: 64 },
        { kind: "short", min: 100, head: 60 },
        { kind: "badge", min: 100, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
