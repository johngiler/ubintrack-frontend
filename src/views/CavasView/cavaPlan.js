export function slotKey(hall, rack, place) {
  return `${hall || ""}\t${rack}\t${place}`;
}

export function cavaTitleOf(name, code) {
  const token = String(code || "").trim();
  const given = String(name || "").trim();
  if (given) {
    return token && !given.endsWith(token) ? `${given} ${token}` : given;
  }
  return token ? `Cava ${token}` : "Cava";
}

/** Nombre visible del pasillo: «Pasillo 1» (sin prefijo P de nomenclatura). */
export function aisleDisplayName(code) {
  const token = String(code || "").trim();
  return token ? `Pasillo ${token}` : "Pasillo";
}

export function depthCodesOf(block) {
  const total = Number(block.depth) || (block.kind === "rack" ? 1 : 0);
  if (!total) return [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return Array.from({ length: total }, (_, index) => alphabet[index] || String(index + 1));
}

export function rackTokensOf(block) {
  if (block.kind !== "rack") return [];
  const count = Number(block.rack_count) || 1;
  const raw = String(block.code || "").trim();
  if (/^\d+$/.test(raw)) {
    const start = Number(raw);
    return Array.from({ length: count }, (_, index) => String(start + index));
  }
  if (count === 1 && raw) return [raw];
  return [];
}

/** Places 01..N de sobre-almacenamiento en un pasillo. */
export function aislePositionPlaces(block) {
  if (block?.kind !== "aisle") return [];
  const count = Math.max(0, Number(block.rack_count) || 0);
  if (count < 1) return [];
  return Array.from({ length: count }, (_, index) => String(index + 1).padStart(2, "0"));
}

export function isAisleOverflowPosition(row) {
  return Boolean(row) && !String(row.rack || "").trim();
}

export function countSlots(blocks, { includeAislePositions = false } = {}) {
  return (blocks || []).reduce((total, block) => {
    if (block.kind === "aisle") {
      return includeAislePositions ? total + aislePositionPlaces(block).length : total;
    }
    if (block.kind !== "rack") return total;
    const levels = Number(block.levels) || 0;
    const racks = rackTokensOf(block).length;
    const depth = depthCodesOf(block).length;
    if (levels < 1 || racks < 1 || depth < 1) return total;
    return total + racks * levels * depth;
  }, 0);
}

export function emptyOccupancyKpis() {
  return { total: 0, libre: 0, asignado: 0, ocupado: 0, inactivo: 0, activa: 0 };
}

export function accumulateOccupancyKpi(kpis, row) {
  if (!row || !kpis) return;
  kpis.total += 1;
  if (!row.is_active) {
    kpis.inactivo += 1;
    return;
  }
  kpis.activa += 1;
  if (row.status === "ocupado") kpis.ocupado += 1;
  else if (row.status === "asignado") kpis.asignado += 1;
  else kpis.libre += 1;
}

/** KPIs de una hilera (block rack) según occupancy del plano. */
export function blockOccupancyKpis(block, blocks, occupancy) {
  const kpis = emptyOccupancyKpis();
  if (block?.kind === "aisle") {
    const hall = String(block.code || "").trim();
    aislePositionPlaces(block).forEach((place) => {
      const marks = occupancy?.[slotKey(hall, "", place)] || [];
      marks.forEach((row) => accumulateOccupancyKpi(kpis, row));
    });
    return kpis;
  }
  if (block?.kind !== "rack") return kpis;
  const hall = suggestedAisleCode(blocks, block);
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  tokens.forEach((token) => {
    places.forEach((place) => {
      const marks = occupancy?.[slotKey(hall, token, place)] || [];
      marks.forEach((row) => accumulateOccupancyKpi(kpis, row));
    });
  });
  return kpis;
}

/** KPIs totales de la cava. includeAislePositions=false omite sobre-almacenamiento. */
export function cavaOccupancyKpis(occupancy, { includeAislePositions = true } = {}) {
  const kpis = emptyOccupancyKpis();
  Object.values(occupancy || {}).forEach((marks) => {
    (marks || []).forEach((row) => {
      if (!includeAislePositions && isAisleOverflowPosition(row)) return;
      accumulateOccupancyKpi(kpis, row);
    });
  });
  return kpis;
}

/** Etiqueta corta de hilera: R1 o R1–R8. */
export function hileraLabel(block, rackPrefix = "") {
  const tokens = rackTokensOf(block);
  if (!tokens.length) return "Hilera";
  const prefix = String(rackPrefix || "");
  if (tokens.length === 1) return `${prefix}${tokens[0]}`;
  return `${prefix}${tokens[0]}–${prefix}${tokens[tokens.length - 1]}`;
}

export function isVerticalBlock(block) {
  return block?.orientation === "vertical";
}

/** True si el block sigue el eje principal del master. */
export function isMainAxisBlock(block, axis) {
  const vertical = isVerticalBlock(block);
  return axis === "vertical" ? vertical : !vertical;
}

/**
 * Mismo layout rotado según master.
 * axis=horizontal → flancos V (before/after = izq/der), main = H
 * axis=vertical   → flancos H (before/after = arriba/abajo), main = V
 */
export function planSections(blocks, { axis = "horizontal" } = {}) {
  const master = axis === "vertical" ? "vertical" : "horizontal";
  const list = blocks || [];
  const sections = [];
  let i = 0;
  while (i < list.length) {
    const before = [];
    while (i < list.length && !isMainAxisBlock(list[i], master)) {
      before.push(list[i]);
      i += 1;
    }
    const main = [];
    while (i < list.length && isMainAxisBlock(list[i], master)) {
      main.push(list[i]);
      i += 1;
    }
    const after = [];
    if (main.length) {
      while (i < list.length && !isMainAxisBlock(list[i], master)) {
        after.push(list[i]);
        i += 1;
      }
    }
    if (before.length || main.length || after.length) {
      sections.push({ axis: master, before, main, after });
    }
  }
  return sections;
}

/** Sentinel: Sin pasillo explícito (no heredar vecino). */
export const AISLE_NONE = "-";

export function isAisleNone(value) {
  return String(value || "").trim() === AISLE_NONE;
}

/** Pasillo contiguo en la lista (abajo primero, luego arriba; para al llegar a otro rack). */
export function neighborAisleCode(blocks, block) {
  const list = blocks || [];
  const index = list.indexOf(block);
  if (index < 0 || block?.kind !== "rack") return "";
  for (let cursor = index + 1; cursor < list.length; cursor += 1) {
    if (list[cursor].kind === "rack") break;
    if (list[cursor].kind !== "aisle") continue;
    const code = String(list[cursor].code || "").trim();
    if (code) return code;
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (list[cursor].kind === "rack") break;
    if (list[cursor].kind !== "aisle") continue;
    const code = String(list[cursor].code || "").trim();
    if (code) return code;
  }
  return "";
}

/**
 * Pasillo efectivo del rack: explícito, o cercanía si aisle_code vacío.
 * AISLE_NONE / "-" → sin pasillo (nomenclatura sin P).
 */
export function suggestedAisleCode(blocks, block) {
  if (block?.kind !== "rack") return "";
  const chosen = String(block.aisle_code || "").trim();
  if (isAisleNone(chosen)) return "";
  if (chosen) return chosen;
  return neighborAisleCode(blocks, block);
}

/** Valor del select: Sin pasillo, código guardado, o preselección por cercanía. */
export function aisleSelectValue(blocks, block) {
  if (block?.kind !== "rack") return "";
  const chosen = String(block.aisle_code || "").trim();
  if (isAisleNone(chosen)) return "";
  if (chosen) return chosen;
  return neighborAisleCode(blocks, block);
}

/** Persistir selección del select ("" → NONE si hay vecino, si no vacío). */
export function aisleCodeFromSelect(blocks, block, selected) {
  const value = String(selected || "").trim();
  if (value) return value;
  return neighborAisleCode(blocks, block) ? AISLE_NONE : "";
}

/** Racks ligados a un pasillo por aisle_code / herencia (o vecino si nadie lo asignó). */
export function relatedRacksForAisle(blocks, aisle) {
  const list = blocks || [];
  if (!aisle || aisle.kind !== "aisle") return [];
  const code = String(aisle.code || "").trim();
  if (code) {
    const linked = list.filter((block) => {
      if (block.kind !== "rack") return false;
      return suggestedAisleCode(list, block) === code;
    });
    if (linked.length) return linked;
  }
  const index = list.indexOf(aisle);
  if (index < 0) return [];
  for (let cursor = index + 1; cursor < list.length; cursor += 1) {
    if (list[cursor].kind === "rack") return [list[cursor]];
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (list[cursor].kind === "rack") return [list[cursor]];
  }
  return [];
}

/** Agrupa racks contiguos (espalda-espalda) y pasillos sueltos. */
export function contiguousBlockGroups(blocks) {
  const groups = [];
  for (const block of blocks || []) {
    const last = groups[groups.length - 1];
    if (block.kind === "rack" && last?.kind === "rack") {
      last.blocks.push(block);
      continue;
    }
    groups.push({ kind: block.kind, blocks: [block] });
  }
  return groups;
}

export function blocksPayload(blocks) {
  return (blocks || []).map((block) => {
    if (block.kind === "aisle") {
      return {
        kind: "aisle",
        code: String(block.code || "").trim(),
        rack_count: Math.max(0, Number(block.rack_count) || 0),
        orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      };
    }
    return {
      kind: "rack",
      code: String(block.code || "").trim(),
      rack_count: Number(block.rack_count) || 1,
      levels: Number(block.levels) || 0,
      depth: Number(block.depth) || 0,
      orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      label_side: block.label_side === "above" ? "above" : "below",
      aisle_code: isAisleNone(block.aisle_code)
        ? AISLE_NONE
        : String(block.aisle_code || "").trim(),
    };
  });
}
