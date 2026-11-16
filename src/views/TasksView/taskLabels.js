export const TASK_TYPE_LABELS = {
  control_inventario: "Control de inventario",
  // Legados (por si llega algún registro sin migrar en cliente).
  inventario_inicial: "Control de inventario",
  conteo_ciclico: "Control de inventario",
  inventario_general: "Control de inventario",
};

export const DEFAULT_TASK_TYPE = "control_inventario";

export function normalizeTaskType(value) {
  if (
    !value ||
    value === "inventario_inicial" ||
    value === "conteo_ciclico" ||
    value === "inventario_general"
  ) {
    return DEFAULT_TASK_TYPE;
  }
  return value === DEFAULT_TASK_TYPE ? value : DEFAULT_TASK_TYPE;
}

export const TASK_TYPE_HINTS = {
  control_inventario:
    "Recorrer el alcance (cámaras, pasillos, productos) y verificar/contar en piso.",
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
  task_type: DEFAULT_TASK_TYPE,
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

export const TASK_TYPE_OPTIONS = [
  { value: DEFAULT_TASK_TYPE, label: TASK_TYPE_LABELS[DEFAULT_TASK_TYPE] },
];

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const TASK_PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
