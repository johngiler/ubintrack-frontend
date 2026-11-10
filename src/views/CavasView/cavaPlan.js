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

/**
 * Token de sección desde el nombre: máx. 2 iniciales + último número suelto.
 * «Pasillo 1» → P1 · «Tunel Tunel» → TT · «Linea 1» → L1.
 */
export function aisleTokenFromName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const initials = [];
  let number = "";
  for (const part of raw.split(/\s+/)) {
    if (/^\d+$/.test(part)) {
      number = part;
      continue;
    }
    const letter = part.match(/[A-Za-zÀ-ÿ]/)?.[0];
    if (letter && initials.length < 2) initials.push(letter.toUpperCase());
  }
  return `${initials.join("")}${number}`;
}

/** Token único en un set ya usado (PP, PP2, …). */
export function uniqueAisleToken(name, used = []) {
  const taken = new Set((used || []).map((item) => String(item || "").trim()).filter(Boolean));
  const base = aisleTokenFromName(name) || "P";
  if (!taken.has(base)) return base;
  const stem = base.replace(/\d+$/, "") || base;
  let next = 2;
  while (taken.has(`${stem}${next}`)) next += 1;
  return `${stem}${next}`;
}

export const SECTION_TYPES = [
  { value: "pasillo", label: "Pasillo" },
  { value: "tunel", label: "Túnel" },
  { value: "division", label: "División" },
];

export function normalizeSectionType(value) {
  if (value === "tunel" || value === "division") return value;
  return "pasillo";
}

export function isSectionBlock(block) {
  return block?.kind === "section" || block?.kind === "aisle";
}

export function isFloorBlock(block) {
  return block?.kind === "floor";
}

export function isNamedSection(block) {
  return isSectionBlock(block) && Boolean(String(block?.code || "").trim());
}

/** Nombre visible de la sección. */
export function aisleDisplayName(blockOrName) {
  if (blockOrName && typeof blockOrName === "object") {
    const name = String(blockOrName.name || "").trim();
    if (name) return name;
    const code = String(blockOrName.code || "").trim();
    const type = normalizeSectionType(blockOrName.section_type);
    const fallback =
      type === "tunel" ? "Túnel" : type === "division" ? "Línea" : "Pasillo";
    if (!code) return fallback;
    return /^\d+$/.test(code) ? `${fallback} ${code}` : code;
  }
  const token = String(blockOrName || "").trim();
  if (!token) return "Pasillo";
  return /^\d+$/.test(token) ? `Pasillo ${token}` : token;
}

export const sectionDisplayName = aisleDisplayName;

/** Resuelve el nombre visible desde el token (code) buscando el bloque. */
export function aisleLabelForCode(blocks, code) {
  const token = String(code || "").trim();
  if (!token) return "Pasillo";
  const block = (blocks || []).find(
    (item) => isNamedSection(item) && String(item.code || "").trim() === token,
  );
  return aisleDisplayName(block || token);
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

/** Secciones inmediatas prev/next con token. */
export function sectionNeighbors(blocks, indexOrBlock) {
  const list = blocks || [];
  const index =
    typeof indexOrBlock === "number" ? indexOrBlock : list.indexOf(indexOrBlock);
  if (index < 0) return [];
  const found = [];
  if (index > 0 && isNamedSection(list[index - 1])) found.push(list[index - 1]);
  if (index < list.length - 1 && isNamedSection(list[index + 1])) found.push(list[index + 1]);
  return found;
}

export function floorHallToken(neighbors) {
  return (neighbors || [])
    .map((block) => String(block?.code || "").trim())
    .filter(Boolean)
    .join("-");
}

export function floorIsActive(blocks, floorBlock) {
  return sectionNeighbors(blocks, floorBlock).length >= 1;
}

/** Piso dibujado encima de la sección vecina (no ocupa columna propia). */
export function floorOverlaps(block) {
  return isFloorBlock(block) && block?.overlap === true;
}

/** Secciones vecinas sobre las que solapa un piso (1 o 2). */
export function floorOverlapSections(blocks, floorBlock) {
  if (!floorOverlaps(floorBlock)) return [];
  return sectionNeighbors(blocks, floorBlock);
}

/** Sección única de solapar (si hay dos, null — se abarcan ambas). */
export function floorOverlapSection(blocks, floorBlock) {
  const neighbors = floorOverlapSections(blocks, floorBlock);
  return neighbors.length === 1 ? neighbors[0] : null;
}

/** Piso entre dos secciones contiguas (solapa ambos pasillos). */
export function floorSpansTwoSections(blocks, floorBlock) {
  return floorOverlapSections(blocks, floorBlock).length >= 2;
}

/** Pisos del scope que solapan solo esta sección (un vecino). */
export function floorsOverlappingSection(blocks, sectionBlock) {
  const list = blocks || [];
  if (!isNamedSection(sectionBlock) && !isSectionBlock(sectionBlock)) return [];
  return list.filter((block) => floorOverlapSection(list, block) === sectionBlock);
}

/** Places 01..N de posiciones de piso. */
export function floorPositionPlaces(block) {
  if (!isFloorBlock(block)) return [];
  const count = Math.max(0, Number(block.rack_count) || 0);
  if (count < 1) return [];
  return Array.from({ length: count }, (_, index) => String(index + 1).padStart(2, "0"));
}

/** Piso visible: check general del plano, o «siempre visible» del bloque. */
export function floorShowsPositions(block, planLayout = null) {
  if (!isFloorBlock(block)) return false;
  if (block?.always_visible === true) return true;
  return Boolean(planLayout?.show_floor_positions);
}

/** Algún piso del plano se muestra (KPI / conteo). */
export function anyFloorShowsPositions(blocks, planLayout = null) {
  if (Boolean(planLayout?.show_floor_positions)) return true;
  return (blocks || []).some((block) => isFloorBlock(block) && block?.always_visible === true);
}

/** Cuántas posiciones caben por grupo en la hilera (dimensión). Default 3. */
export function floorAcrossOf(block) {
  const raw = Number(block?.depth);
  if (!Number.isFinite(raw) || raw < 1) return 3;
  return Math.floor(raw);
}

/** @deprecated usar floorPositionPlaces */
export function aislePositionPlaces(block) {
  if (isFloorBlock(block)) return floorPositionPlaces(block);
  return [];
}

export function isAisleOverflowPosition(row) {
  return Boolean(row) && !String(row.rack || "").trim();
}

export function countSlots(
  blocks,
  { includeFloorPositions = false, includeAislePositions, planLayout = null } = {},
) {
  const includeAllFloor = includeFloorPositions || includeAislePositions;
  return (blocks || []).reduce((total, block) => {
    if (isFloorBlock(block)) {
      const show = includeAllFloor || floorShowsPositions(block, planLayout);
      return show ? total + floorPositionPlaces(block).length : total;
    }
    if (isSectionBlock(block)) return total;
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

/** KPIs de una hilera (block rack/floor) según occupancy del plano. */
export function blockOccupancyKpis(block, blocks, occupancy) {
  const kpis = emptyOccupancyKpis();
  if (isFloorBlock(block)) {
    const hall = floorHallToken(sectionNeighbors(blocks, block));
    floorPositionPlaces(block).forEach((place) => {
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

/** KPIs totales de la cava. */
export function cavaOccupancyKpis(occupancy, { includeFloorPositions = true, includeAislePositions } = {}) {
  const includeFloor = includeAislePositions ?? includeFloorPositions;
  const kpis = emptyOccupancyKpis();
  Object.values(occupancy || {}).forEach((marks) => {
    (marks || []).forEach((row) => {
      if (!includeFloor && isAisleOverflowPosition(row)) return;
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

/** Sentinel: Sin sección explícita (no heredar vecino). */
export const AISLE_NONE = "-";

export function isAisleNone(value) {
  return String(value || "").trim() === AISLE_NONE;
}

/** Sección contigua en la lista (abajo primero, luego arriba). */
export function neighborAisleCode(blocks, block) {
  const list = blocks || [];
  const index = list.indexOf(block);
  if (index < 0 || block?.kind !== "rack") return "";
  for (let cursor = index + 1; cursor < list.length; cursor += 1) {
    if (list[cursor].kind === "rack") break;
    if (list[cursor].kind === "floor") continue;
    if (!isNamedSection(list[cursor])) continue;
    const code = String(list[cursor].code || "").trim();
    if (code) return code;
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (list[cursor].kind === "rack") break;
    if (list[cursor].kind === "floor") continue;
    if (!isNamedSection(list[cursor])) continue;
    const code = String(list[cursor].code || "").trim();
    if (code) return code;
  }
  return "";
}

/**
 * Sección efectiva del rack: explícito, o cercanía si aisle_code vacío.
 * AISLE_NONE / "-" → sin sección.
 */
export function suggestedAisleCode(blocks, block) {
  if (block?.kind !== "rack") return "";
  const chosen = String(block.aisle_code || "").trim();
  if (isAisleNone(chosen)) return "";
  if (chosen) return chosen;
  return neighborAisleCode(blocks, block);
}

/** Valor del select: Sin sección, código guardado, o preselección por cercanía. */
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

/** Racks ligados a una sección por aisle_code / herencia. */
export function relatedRacksForAisle(blocks, aisle) {
  const list = blocks || [];
  if (!isNamedSection(aisle)) return [];
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

/** Agrupa racks contiguos (espalda-espalda) y bloques sueltos. */
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
    if (isSectionBlock(block)) {
      const name = String(block.name || "").trim();
      const section_type = normalizeSectionType(block.section_type);
      return {
        kind: "section",
        section_type,
        name,
        code: String(block.code || "").trim(),
        rack_count: 0,
        orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      };
    }
    if (isFloorBlock(block)) {
      return {
        kind: "floor",
        rack_count: Math.max(0, Number(block.rack_count) || 0),
        depth: floorAcrossOf(block),
        overlap: block.overlap === true,
        always_visible: block.always_visible === true,
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
