import httpClient from "./httpClient";

// Tasks
export async function getTasks(page = 1, filters = {}, searchTerm = "", pageSize = 20) {
  let url = `/api/tasks/?page=${page}&page_size=${pageSize}`;

  // Agregar filtros a la URL
  if (filters.task_type) {
    url += `&task_type=${filters.task_type}`;
  }
  if (filters.status) {
    url += `&status=${filters.status}`;
  }
  if (filters.priority) {
    url += `&priority=${filters.priority}`;
  }
  if (filters.assigned_to) {
    url += `&assigned_to=${filters.assigned_to}`;
  }
  if (searchTerm) {
    url += `&search=${encodeURIComponent(searchTerm)}`;
  }

  // Ordenar por fecha de creación descendente
  url += `&ordering=-created_at`;

  const response = await httpClient.get(url);
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

// Task Logs
export async function getTaskLogs(page = 1, filters = {}) {
  let url = `/api/task-logs/?page=${page}`;

  if (filters.task) {
    url += `&task=${filters.task}`;
  }

  url += `&ordering=-created_at`;

  const response = await httpClient.get(url);
  return response.data;
}

export async function getTaskLog(id) {
  const response = await httpClient.get(`/api/task-logs/${id}/`);
  return response.data;
}

export async function createTaskLog(data) {
  const response = await httpClient.post(`/api/task-logs/`, data);
  return response.data;
}

export async function updateTaskLog(id, data) {
  const response = await httpClient.put(`/api/task-logs/${id}/`, data);
  return response.data;
}

export async function patchTaskLog(id, data) {
  const response = await httpClient.patch(`/api/task-logs/${id}/`, data);
  return response.data;
}

export async function deleteTaskLog(id) {
  const response = await httpClient.delete(`/api/task-logs/${id}/`);
  return response.data;
}

// Task Trackings
export async function getTaskTrackings(page = 1, filters = {}, pageSize = 20) {
  let url = `/api/task-trackings/?page=${page}&page_size=${pageSize}`;

  if (filters.user) {
    url += `&user=${filters.user}`;
  }
  if (filters.task) {
    url += `&task=${filters.task}`;
  }

  url += `&ordering=-created_at`;

  const response = await httpClient.get(url);
  return response.data;
}

export async function getTaskTracking(id) {
  const response = await httpClient.get(`/api/task-trackings/${id}/`);
  return response.data;
}

export async function createTaskTracking(data) {
  const response = await httpClient.post(`/api/task-trackings/`, data);
  return response.data;
}

export async function updateTaskTracking(id, data) {
  const response = await httpClient.put(`/api/task-trackings/${id}/`, data);
  return response.data;
}

export async function patchTaskTracking(id, data) {
  const response = await httpClient.patch(`/api/task-trackings/${id}/`, data);
  return response.data;
}

export async function deleteTaskTracking(id) {
  const response = await httpClient.delete(`/api/task-trackings/${id}/`);
  return response.data;
}
