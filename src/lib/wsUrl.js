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
  if (extra.historyBatch != null) params.set("historyBatch", String(extra.historyBatch));
  const q = params.toString();
  return q ? `?${q}` : "";
}

/** Campanita → historial general de la vista (detalle fino = ítem). */
export function notificationHref(item) {
  const artifact = item?.artifact;
  const event = item?.event;
  const historyType =
    event === "created" || event === "create"
      ? "create"
      : event === "updated" || event === "update"
        ? "update"
        : event === "deleted" || event === "delete"
          ? "delete"
          : event === "status" || event === "status_changed"
            ? "status"
            : event === "generate" || event === "generated"
              ? "generate"
              : typeof event === "string" && event.startsWith("bulk_")
                ? event
                : "";
  const historyBatch =
    item?.batch_id ??
    item?.history_batch ??
    item?.activity_batch_id ??
    item?.payload?.batch_id ??
    null;
  const q = historyQuery({ historyType, historyBatch });

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
    case "product":
      return `/inventory/products${q}`;
    case "client":
      return `/core/clients${q}`;
    case "user":
      return `/core/users${q}`;
    case "profile":
      return `/core/profiles${q}`;
    case "tariff":
      return `/finance/tariffs${q}`;
    default: {
      const target = item?.target;
      if (target === "cavas_list") return `/storage/cavas${q}`;
      if (target === "entries_list" || target === "entry_detail") return `/order/entries${q}`;
      if (target === "exits_list" || target === "exit_detail") return `/order/exits${q}`;
      if (target === "bins_list") return `/inventory/bins${q}`;
      if (target === "positions_list" || target === "position_detail") {
        return `/storage/positions${q}`;
      }
      if (target === "products_list") return `/inventory/products${q}`;
      if (target === "clients_list") return `/core/clients${q}`;
      if (target === "users_list") return `/core/users${q}`;
      if (target === "profiles_list") return `/core/profiles${q}`;
      if (target === "tariffs_list") return `/finance/tariffs${q}`;
      return "/dashboard";
    }
  }
}
