export const TASK_TYPE_LABELS = {
  entrada_almacenamiento: "Entrada y almacenamiento",
  salida_despacho: "Salida y despacho",
  auditoria: "Auditoría de inventario",
  vencimientos: "Control de vencimientos",
  correccion: "Corrección de errores",
};

export const TASK_STATUS_LABELS = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  verificacion: "Verificación",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const TASK_STATUS_VARIANTS = {
  pendiente: "warning",
  en_proceso: "primary",
  verificacion: "info",
  completada: "success",
  cancelada: "danger",
};

export const TASK_PRIORITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const TASK_PRIORITY_VARIANTS = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export const EMPTY_TASK = {
  task_type: "entrada_almacenamiento",
  status: "pendiente",
  priority: "medium",
  observations: "",
  is_active: true,
  assigned_to: [],
  assigned_to_ids: [],
  entry: null,
  exit: null,
  started_at: null,
  completed_at: null,
};
