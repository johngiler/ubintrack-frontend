import httpClient from "./httpClient";

export async function getTasks(page = 1, filters = {}, searchTerm = "", pageSize = 20) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("ordering", "-created_at");

  if (filters.task_type) params.set("task_type", filters.task_type);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
  if (filters.client) params.set("client", filters.client);
  if (filters.cavas) params.set("cavas", filters.cavas);
  if (filters.products) params.set("products", filters.products);
  if (searchTerm) params.set("search", searchTerm);

  const response = await httpClient.get(`/api/tasks/?${params.toString()}`);
  return response.data;
}

export async function getTask(id) {
  const response = await httpClient.get(`/api/tasks/${id}/`);
  return response.data;
}

export async function createTask(data) {
  const response = await httpClient.post("/api/tasks/", data);
  return response.data;
}

export async function updateTask(id, data) {
  const response = await httpClient.put(`/api/tasks/${id}/`, data);
  return response.data;
}

export async function patchTask(id, data) {
  const response = await httpClient.patch(`/api/tasks/${id}/`, data);
  return response.data;
}

export async function deleteTask(id) {
  const response = await httpClient.delete(`/api/tasks/${id}/`);
  return response.data;
}

export async function getTaskLogs(page = 1, filters = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(filters.pageSize || 100));
  params.set("ordering", filters.ordering || "-created_at");
  if (filters.task) params.set("task", filters.task);
  if (filters.kind) params.set("kind", filters.kind);
  const response = await httpClient.get(`/api/task-logs/?${params.toString()}`);
  return response.data;
}

export async function getTaskLines(page = 1, filters = {}, pageSize = 50) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (filters.task) params.set("task", filters.task);
  if (filters.line_status) params.set("line_status", filters.line_status);
  const response = await httpClient.get(`/api/task-lines/?${params.toString()}`);
  return response.data;
}

export async function patchTaskLine(id, data) {
  const response = await httpClient.patch(`/api/task-lines/${id}/`, data);
  return response.data;
}

export async function verifyTaskPosition(taskId, positionCode, { lineId } = {}) {
  const payload = { position_code: positionCode };
  if (lineId != null) payload.line_id = lineId;
  const response = await httpClient.post(
    `/api/tasks/${taskId}/verify_position/`,
    payload,
  );
  return response.data;
}

export async function generateTaskLines(taskId, { force = false } = {}) {
  const response = await httpClient.post(`/api/tasks/${taskId}/generate_lines/`, {
    force: Boolean(force),
  });
  return response.data;
}

export async function regenerateTaskPdf(taskId) {
  const response = await httpClient.post(`/api/tasks/${taskId}/regenerate_pdf/`);
  return response.data;
}
