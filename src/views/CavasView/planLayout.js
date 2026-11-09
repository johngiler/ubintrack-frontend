/** Metadatos gráficos del plano. No afectan nomenclatura ni generate. */

/**
 * Lienzo inicial del plano (H y V iguales).
 * fit-content: solo crece si el contenido supera FRAME_MIN.
 */
export const PLAN_VIEW_FRAME_MIN = 720;
export const PLAN_VIEW_MAX_WIDTH = 1300;
/** @deprecated usar PLAN_VIEW_FRAME_MIN */
export const PLAN_VIEW_MIN_HEIGHT = PLAN_VIEW_FRAME_MIN;

/** Tamaño mínimo del lienzo; el padre usa w-max / fit-content encima. */
export function planFrameMinStyle(_masterAxis) {
  return { minWidth: PLAN_VIEW_FRAME_MIN, minHeight: PLAN_VIEW_FRAME_MIN };
}

export const EMPTY_PLAN_LAYOUT = {
  default_orientation: "horizontal",
  doors: [],
  depth_axes: {},
  row_aligns: {},
  stack_aligns: {},
  show_aisle_positions: false,
};

const ROW_ALIGN_VALUES = new Set(["start", "center", "end"]);
const ORIENTATION_VALUES = new Set(["horizontal", "vertical"]);

export function normalizeOrientation(value) {
  return value === "vertical" ? "vertical" : "horizontal";
}

export function normalizeRowAlign(value) {
  return ROW_ALIGN_VALUES.has(value) ? value : "start";
}

export const DOOR_WALL_OPTIONS = [
  { value: "top", label: "Arriba" },
  { value: "bottom", label: "Abajo" },
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
];

export const MASTER_ORIENTATION_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export function doorAnchorOptions(wall) {
  if (wall === "left" || wall === "right") {
    return [
      { value: "start", label: "Inicio (arriba)" },
      { value: "center", label: "Medio" },
      { value: "end", label: "Final (abajo)" },
    ];
  }
  return [
    { value: "start", label: "Inicio (izquierda)" },
    { value: "center", label: "Medio" },
    { value: "end", label: "Final (derecha)" },
  ];
}

export const DOOR_SPAN = 0.14; // fracción del largo de la pared
/** Margen igual en ambos extremos de la pared (mismo en las 4 direcciones). */
export const DOOR_EDGE_INSET = 0.04;

/** Fracción donde empieza el hueco (márgenes simétricos en ambos extremos). */
export function doorAlongRatio(anchor, span = DOOR_SPAN) {
  const inset = DOOR_EDGE_INSET;
  const room = Math.max(0, 1 - span - inset * 2);
  if (anchor === "start") return inset;
  if (anchor === "end") return inset + room;
  return inset + room / 2;
}

function inferDefaultOrientation(source, blocks = []) {
  const raw = source?.default_orientation;
  if (ORIENTATION_VALUES.has(raw)) return raw;
  let vertical = 0;
  let horizontal = 0;
  (blocks || []).forEach((block) => {
    if (block?.orientation === "vertical") vertical += 1;
    else horizontal += 1;
  });
  if (vertical > horizontal) return "vertical";
  return "horizontal";
}

export function normalizePlanLayout(raw, blocks = []) {
  const source = raw && typeof raw === "object" ? raw : {};
  const doors = Array.isArray(source.doors)
    ? source.doors
        .map((door) => ({
          id: String(door?.id || `${door?.wall || "top"}-${door?.anchor || "center"}`),
          // Sin trim aquí: si no, el input controlado come los espacios al escribir.
          name: String(door?.name ?? "").slice(0, 40),
          wall: ["top", "bottom", "left", "right"].includes(door?.wall) ? door.wall : "top",
          anchor: ["start", "center", "end"].includes(door?.anchor) ? door.anchor : "center",
        }))
    : [];
  const depth_axes = {};
  if (source.depth_axes && typeof source.depth_axes === "object") {
    Object.entries(source.depth_axes).forEach(([key, value]) => {
      depth_axes[String(key)] = value === "desc" ? "desc" : "asc";
    });
  }
  const row_aligns = {};
  if (source.row_aligns && typeof source.row_aligns === "object") {
    Object.entries(source.row_aligns).forEach(([key, value]) => {
      const align = normalizeRowAlign(value);
      if (align !== "start") row_aligns[String(key)] = align;
    });
  }
  const stack_aligns = {};
  if (source.stack_aligns && typeof source.stack_aligns === "object") {
    Object.entries(source.stack_aligns).forEach(([key, value]) => {
      const align = normalizeRowAlign(value);
      if (align !== "start") stack_aligns[String(key)] = align;
    });
  }
  return {
    default_orientation: inferDefaultOrientation(source, blocks),
    doors,
    depth_axes,
    row_aligns,
    stack_aligns,
    show_aisle_positions: Boolean(source.show_aisle_positions),
  };
}

function legacyBlockIds(block) {
  const ids = [];
  const raw = String(block?.key || "");
  if (raw.startsWith("id-")) ids.push(raw.slice(3));
  if (block?.id != null) ids.push(String(block.id));
  return ids;
}

/** En UI: claves por block.key. En API: índices de sort_order. */
function resolveBlockMapValue(map, block, index) {
  if (!map || typeof map !== "object") return undefined;
  if (block?.key != null && map[block.key] != null) return map[block.key];
  if (map[String(index)] != null) return map[String(index)];
  for (const legacy of legacyBlockIds(block)) {
    if (map[legacy] != null) return map[legacy];
  }
  return undefined;
}

export function hydratePlanLayout(raw, blocks = []) {
  const normalized = normalizePlanLayout(raw, blocks);
  const depth_axes = {};
  const row_aligns = {};
  const stack_aligns = {};
  (blocks || []).forEach((block, index) => {
    if (!block?.key) return;
    const axis = resolveBlockMapValue(normalized.depth_axes, block, index);
    if (axis === "desc") depth_axes[block.key] = "desc";
    else if (axis === "asc") depth_axes[block.key] = "asc";
    const align = normalizeRowAlign(resolveBlockMapValue(normalized.row_aligns, block, index));
    if (align !== "start") row_aligns[block.key] = align;
    const stack = normalizeRowAlign(resolveBlockMapValue(normalized.stack_aligns, block, index));
    if (stack !== "start") stack_aligns[block.key] = stack;
  });
  return {
    default_orientation: normalized.default_orientation,
    doors: normalized.doors,
    depth_axes,
    row_aligns,
    stack_aligns,
    show_aisle_positions: normalized.show_aisle_positions,
  };
}

export function planLayoutPayload(layout, blocks = []) {
  const normalized = normalizePlanLayout(layout, blocks);
  const depth_axes = {};
  const row_aligns = {};
  const stack_aligns = {};
  (blocks || []).forEach((block, index) => {
    const axis = resolveBlockMapValue(normalized.depth_axes, block, index);
    if (axis === "desc") depth_axes[String(index)] = "desc";
    const align = normalizeRowAlign(resolveBlockMapValue(normalized.row_aligns, block, index));
    if (align !== "start") row_aligns[String(index)] = align;
    const stack = normalizeRowAlign(resolveBlockMapValue(normalized.stack_aligns, block, index));
    if (stack !== "start") stack_aligns[String(index)] = stack;
  });
  return {
    default_orientation: normalized.default_orientation,
    doors: normalized.doors.map(({ name, wall, anchor }) => ({
      name: String(name || "").trim().slice(0, 40),
      wall,
      anchor,
    })),
    depth_axes,
    row_aligns,
    stack_aligns,
    show_aisle_positions: Boolean(normalized.show_aisle_positions),
  };
}

export function defaultOrientationOf(layout, blocks = []) {
  return normalizePlanLayout(layout, blocks).default_orientation;
}

/**
 * Cambia el master. Devuelve { plan_layout, blocks }.
 * Solo cascada a hileras que seguían el default anterior.
 */
export function setDefaultOrientation(layout, blocks, orientation, { defaultLabelSide }) {
  const nextOrientation = normalizeOrientation(orientation);
  const current = normalizePlanLayout(layout, blocks);
  const prev = current.default_orientation;
  const plan_layout = { ...current, default_orientation: nextOrientation };
  if (prev === nextOrientation) {
    return { plan_layout, blocks: blocks || [] };
  }
  const nextBlocks = (blocks || []).map((block) => {
    const blockOrientation = normalizeOrientation(block.orientation);
    if (blockOrientation !== prev) return block;
    const patch = { ...block, orientation: nextOrientation };
    if (typeof defaultLabelSide === "function") {
      patch.label_side = defaultLabelSide(nextOrientation);
    }
    return patch;
  });
  return { plan_layout, blocks: nextBlocks };
}

/** Snapshot serializable del plano + bloques (para undo de master). */
export function freezePlanWorkingState(plan_layout, blocks) {
  return JSON.parse(
    JSON.stringify({
      plan_layout: normalizePlanLayout(plan_layout, blocks),
      blocks: blocks || [],
    }),
  );
}

export function planWorkingStateKey(plan_layout, blocks) {
  return JSON.stringify(freezePlanWorkingState(plan_layout, blocks));
}

/**
 * Cambia master con undo de un paso.
 * Si vuelves a la orientación del snapshot y no hubo ediciones desde el switch, restaura.
 * Si hubo ediciones, aplica cascade normal.
 * undo: { orientation, plan_layout, blocks, afterKey } | null
 */
export function switchMasterOrientation({
  plan_layout,
  blocks,
  nextOrientation,
  defaultLabelSide,
  undo = null,
}) {
  const currentOri = defaultOrientationOf(plan_layout, blocks);
  const nextOri = normalizeOrientation(nextOrientation);
  if (currentOri === nextOri) {
    return {
      plan_layout: normalizePlanLayout(plan_layout, blocks),
      blocks: blocks || [],
      undo,
    };
  }

  const currentKey = planWorkingStateKey(plan_layout, blocks);
  const dirty = !undo || undo.afterKey !== currentKey;

  if (undo && undo.orientation === nextOri && !dirty) {
    const restored = freezePlanWorkingState(undo.plan_layout, undo.blocks);
    const left = freezePlanWorkingState(plan_layout, blocks);
    return {
      plan_layout: restored.plan_layout,
      blocks: restored.blocks,
      undo: {
        orientation: currentOri,
        plan_layout: left.plan_layout,
        blocks: left.blocks,
        afterKey: planWorkingStateKey(restored.plan_layout, restored.blocks),
      },
    };
  }

  const snapshot = freezePlanWorkingState(plan_layout, blocks);
  const cascaded = setDefaultOrientation(plan_layout, blocks, nextOri, { defaultLabelSide });
  return {
    plan_layout: cascaded.plan_layout,
    blocks: cascaded.blocks,
    undo: {
      orientation: currentOri,
      plan_layout: snapshot.plan_layout,
      blocks: snapshot.blocks,
      afterKey: planWorkingStateKey(cascaded.plan_layout, cascaded.blocks),
    },
  };
}

export function doorDisplayName(door) {
  const name = String(door?.name || "").trim();
  return (name || "Puerta").toUpperCase();
}

export function blockLayoutId(block) {
  return block?.key ? String(block.key) : "";
}

export function depthAxisOf(layout, block) {
  const axes = normalizePlanLayout(layout).depth_axes;
  const id = blockLayoutId(block);
  if (id && axes[id] === "desc") return "desc";
  if (id && axes[id] === "asc") return "asc";
  for (const legacy of legacyBlockIds(block)) {
    if (axes[legacy] === "desc") return "desc";
  }
  return "asc";
}

export function setDepthAxis(layout, block, axis) {
  const current = normalizePlanLayout(layout);
  const id = blockLayoutId(block);
  if (!id) return current;
  return {
    ...current,
    depth_axes: {
      ...current.depth_axes,
      [id]: axis === "desc" ? "desc" : "asc",
    },
  };
}

export function rowAlignOf(layout, block) {
  const aligns = normalizePlanLayout(layout).row_aligns;
  const id = blockLayoutId(block);
  if (id && ROW_ALIGN_VALUES.has(aligns[id])) return aligns[id];
  for (const legacy of legacyBlockIds(block)) {
    if (ROW_ALIGN_VALUES.has(aligns[legacy])) return aligns[legacy];
  }
  return "start";
}

export function setRowAlign(layout, block, align) {
  const current = normalizePlanLayout(layout);
  const id = blockLayoutId(block);
  if (!id) return current;
  const next = { ...current.row_aligns };
  const value = normalizeRowAlign(align);
  if (value === "start") delete next[id];
  else next[id] = value;
  return { ...current, row_aligns: next };
}

export function stackAlignOf(layout, block) {
  const aligns = normalizePlanLayout(layout).stack_aligns;
  const id = blockLayoutId(block);
  if (id && ROW_ALIGN_VALUES.has(aligns[id])) return aligns[id];
  for (const legacy of legacyBlockIds(block)) {
    if (ROW_ALIGN_VALUES.has(aligns[legacy])) return aligns[legacy];
  }
  return "start";
}

export function setStackAlign(layout, block, align) {
  const current = normalizePlanLayout(layout);
  const id = blockLayoutId(block);
  if (!id) return current;
  const next = { ...current.stack_aligns };
  const value = normalizeRowAlign(align);
  if (value === "start") delete next[id];
  else next[id] = value;
  return { ...current, stack_aligns: next };
}

/** Alineación horizontal (marco): izquierda / medio / derecha. */
export function rowAlignOptions() {
  return [
    { value: "start", label: "Izquierda" },
    { value: "center", label: "Medio" },
    { value: "end", label: "Derecha" },
  ];
}

/** Alineación vertical (altura): arriba / medio / abajo. */
export function stackAlignOptions() {
  return [
    { value: "start", label: "Arriba" },
    { value: "center", label: "Medio" },
    { value: "end", label: "Abajo" },
  ];
}

/**
 * Un solo eje libre por hilera (sin doble selector).
 * Vertical → arriba/medio/abajo. Horizontal → izquierda/medio/derecha.
 */
export function blockAlignMode(_masterAxis, orientation) {
  return orientation === "vertical" ? "stack" : "row";
}

export function blockAlignOptions(masterAxis, orientation) {
  return blockAlignMode(masterAxis, orientation) === "stack"
    ? stackAlignOptions()
    : rowAlignOptions();
}

export function blockAlignOf(layout, block, masterAxis) {
  const mode = blockAlignMode(masterAxis, block?.orientation);
  return mode === "stack" ? stackAlignOf(layout, block) : rowAlignOf(layout, block);
}

export function setBlockAlign(layout, block, masterAxis, align) {
  const mode = blockAlignMode(masterAxis, block?.orientation);
  return mode === "stack"
    ? setStackAlign(layout, block, align)
    : setRowAlign(layout, block, align);
}

export function rowAlignOffset(align, slack) {
  const room = Math.max(0, Number(slack) || 0);
  if (!room) return 0;
  if (align === "center") return Math.round(room / 2);
  if (align === "end") return room;
  return 0;
}

export function labelSideOptions(orientation) {
  if (orientation === "vertical") {
    return [
      { value: "above", label: "Izquierda" },
      { value: "below", label: "Derecha" },
    ];
  }
  return [
    { value: "below", label: "Abajo" },
    { value: "above", label: "Arriba" },
  ];
}

export function defaultLabelSide(orientation) {
  return "below";
}

export function depthAxisOptions(depth) {
  const total = Math.max(Number(depth) || 1, 1);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const first = alphabet[0];
  const last = alphabet[total - 1] || String(total);
  if (total < 2) {
    return [{ value: "asc", label: first }];
  }
  return [
    { value: "asc", label: `${first}→${last}` },
    { value: "desc", label: `${last}→${first}` },
  ];
}

/** Nivel 1 ausente o inactivo en todas las profundidades del token → túnel. */
export function isTunnelToken(occupancy, hall, token, places) {
  const list = places || [];
  if (!list.length) return false;
  return list.every((place) => {
    const marks = occupancy[`${hall || ""}\t${token}\t${place}`] || [];
    const levelOne = marks.find((row) => Number(row.level) === 1);
    return !levelOne || !levelOne.is_active;
  });
}

export function orderedDepthPlaces(places, axis) {
  const list = [...(places || [])];
  return axis === "desc" ? list.reverse() : list;
}

export function newDoor(wall = "top", anchor = "center", name = "") {
  return {
    id: `door-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    wall,
    anchor,
  };
}
