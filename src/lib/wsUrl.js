/**
 * Base HTTP(S) API → WS(S) for Daphne notifications.
 * Local: NEXT_PUBLIC_WS_URL=http://localhost:9001 (mapa BCT).
 * Prod: same host as API (nginx /ws/ → Daphne).
 */
export function wsNotificationsUrl(token) {
  const explicit = (process.env.NEXT_PUBLIC_WS_URL || "").replace(/\/$/, "");
  let base = explicit;
  if (!base) {
    const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    if (api) {
      base = api;
    } else if (typeof window !== "undefined") {
      base = window.location.origin;
    } else {
      base = "http://127.0.0.1:9001";
    }
  }
  // Local API :8001 → Daphne :9001 if no explicit WS URL
  if (!explicit && /:8001\/?$/.test(base)) {
    base = base.replace(/:8001/, ":9001");
  }
  const wsBase = base.replace(/^http/, "ws");
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsBase}/ws/notifications/${q}`;
}

function historyQuery(extra = {}) {
  const params = new URLSearchParams();
  params.set("openHistory", "1");
  if (extra.historyType) params.set("historyType", extra.historyType);
  if (extra.historyActor) params.set("historyActor", String(extra.historyActor));
  if (extra.historyBatch != null) params.set("historyBatch", String(extra.historyBatch));
  const q = params.toString();
  return q ? `?${q}` : "";
}

function historyTypeFromNotification(item) {
  const action = String(item?.activity_action || "").trim();
  if (action) return action;

  const event = item?.event;
  if (event === "created" || event === "create") return "create";
  if (event === "updated" || event === "update") return "update";
  if (event === "deleted" || event === "delete") return "delete";
  if (event === "status" || event === "status_changed") return "status";
  if (event === "generate" || event === "generated") return "generate";
  if (typeof event === "string" && event.startsWith("bulk_")) return event;
  return "";
}

/** Campanita → historial general de la vista, filtrado por acción/autor/lote. */
export function notificationHref(item) {
  const artifact = item?.artifact;
  const historyType = historyTypeFromNotification(item);
  const historyActor =
    item?.actor_id != null && item.actor_id !== ""
      ? String(item.actor_id)
      : "";
  const historyBatch =
    item?.batch_id ??
    item?.history_batch ??
    item?.activity_batch_id ??
    item?.payload?.batch_id ??
    null;
  const q = historyQuery({ historyType, historyActor, historyBatch });

  switch (artifact) {
    case "entry":
      return `/order/entries${q}`;
    case "exit":
      return `/order/exits${q}`;
    case "bin":
      return `/inventory/bins${q}`;
    case "position":
      return `/storage/positions${q}`;
    case "cava":
      return `/storage/cavas${q}`;
    case "task":
      return `/tasks/tasks${q}`;
    default: {
      const target = item?.target;
      if (target === "cavas_list") return `/storage/cavas${q}`;
      if (target === "entries_list" || target === "entry_detail") return `/order/entries${q}`;
      if (target === "exits_list" || target === "exit_detail") return `/order/exits${q}`;
      if (target === "bins_list") return `/inventory/bins${q}`;
      if (target === "positions_list" || target === "position_detail") {
        return `/storage/positions${q}`;
      }
      if (target === "tasks_list" || target === "task_detail") {
        return `/tasks/tasks${q}`;
      }
      return "/dashboard";
    }
  }
}
