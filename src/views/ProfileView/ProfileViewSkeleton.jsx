"use client";

import Skeleton from "@/components/ui/Skeleton";

const FIELDS = [
  "Nombre completo",
  "Correo",
  "Tipo de usuario",
  "Perfil",
  "Cliente",
  "Estado",
  "Nueva contraseña",
  "Confirmar contraseña",
];

export default function ProfileViewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((label) => (
          <div key={label} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
