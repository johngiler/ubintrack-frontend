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

export function notificationHref(item) {
  const target = item?.target;
  const id = item?.resource_id;
  switch (target) {
    case "entry_detail":
      return id ? `/order/entries?highlight=${id}` : "/order/entries";
    case "entries_list":
      return "/order/entries";
    case "exit_detail":
      return id ? `/order/exits?highlight=${id}` : "/order/exits";
    case "exits_list":
      return "/order/exits";
    case "bins_list":
      return item?.resource_code
        ? `/inventory/bins?search=${encodeURIComponent(item.resource_code)}`
        : "/inventory/bins";
    default:
      return "/dashboards/sales";
  }
}
