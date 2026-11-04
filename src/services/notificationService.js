import httpClient from "@/services/httpClient";

export async function fetchNotifications({ page = 1, pageSize = 12 } = {}) {
  const { data } = await httpClient.get("/api/notifications/", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchNotificationUnreadCount() {
  const { data } = await httpClient.get("/api/notifications/unread-count/");
  return data?.count ?? 0;
}

export async function markNotificationRead(id) {
  const { data } = await httpClient.post(`/api/notifications/${id}/read/`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await httpClient.post("/api/notifications/read-all/");
  return data;
}
