/**
 * Claves SWR estables (patrón PortPax `swrKeys`).
 * Listados: incluir page + search + filters serializables para cachear por vista.
 */

function stableFilters(filters) {
  if (!filters || typeof filters !== "object") return "";
  return JSON.stringify(
    Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        const v = filters[key];
        if (v === "" || v === null || v === undefined) return acc;
        acc[key] = v;
        return acc;
      }, {}),
  );
}

export const swrKeys = {
  workspace: (slug) => (slug ? ["workspace", slug] : null),
  myProfile: "my-profile",
  navCounts: "nav-counts",
  notificationsList: "notifications-list",
  notificationsInfinite: (pageSize = 12) => ["notifications-infinite", pageSize],
  notificationsUnread: "notifications-unread",


  dashboardStats: "dashboard-stats",
  dashboardClients: "dashboard-clients",
  dashboardWarehouse: "dashboard-warehouse",

  clients: (page, search, filters) => ["clients", page, search || "", stableFilters(filters)],
  tariffs: (page, search, filters) => ["tariffs", page, search || "", stableFilters(filters)],
  tariffsAll: ["tariffs", "all-page1"],
  users: (page, search, filters) => ["users", page, search || "", stableFilters(filters)],
  profiles: (page, search, filters) => ["profiles", page, search || "", stableFilters(filters)],

  products: (page, search, filters) => ["products", page, search || "", stableFilters(filters)],
  categories: "product-categories",
  bins: (page, search, filters) => ["bins", page, search || "", stableFilters(filters)],

  entries: (page, search, filters) => ["entries", page, search || "", stableFilters(filters)],
  exits: (page, search, filters) => ["exits", page, search || "", stableFilters(filters)],

  storages: (page, search) => ["storages", page, search || ""],
  cavas: (page, search) => ["cavas", page, search || ""],
  positions: (page, search, filters) => ["positions", page, search || "", stableFilters(filters)],

  tasks: (page, search, filters) => ["tasks", page, search || "", stableFilters(filters)],
  trackings: (page, search) => ["trackings", page, search || ""],

  billingSummary: (start, end) => ["billing-summary", start || "", end || ""],
  billingClients: (page, start, end) => ["billing-clients", page, start || "", end || ""],
  clientBilling: (clientId, start, end) =>
    clientId ? ["client-billing", clientId, start || "", end || ""] : null,
  clientBillingHistory: (clientId) =>
    clientId ? ["client-billing-history", clientId] : null,
};
