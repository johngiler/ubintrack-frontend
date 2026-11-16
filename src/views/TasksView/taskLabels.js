export const TASK_TYPE_LABELS = {
  inventario_inicial: "Inventario inicial",
  conteo_ciclico: "Conteo cíclico",
  inventario_general: "Inventario general",
};

export const TASK_TYPE_HINTS = {
  inventario_inicial:
    "Verificar BINs por cámara/pasillo frente a la carga; registrar presencia, producto, cajas, vencimiento, lote y LPN.",
  conteo_ciclico:
    "Conteo parcial asignable por producto, pasillo, cámara o cliente; con evidencia y PDF por cliente.",
  inventario_general:
    "Barrido del alcance (incluye vacías); cobertura, diferencias, reconteo y aprobación.",
};

export const TASK_STATUS_LABELS = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_proceso: "En proceso",
  verificacion: "Verificación",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const TASK_STATUS_VARIANTS = {
  pendiente: "warning",
  asignada: "info",
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
  title: "",
  task_type: "conteo_ciclico",
  status: "pendiente",
  priority: "medium",
  observations: "",
  is_active: true,
  assigned_to: [],
  assigned_to_ids: [],
  client: null,
  client_id: null,
  cavas: [],
  cava_ids: [],
  halls: [],
  products: [],
  product_ids: [],
  include_empty_positions: false,
  require_approval: false,
  started_at: null,
  completed_at: null,
};

export const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const TASK_PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
