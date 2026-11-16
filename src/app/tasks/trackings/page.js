import { redirect } from "next/navigation";

/** Seguimiento (timers) eliminado: redirige al listado de tareas WMS. */
export default function TrackingsRedirectPage() {
  redirect("/tasks/tasks");
}
