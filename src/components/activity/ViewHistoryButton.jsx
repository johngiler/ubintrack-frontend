"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Botón Historial de la toolbar de lista. */
export default function ViewHistoryButton({ onClick }) {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={History}
      onClick={onClick}
      title="Historial de movimientos"
      className="whitespace-nowrap"
    >
      Historial
    </Button>
  );
}
