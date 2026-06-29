"use client";

import WmsListEmptyState from "@/components/wms/WmsListEmptyState";

export default function EntriesEmptyState(props) {
  return (
    <WmsListEmptyState
      emptyTitle="No hay entradas registradas"
      emptyDescription="Comienza creando tu primera orden de entrada."
      createLabel="Nueva orden de entrada"
      {...props}
    />
  );
}
