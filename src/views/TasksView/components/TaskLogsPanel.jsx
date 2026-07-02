"use client";

import { formatDateTime } from "@/lib/format";

function logTone(message = "") {
  const text = message.toLowerCase();
  if (text.includes("creada")) return "border-emerald-500 bg-emerald-50";
  if (text.includes("completada") || text.includes("finalizada")) return "border-emerald-600 bg-emerald-50";
  if (text.includes("cancelada")) return "border-red-500 bg-red-50";
  if (text.includes("estado")) return "border-amber-500 bg-amber-50";
  return "border-sky-500 bg-sky-50";
}

export default function TaskLogsPanel({ logs = [] }) {
  if (!logs.length) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
      <div className="mb-3">
        <h6 className="text-sm font-semibold text-slate-800">Historial de la tarea</h6>
        <p className="mb-0 text-xs text-slate-500">
          {logs.length} {logs.length === 1 ? "evento registrado" : "eventos registrados"}
        </p>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {sorted.map((log) => (
          <div
            key={log.id}
            className={`rounded-xl border-l-4 px-3 py-2 ${logTone(log.message)}`}
          >
            <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
            <p className="mb-0 text-sm text-slate-700">{log.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
