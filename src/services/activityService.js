import httpClient from "@/services/httpClient";

export async function fetchActivity({
  section,
  page = 1,
  pageSize = 20,
  action = "",
  actor = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (section) params.set("section", section);
  if (action) params.set("action", action);
  if (actor) params.set("actor", actor);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const { data } = await httpClient.get(`/api/activity/?${params.toString()}`);
  return data;
}

export async function fetchActivityActors(section) {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  const { data } = await httpClient.get(
    `/api/activity/actors/?${params.toString()}`,
  );
  return data;
}

export async function fetchActivityBatch(batchId) {
  const { data } = await httpClient.get(`/api/activity/batches/${batchId}/`);
  return data;
}

export async function fetchActivityBatchItems(batchId, page = 1, pageSize = 20) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const { data } = await httpClient.get(
    `/api/activity/batches/${batchId}/items/?${params.toString()}`,
  );
  return data;
}
