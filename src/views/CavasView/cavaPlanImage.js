import {
  accumulateOccupancyKpi,
  aisleDisplayName,
  blockOccupancyKpis,
  cavaOccupancyKpis,
  cavaTitleOf,
  countSlots,
  depthCodesOf,
  emptyOccupancyKpis,
  floorAcrossOf,
  floorHallToken,
  floorOverlaps,
  floorOverlapSection,
  floorOverlapSections,
  floorPositionPlaces,
  floorShowsPositions,
  floorSpansTwoSections,
  floorsOverlappingSection,
  isFloorBlock,
  isSectionBlock,
  normalizeSectionType,
  planSections,
  rackTokensOf,
  relatedRacksForAisle,
  sectionNeighbors,
  slotKey,
  suggestedAisleCode,
} from "./cavaPlan";
import {
  DOOR_SPAN,
  PLAN_VIEW_FRAME_MIN,
  PLAN_VIEW_MAX_WIDTH,
  doorAlongRatio,
  doorDisplayName,
  defaultOrientationOf,
  depthAxisOf,
  isTunnelToken,
  normalizePlanLayout,
  orderedDepthPlaces,
  rowAlignOf,
  rowAlignOffset,
  stackAlignOf,
} from "./planLayout";
import {
  SVG_AISLE_SIZE,
  SVG_CELL,
  SVG_CROSS_GAP,
  SVG_LABEL_GAP,
  SVG_PIECE_GAP,
} from "./cavaPlanSpacing";
import {
  AISLE_POS_GAP_SVG,
  aisleGroupBoxSize,
  aisleGroupSpan,
  chunkAislePlaces,
  sectionBandBaseSize,
} from "./cavaAisleVisual";

const PLACEHOLDER = "#f59e0b";

const CELL = SVG_CELL;
const PIECE_GAP = SVG_PIECE_GAP;
const RACK_GAP = PIECE_GAP;
const STACK_GAP = PIECE_GAP;
const LABEL_H = 18;
const LABEL_W = 28;
const LABEL_GAP = SVG_LABEL_GAP;
const AXIS_GAP = LABEL_GAP;
const AXIS_W = 16;
const AXIS_TOP = 14;
const FRAME = 18;
const DOOR_GAP = 56;
const AISLE = SVG_AISLE_SIZE;
/** V↔H al lado y arriba/abajo: mismo valor que el modal (escalado). */
const CROSS_ORIENTATION_GAP = SVG_CROSS_GAP;
const ROW_GAP = PIECE_GAP;
const PAD = 28;
const HEADER = 68;
const KPI_H = 22;
const KPI_MIN_W = 40;
const KPI_GAP = PIECE_GAP;
const KPI_SIDE_W = 22;
const KPI_INNER_GAP = PIECE_GAP;
const KPI_FILL = "#f0f9ff";
const KPI_STROKE = "#7dd3fc";
const KPI_INK = "#075985";

const INK = "#0f172a";
const LINE = "#94a3b8";
const TUNNEL = "#f59e0b";
const DOOR = "#0284c7";
const AISLE_FILL = "#f8fafc";
const LABEL = "#475569";
const TITLE = "#1e293b";
const FREE = "#10b981";
const ASSIGNED = "#f97316";
const BUSY = "#ef4444";
const IDLE = "#94a3b8";

function markFill(item) {
  if (!item?.is_active) return IDLE;
  if (item.status === "ocupado") return BUSY;
  if (item.status === "asignado") return ASSIGNED;
  return FREE;
}

function markName(item) {
  if (!item?.is_active) return "Inactivo";
  if (item.status === "ocupado") return "Ocupado";
  if (item.status === "asignado") return "Asignado";
  return "Libre";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileNameOf(title) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "plano"}.png`;
}

function measureRack(block, blocks, rackPrefix, planLayout) {
  const horizontal = block.orientation !== "vertical";
  const tokens = rackTokensOf(block);
  const rawPlaces = depthCodesOf(block);
  const places = orderedDepthPlaces(rawPlaces, depthAxisOf(planLayout, block));
  const hall = suggestedAisleCode(blocks, block);
  const depth = places.length;
  const levels = Number(block.levels) || 0;
  if (!tokens.length || levels < 1 || depth < 1) {
    return { kind: "note", w: 160, h: 22, text: "Rack incompleto" };
  }
  const cols = horizontal ? 1 : depth;
  const rows = horizontal ? depth : 1;
  const gridW = cols * CELL;
  const gridH = rows * CELL;
  const labelSide = block.label_side === "above" ? "above" : "below";
  if (horizontal) {
    const unitH = gridH + LABEL_GAP + LABEL_H;
    const gaps = Math.max(tokens.length - 1, 0) * RACK_GAP;
    return {
      kind: "rack",
      horizontal,
      w: tokens.length * gridW + gaps,
      h: unitH,
      tokens,
      places,
      rawPlaces,
      hall,
      depth,
      levels,
      gridW,
      gridH,
      labelSide,
      prefix: rackPrefix,
      block,
    };
  }
  const unitH = gridH;
  const unitW = gridW + LABEL_GAP + LABEL_W;
  return {
    kind: "rack",
    horizontal,
    w: unitW,
    h: tokens.length * unitH + Math.max(tokens.length - 1, 0) * STACK_GAP,
    tokens,
    places,
    rawPlaces,
    hall,
    depth,
    levels,
    gridW,
    gridH,
    labelSide,
    prefix: rackPrefix,
    block,
  };
}

/** Ver cavaAisleVisual.js — misma geometría que el modal. */
const AISLE_POS_GAP = AISLE_POS_GAP_SVG;

function measureFloorAlong(block, planLayout, vertical) {
  if (!floorShowsPositions(block, planLayout)) return 0;
  const places = floorPositionPlaces(block);
  if (!places.length) return 0;
  const across = floorAcrossOf(block);
  const groups = chunkAislePlaces(places, across);
  return aisleGroupSpan(groups, { aisleVertical: vertical, svg: true, across });
}

function measureRestingFloorAlong(block, scope, planLayout, vertical) {
  if (!isFloorBlock(block)) return 0;
  if (floorOverlaps(block) && floorOverlapSections(scope, block).length) return 0;
  return measureFloorAlong(block, planLayout, vertical);
}

/** Pisos vecinos o que solapan (largo = solo posiciones, sin KPI). */
function measureFloorsAlongSection(scope, section, planLayout, vertical) {
  const list = scope || [];
  const overlapping = list.filter(
    (block) =>
      floorOverlaps(block) && floorOverlapSections(list, block).includes(section),
  );
  if (overlapping.length) {
    return Math.max(
      0,
      ...overlapping.map((item) => measureFloorAlong(item, planLayout, vertical)),
    );
  }
  const index = list.indexOf(section);
  if (index < 0) return 0;
  const neighbors = [];
  if (index > 0 && isFloorBlock(list[index - 1])) neighbors.push(list[index - 1]);
  if (index < list.length - 1 && isFloorBlock(list[index + 1])) neighbors.push(list[index + 1]);
  return Math.max(
    0,
    ...neighbors.map((item) => measureFloorAlong(item, planLayout, vertical)),
  );
}

function measureRelatedSpan(block, blocks, rackPrefix, planLayout, scopeBlocks, vertical) {
  const scope = scopeBlocks || blocks;
  const sectionType = normalizeSectionType(block.section_type);
  const floorAlong = measureFloorsAlongSection(scope, block, planLayout, vertical);
  // Túnel: alto/ancho = largo de posiciones (sin contador).
  if (sectionType === "tunel" && floorAlong > 0) return floorAlong;

  // Solo absolute/solapar: mirar racks al otro lado del piso/sección.
  const throughSections = floorsOverlappingSection(scope, block).length > 0;
  const related = relatedRacksForAisle(scope, block, { throughSections });
  const relatedMeasures = related.map((rack) => measureRack(rack, blocks, rackPrefix, planLayout));
  let rackAlong = 0;
  if (vertical) {
    // Tope 100% de sección V: eje + racks, sin contador KPI (hueco aparte, como H).
    rackAlong = relatedMeasures.length
      ? Math.max(
          0,
          ...relatedMeasures.map(
            (item) => item.h + (item.places?.length ? AXIS_TOP + AXIS_GAP : 0),
          ),
        )
      : 0;
  } else {
    // Tope 100% de sección H: eje + racks, sin contador KPI de hilera.
    rackAlong = relatedMeasures.length
      ? Math.max(
          0,
          ...relatedMeasures.map((item) => {
            const axisW = item.places?.length ? AXIS_W + AXIS_GAP : 0;
            return axisW + item.w;
          }),
        )
      : 0;
  }
  if (rackAlong > 0) return rackAlong;
  if (floorAlong > 0) return floorAlong;
  return Math.max(
    0,
    ...(scope || []).map((item) => measureRestingFloorAlong(item, scope, planLayout, vertical)),
  );
}

/** Ancho/alto fit del label de sección (sin vecino relacionado). */
function sectionFitAlong(label, vertical, base) {
  const text = String(label || "").trim() || "—";
  const char = vertical ? 11 : 9;
  const pad = vertical ? 24 : 32;
  return Math.max(base, text.length * char + pad);
}

function measureFloorCross(block, planLayout, vertical) {
  if (!floorShowsPositions(block, planLayout)) return 0;
  const places = floorPositionPlaces(block);
  if (!places.length) return 0;
  const across = floorAcrossOf(block);
  const box = aisleGroupBoxSize({ svg: true, aisleVertical: vertical, across });
  return vertical ? box.w : box.h;
}

function measureBlock(block, blocks, rackPrefix, aislePrefix, planLayout, scopeBlocks = null) {
  if (isSectionBlock(block)) {
    const sectionType = normalizeSectionType(block.section_type);
    const code = String(block.code || "").trim();
    const label = aisleDisplayName(block);
    const vertical = block.orientation === "vertical";
    const align = vertical ? stackAlignOf(planLayout, block) : rowAlignOf(planLayout, block);
    const base = sectionBandBaseSize(sectionType, { emptySize: AISLE });
    const scope = scopeBlocks || blocks;
    const relatedSpan = measureRelatedSpan(block, blocks, rackPrefix, planLayout, scope, vertical);
    const fitSpan = sectionType === "division" ? Math.max(base, 48) : sectionFitAlong(label, vertical, base);
    // Sin 100%: ancho de su relacionado. Con 100%: finalize amplía a la pista.
    const along = relatedSpan > 0 ? Math.max(base, relatedSpan) : fitSpan;
    // Absolute/solapar: shell independiente del check 100%.
    const overlayAlong = relatedSpan > 0 ? Math.max(base, relatedSpan) : along;
    // Solapar: el pasillo engrosa al tamaño del piso para centrarlo entre racks.
    const overlayCross = Math.max(
      0,
      ...floorsOverlappingSection(scope, block).map((floor) =>
        measureFloorCross(floor, planLayout, vertical),
      ),
    );
    const cross = Math.max(base, overlayCross);
    if (vertical) {
      return {
        kind: "section",
        sectionType,
        vertical: true,
        w: cross,
        h: along,
        overlayAlong,
        label,
        block,
        places: [],
        hall: code,
        align,
      };
    }
    return {
      kind: "section",
      sectionType,
      vertical: false,
      w: along,
      h: cross,
      overlayAlong,
      label,
      block,
      places: [],
      hall: code,
      align,
    };
  }
  if (isFloorBlock(block)) {
    const vertical = block.orientation === "vertical";
    const align = vertical ? stackAlignOf(planLayout, block) : rowAlignOf(planLayout, block);
    // Oculto: no ocupa espacio ni dibuja etiqueta (evita T1/Piso encima del túnel).
    if (!floorShowsPositions(block, planLayout)) {
      return {
        kind: "floor",
        vertical,
        across: floorAcrossOf(block),
        overlap: true,
        hidden: true,
        w: 0,
        h: 0,
        label: "",
        block,
        places: [],
        hall: "",
        align,
      };
    }
    const places = floorPositionPlaces(block);
    const across = floorAcrossOf(block);
    const hall = floorHallToken(sectionNeighbors(blocks, block));
    const groups = chunkAislePlaces(places, across);
    const groupBox = aisleGroupBoxSize({ svg: true, aisleVertical: vertical, across });
    const groupSpan = aisleGroupSpan(groups, { aisleVertical: vertical, svg: true, across });
    const overlap = floorOverlaps(block);
    // Solo posiciones (sin KPI): el túnel alinea al largo de las celdas.
    const naturalW = vertical
      ? groups.length
        ? groupBox.w
        : Math.max(24, String(hall || "Piso").length * 7)
      : groups.length
        ? groupSpan
        : Math.max(48, String(hall || "Piso").length * 8);
    const naturalH = vertical
      ? groups.length
        ? groupSpan
        : 48
      : groups.length
        ? groupBox.h
        : 20;
    return {
      kind: "floor",
      vertical,
      across,
      overlap,
      w: naturalW,
      h: naturalH,
      label: hall || "Piso",
      block,
      places,
      hall,
      align,
    };
  }
  return { ...measureRack(block, blocks, rackPrefix, planLayout), block };
}

function sideItemTopAxis(item) {
  return item.kind === "rack" && !item.horizontal && (item.places?.length || 0) >= 1
    ? AXIS_TOP + AXIS_GAP
    : 0;
}

/** KPI arriba en hilera vertical. */
function sideItemKpiTop(item) {
  return item.kind === "rack" && !item.horizontal ? KPI_H + KPI_GAP : 0;
}

function sideItemTop(item) {
  return sideItemKpiTop(item) + sideItemTopAxis(item);
}

function measureSideColumn(blocks, blocksAll, rackPrefix, aislePrefix, planLayout) {
  // Scope = columna + lista completa: el pasillo toma la hilera relacionada aunque esté fuera del grupo.
  const items = blocks.map((block) =>
    measureBlock(block, blocksAll, rackPrefix, aislePrefix, planLayout, blocksAll),
  );
  const rackTrackH = Math.max(
    0,
    ...items
      .filter((item) => item.kind === "rack")
      .map((item) => sideItemDrawnH(item)),
  );
  // Igualar alto al cuerpo del relacionado (sin KPI). Con 100%: a la pista sin contador.
  items.forEach((item) => {
    if (item.kind !== "section" || !item.vertical) return;
    const throughSections = floorsOverlappingSection(blocksAll, item.block).length > 0;
    const related = relatedRacksForAisle(blocksAll, item.block, { throughSections });
    const relatedKeys = new Set(related.map((rack) => String(rack.key || rack.id || "")));
    const usesKpiPad = related.some((rack) => rack.orientation === "vertical");
    const kpiPad = usesKpiPad ? KPI_H + KPI_GAP : 0;
    const relatedBodyH = Math.max(
      item.h,
      ...items
        .filter(
          (entry) =>
            entry.kind === "rack" && relatedKeys.has(String(entry.block.key || entry.block.id || "")),
        )
        .map((entry) => Math.max(0, sideItemDrawnH(entry) - sideItemKpiTop(entry))),
    );
    const trackBodyH = Math.max(0, rackTrackH - kpiPad);
    const target =
      item.block?.stretch_full && trackBodyH > 0
        ? Math.max(relatedBodyH, trackBodyH)
        : relatedBodyH;
    if (target > item.h) {
      item.h = target;
      item.overlayAlong = Math.max(item.overlayAlong || 0, target);
    }
    item.kpiTopPad = kpiPad;
  });
  let w = 0;
  let h = 0;
  let laid = 0;
  items.forEach((item) => {
    // Solapar: no suma ancho ni alto a la columna (solo overlay).
    if (item.kind === "floor" && item.overlap) return;
    const sectionKpiPad =
      item.kind === "section" && item.vertical ? item.kpiTopPad || 0 : 0;
    h = Math.max(h, item.h + sideItemTop(item) + sectionKpiPad);
    if (laid > 0) w += RACK_GAP;
    w += item.w;
    laid += 1;
  });
  return { items, w, h };
}

function measureMiddleRow(block, blocks, rackPrefix, aislePrefix, planLayout, middleBlocks) {
  const item = measureBlock(block, blocks, rackPrefix, aislePrefix, planLayout, middleBlocks);
  const showSideAxis = block.kind === "rack" && block.orientation !== "vertical" && depthCodesOf(block).length >= 1;
  const showTopAxis = block.kind === "rack" && block.orientation === "vertical" && depthCodesOf(block).length >= 1;
  const axisW = showSideAxis ? AXIS_W + AXIS_GAP : 0;
  const axisTopH = showTopAxis ? AXIS_TOP + AXIS_GAP : 0;
  // Solo hilera horizontal: contador a la izquierda (pill girado).
  // En pasillo el KPI va junto al último cuadro (ver drawItem).
  const kpiSideW =
    block.kind === "rack" && block.orientation !== "vertical" ? KPI_SIDE_W + KPI_INNER_GAP : 0;
  return {
    block,
    item,
    axisW,
    axisTopH,
    kpiSideW,
    contentW: kpiSideW + axisW + item.w,
    w: kpiSideW + axisW + item.w,
    h: axisTopH + item.h,
  };
}

function finalizeHorizontalRows(middleRows, scopeBlocks = null) {
  const scope = scopeBlocks || middleRows.map((entry) => entry.block);
  const rackTrack = Math.max(
    0,
    ...middleRows.filter((row) => row.block.kind === "rack").map((row) => row.contentW),
  );
  middleRows.forEach((row) => {
    if (row.item.vertical || rackTrack < 1) return;
    if (row.item.kind === "floor") {
      // Piso: fit-content; no estirar a la pista. Solapado no suma fila propia.
      row.contentW = row.item.overlap ? 0 : row.axisW + row.item.w;
      return;
    }
    if (row.item.kind !== "section") return;
    // Hueco KPI solo si sigue hilera horizontal (piso/túnel sin rack H: sin pad).
    const usesKpiPad = relatedRacksForAisle(scope, row.block).some(
      (rack) => rack.orientation !== "vertical",
    );
    row.kpiSideW = usesKpiPad ? KPI_SIDE_W + KPI_INNER_GAP : 0;
    if (row.block?.stretch_full && rackTrack > 0) {
      const rackOnly = Math.max(0, rackTrack - (usesKpiPad ? row.kpiSideW : 0));
      if (rackOnly > row.item.w) {
        row.item.w = rackOnly;
        row.item.overlayAlong = Math.max(row.item.overlayAlong || 0, rackOnly);
      }
    }
    row.contentW = row.kpiSideW + row.axisW + row.item.w;
  });
  const trackW = Math.max(rackTrack, ...middleRows.map((row) => row.contentW), 0);
  middleRows.forEach((row) => {
    row.w = trackW;
    row.dividerW = 0;
  });
  let middleH = 0;
  let laid = 0;
  middleRows.forEach((row) => {
    if (row.item.kind === "floor" && row.item.overlap) return;
    if (laid > 0) middleH += ROW_GAP;
    middleH += row.h;
    laid += 1;
  });
  return { middleRows, trackW, middleH, w: trackW, h: middleH };
}

function measureHorizontalBand(bandBlocks, blocks, rackPrefix, aislePrefix, planLayout) {
  const list = bandBlocks || [];
  const middleRows = list.map((block) =>
    measureMiddleRow(block, blocks, rackPrefix, aislePrefix, planLayout, list),
  );
  return finalizeHorizontalRows(middleRows, list);
}

function measureSection(section, blocks, rackPrefix, aislePrefix, planLayout) {
  const axis = section.axis === "vertical" ? "vertical" : "horizontal";
  if (axis === "vertical") {
    const before = measureHorizontalBand(section.before, blocks, rackPrefix, aislePrefix, planLayout);
    const main = measureSideColumn(section.main, blocks, rackPrefix, aislePrefix, planLayout);
    const after = measureHorizontalBand(section.after, blocks, rackPrefix, aislePrefix, planLayout);
    // Mismo hueco que vertical individual ↔ horizontales al lado.
    const bandGaps =
      (before.h && main.h ? CROSS_ORIENTATION_GAP : 0) +
      (after.h && (before.h || main.h) ? CROSS_ORIENTATION_GAP : 0);
    const w = Math.max(before.w, main.w, after.w, 0);
    const h = before.h + main.h + after.h + bandGaps;
    return { axis, before, main, after, sideGaps: 0, bandGaps, w, h };
  }

  const before = measureSideColumn(section.before, blocks, rackPrefix, aislePrefix, planLayout);
  const after = measureSideColumn(section.after, blocks, rackPrefix, aislePrefix, planLayout);
  const main = measureHorizontalBand(section.main, blocks, rackPrefix, aislePrefix, planLayout);
  const h = Math.max(before.h, after.h, main.h, 0);
  [before, after].forEach((column) => {
    column.h = Math.max(column.h, h);
  });
  const sideGaps =
    (before.w && main.w ? CROSS_ORIENTATION_GAP : 0) +
    (after.w && (before.w || main.w) ? CROSS_ORIENTATION_GAP : 0);
  return {
    axis,
    before,
    main,
    after,
    sideGaps,
    bandGaps: 0,
    w: before.w + main.w + after.w + sideGaps,
    h,
  };
}

/**
 * Lienzo fit-content: H y V con piso FRAME_MIN; solo crece si el contenido supera el mín.
 */
function expandSectionsToModalWidth(sections, masterAxis) {
  const frameMin = Math.max(1, PLAN_VIEW_FRAME_MIN - PAD * 2 - FRAME * 2);
  const naturalH = Math.max(1, ...sections.map((section) => section.h));
  const contentMinH = frameMin;

  sections.forEach((section) => {
    if (section.axis === "vertical") {
      if (section.main) section.main.drawW = section.main.w || 0;
      section.w = Math.max(section.main?.w || 0, section.before?.w || 0, section.after?.w || 0);
      const needH = Math.max(contentMinH, section.h);
      if (needH > section.h && section.main) {
        section.main.drawH = (section.main.h || 0) + (needH - section.h);
        section.h = needH;
      } else if (section.main) {
        section.main.drawH = section.main.h;
      }
      return;
    }
    // Horizontal: ancho natural del tramo (sin forzar al modal).
    if (section.before) section.before.drawW = section.before.w;
    if (section.after) section.after.drawW = section.after.w;
    const gaps = section.sideGaps || 0;
    const mainW = section.main?.w || 0;
    section.w = (section.before?.w || 0) + mainW + (section.after?.w || 0) + gaps;
    if (section.main?.middleRows) {
      section.main.middleRows.forEach((row) => {
        row.w = Math.max(row.w || 0, mainW);
      });
    }
    if (section.h < contentMinH) {
      section.drawH = contentMinH;
      section.h = contentMinH;
    }
  });
  const contentWidth = Math.max(frameMin, ...sections.map((section) => section.w || 0));
  return { contentWidth, contentMinH: Math.max(contentMinH, naturalH) };
}

function text(x, y, value, { size = 13, weight = "600", anchor = "middle", baseline = "middle" } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}" font-family="ui-sans-serif, system-ui, sans-serif" fill="${LABEL}" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
}

function drawPickingCheck(parts, mx, my, dot) {
  const pad = Math.max(1.2, dot * 0.22);
  const x1 = mx + pad;
  const y1 = my + dot * 0.52;
  const x2 = mx + dot * 0.42;
  const y2 = my + dot - pad;
  const x3 = mx + dot - pad;
  const y3 = my + pad * 1.1;
  const stroke = Math.max(1.25, dot * 0.18);
  parts.push(
    `<polyline points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="#ffffff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}

function drawMarks(parts, x, y, width, height, marks, levels = 0) {
  const real = marks?.length ? [...marks].sort((a, b) => a.level - b.level) : null;
  const count = real ? real.length : levels >= 1 ? levels : 0;
  if (!count) return;
  const columns = Math.min(3, count);
  const markRows = Math.ceil(count / columns);
  const gap = 2;
  const room = Math.min(width, height) - 8;
  const dot = Math.max(6, Math.min(12, (room - (columns - 1) * gap) / columns, (room - (markRows - 1) * gap) / markRows));
  const gridW = columns * dot + (columns - 1) * gap;
  const gridH = markRows * dot + (markRows - 1) * gap;
  const originX = x + (width - gridW) / 2;
  const originY = y + (height - gridH) / 2;
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const mx = originX + column * (dot + gap);
    const my = originY + row * (dot + gap);
    if (real) {
      const mark = real[index];
      const tip = mark.is_picking ? " · Picking" : "";
      parts.push(
        `<rect x="${mx}" y="${my}" width="${dot}" height="${dot}" fill="${markFill(mark)}"><title>Nivel ${mark.level} · ${escapeXml(markName(mark))}${tip}</title></rect>`,
      );
      if (mark.is_picking) drawPickingCheck(parts, mx, my, dot);
    } else {
      parts.push(
        `<rect x="${mx}" y="${my}" width="${dot}" height="${dot}" fill="none" stroke="${PLACEHOLDER}" stroke-width="1.5"><title>Nivel ${index + 1}</title></rect>`,
      );
    }
  }
}

function drawRackUnit(parts, x, y, item, token, occupancy) {
  const tunnel = isTunnelToken(occupancy, item.hall, token, item.rawPlaces || item.places);
  const stroke = tunnel ? TUNNEL : INK;
  const strokeW = tunnel ? 2.5 : 1.5;
  let gridX = x;
  let gridY = y;
  let labelX = x + item.gridW / 2;
  let labelY = y + item.gridH + LABEL_GAP + LABEL_H / 2;
  let labelAnchor = "middle";

  if (item.horizontal) {
    const above = item.labelSide === "above";
    gridY = above ? y + LABEL_H + LABEL_GAP : y;
    labelY = above ? y + LABEL_H / 2 : gridY + item.gridH + LABEL_GAP + LABEL_H / 2;
    labelX = x + item.gridW / 2;
  } else {
    // Mismo LABEL_GAP que horizontal / letra de profundidad; texto al borde del cuadro.
    const left = item.labelSide === "above";
    gridX = left ? x + LABEL_W + LABEL_GAP : x;
    labelX = left ? gridX - LABEL_GAP : gridX + item.gridW + LABEL_GAP;
    labelY = y + item.gridH / 2;
    labelAnchor = left ? "end" : "start";
  }

  const cols = item.horizontal ? 1 : item.depth;
  const rows = item.horizontal ? item.depth : 1;
  const cellW = item.gridW / cols;
  const cellH = item.gridH / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const place = item.places[item.horizontal ? row : column];
      const marks = occupancy[slotKey(item.hall, token, place)] || [];
      const cellX = gridX + column * cellW;
      const cellY = gridY + row * cellH;
      parts.push(`<rect x="${cellX}" y="${cellY}" width="${cellW}" height="${cellH}" fill="#ffffff"/>`);
      drawMarks(parts, cellX, cellY, cellW, cellH, marks, item.levels || 0);
    }
  }
  // Contorno único + líneas internas (sin doble borde entre profundidades).
  parts.push(
    `<rect x="${gridX}" y="${gridY}" width="${item.gridW}" height="${item.gridH}" fill="none" stroke="${stroke}" stroke-width="${strokeW}"/>`,
  );
  for (let row = 1; row < rows; row += 1) {
    const ly = gridY + row * cellH;
    parts.push(`<line x1="${gridX}" y1="${ly}" x2="${gridX + item.gridW}" y2="${ly}" stroke="${stroke}" stroke-width="${strokeW}"/>`);
  }
  for (let column = 1; column < cols; column += 1) {
    const lx = gridX + column * cellW;
    parts.push(`<line x1="${lx}" y1="${gridY}" x2="${lx}" y2="${gridY + item.gridH}" stroke="${stroke}" stroke-width="${strokeW}"/>`);
  }
  parts.push(text(labelX, labelY, `${item.prefix || ""}${token}`, { anchor: labelAnchor }));
}

function drawItem(parts, item, x, y, occupancy) {
  if (item.kind === "note") {
    parts.push(text(x + item.w / 2, y + item.h / 2, item.text));
    return;
  }
  if (item.kind === "section") {
    const sectionType = item.sectionType || "pasillo";
    if (sectionType === "division") {
      if (item.vertical) {
        parts.push(`<rect x="${x}" y="${y}" width="1" height="${item.h}" fill="${LINE}"/>`);
      } else {
        parts.push(`<rect x="${x}" y="${y}" width="${item.w}" height="1" fill="${LINE}"/>`);
      }
      return;
    }
    const fill = sectionType === "tunel" ? "#e2e8f0" : AISLE_FILL;
    const dash = sectionType === "tunel" ? "4 4" : "8 6";
    const strokeW = sectionType === "tunel" ? 1 : 2;
    parts.push(`<rect x="${x}" y="${y}" width="${item.w}" height="${item.h}" fill="${fill}"/>`);
    if (item.vertical) {
      parts.push(`<line x1="${x + 1}" y1="${y}" x2="${x + 1}" y2="${y + item.h}" stroke="${LINE}" stroke-width="${strokeW}" stroke-dasharray="${dash}"/>`);
      parts.push(`<line x1="${x + item.w - 1}" y1="${y}" x2="${x + item.w - 1}" y2="${y + item.h}" stroke="${LINE}" stroke-width="${strokeW}" stroke-dasharray="${dash}"/>`);
      const cx = x + item.w / 2;
      const cy = y + item.h / 2;
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" fill="${LABEL}" transform="rotate(90 ${cx} ${cy})">${escapeXml(item.label)}</text>`,
      );
      return;
    }
    parts.push(`<line x1="${x}" y1="${y + 1}" x2="${x + item.w}" y2="${y + 1}" stroke="${LINE}" stroke-width="${strokeW}" stroke-dasharray="${dash}"/>`);
    parts.push(`<line x1="${x}" y1="${y + item.h - 1}" x2="${x + item.w}" y2="${y + item.h - 1}" stroke="${LINE}" stroke-width="${strokeW}" stroke-dasharray="${dash}"/>`);
    parts.push(text(x + item.w / 2, y + item.h / 2, item.label, { size: 15 }));
    return;
  }
  if (item.kind === "floor") {
    if (item.hidden || !(item.places || []).length) return;
    const places = item.places || [];
    const across = item.across || floorAcrossOf(item.block) || 3;
    const groups = chunkAislePlaces(places, across);
    const showKpi = groups.length > 0;
    // item.hall ya viene del measure (vecinos); no pasar blocks=null.
    const kpiTotal = showKpi
      ? (() => {
          const kpis = emptyOccupancyKpis();
          const hall = item.hall || "";
          places.forEach((place) => {
            (occupancy?.[slotKey(hall, "", place)] || []).forEach((row) =>
              accumulateOccupancyKpi(kpis, row),
            );
          });
          return kpis.total;
        })()
      : 0;
    const kpiGap = showKpi ? AISLE_POS_GAP : 0;
    const cellStroke = `stroke="${PLACEHOLDER}" stroke-width="1.5" stroke-dasharray="4 3"`;
    const aisleVertical = Boolean(item.vertical);
    const translucent = Boolean(item.overlap);
    const drawGroupCell = (chunk, cellX, cellY) => {
      const boxSize = aisleGroupBoxSize({
        svg: true,
        aisleVertical,
        across,
        count: chunk.length,
      });
      if (translucent) parts.push(`<g opacity="0.55">`);
      parts.push(`<rect x="${cellX}" y="${cellY}" width="${boxSize.w}" height="${boxSize.h}" fill="#ffffff" ${cellStroke}/>`);
      const markW = boxSize.markW || boxSize.dot;
      const markH = boxSize.markH || boxSize.dot;
      const originX = cellX + boxSize.pad;
      const originY = cellY + boxSize.pad;
      chunk.forEach((place, index) => {
        const marks = occupancy[slotKey(item.hall || "", "", place)] || [];
        const mark = marks[0];
        const step = index * ((aisleVertical ? markW : markH) + boxSize.gap);
        const dotX = aisleVertical ? originX + step : originX;
        const dotY = aisleVertical ? originY : originY + step;
        if (mark) {
          parts.push(
            `<rect x="${dotX}" y="${dotY}" width="${markW}" height="${markH}" fill="${markFill(mark)}"/>`,
          );
          if (mark.is_picking) {
            drawPickingCheck(parts, dotX, dotY, Math.min(markW, markH));
          }
        } else {
          parts.push(
            `<rect x="${dotX}" y="${dotY}" width="${markW}" height="${markH}" fill="none" stroke="${PLACEHOLDER}" stroke-width="1.25"/>`,
          );
        }
      });
      if (translucent) parts.push(`</g>`);
      return boxSize;
    };
    if (!groups.length) {
      if (item.vertical) {
        const cx = x + item.w / 2;
        const cy = y + item.h / 2;
        parts.push(
          `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="600" fill="${LABEL}" transform="rotate(90 ${cx} ${cy})">${escapeXml(item.label)}</text>`,
        );
      } else {
        parts.push(text(x + item.w / 2, y + item.h / 2, item.label, { size: 12 }));
      }
      return;
    }
    if (item.vertical) {
      // Contador arriba, fuera de flujo (no mueve las celdas).
      let cursorY = y;
      let firstBox = null;
      groups.forEach((chunk, groupIndex) => {
        const box = drawGroupCell(chunk, x, cursorY);
        if (!firstBox) firstBox = box;
        cursorY += box.h + (groupIndex < groups.length - 1 ? AISLE_POS_GAP : 0);
      });
      if (showKpi && firstBox) {
        drawHileraKpiTop(parts, kpiTotal, x, y - KPI_H - kpiGap, firstBox.w);
      }
      return;
    }
    // Horizontal: contador a la izquierda, fuera de flujo.
    let cursorX = x;
    let lastBox = null;
    groups.forEach((chunk, groupIndex) => {
      lastBox = drawGroupCell(chunk, cursorX, y);
      cursorX += lastBox.w + (groupIndex < groups.length - 1 ? AISLE_POS_GAP : 0);
    });
    if (showKpi && lastBox) {
      drawHileraKpiSide(parts, kpiTotal, x - KPI_SIDE_W - kpiGap, y, lastBox.h);
    }
    return;
  }

  if (item.horizontal) {
    let cursor = x;
    item.tokens.forEach((token, index) => {
      if (index > 0) cursor += RACK_GAP;
      drawRackUnit(parts, cursor, y, item, token, occupancy);
      cursor += item.gridW;
    });
    return;
  }

  let cursor = y;
  item.tokens.forEach((token, index) => {
    if (index > 0) cursor += STACK_GAP;
    drawRackUnit(parts, x, cursor, item, token, occupancy);
    cursor += item.gridH;
  });
}

function drawDoor(parts, door, frameX, frameY, frameW, frameH) {
  const wall = door.wall;
  const anchor = door.anchor;
  const label = doorDisplayName(door);
  const dash = `stroke="${DOOR}" stroke-width="2.5" stroke-dasharray="6 4"`;
  const solid = `stroke="${DOOR}" stroke-width="3.5" stroke-linecap="square"`;
  const labelLen = Math.min(Math.max(label.length * 7.2, 48), 110);
  const thick = 14;
  if (wall === "top" || wall === "bottom") {
    const gap = Math.max(72, frameW * DOOR_SPAN);
    const along = doorAlongRatio(anchor, gap / frameW);
    const x = frameX + Math.min(frameW - gap, Math.max(0, frameW * along));
    const y = wall === "top" ? frameY : frameY + frameH;
    const ty = y;
    const pad = 8;
    const mid = x + gap / 2;
    const half = labelLen / 2;
    const badgeH = 18;
    parts.push(`<rect x="${x}" y="${y - thick}" width="${gap}" height="${thick * 2}" fill="#ffffff"/>`);
    parts.push(
      `<rect x="${mid - half - 6}" y="${ty - badgeH / 2}" width="${labelLen + 12}" height="${badgeH}" rx="4" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1"/>`,
    );
    parts.push(`<line x1="${x}" y1="${ty - thick}" x2="${x}" y2="${ty + thick}" ${solid}/>`);
    parts.push(`<line x1="${x + gap}" y1="${ty - thick}" x2="${x + gap}" y2="${ty + thick}" ${solid}/>`);
    parts.push(`<line x1="${x + pad}" y1="${ty - 3.5}" x2="${mid - half - 4}" y2="${ty - 3.5}" ${dash}/>`);
    parts.push(`<line x1="${x + pad}" y1="${ty + 3.5}" x2="${mid - half - 4}" y2="${ty + 3.5}" ${dash}/>`);
    parts.push(`<line x1="${mid + half + 4}" y1="${ty - 3.5}" x2="${x + gap - pad}" y2="${ty - 3.5}" ${dash}/>`);
    parts.push(`<line x1="${mid + half + 4}" y1="${ty + 3.5}" x2="${x + gap - pad}" y2="${ty + 3.5}" ${dash}/>`);
    parts.push(
      `<text x="${mid}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="0.04em" fill="${DOOR}">${escapeXml(label)}</text>`,
    );
    return;
  }
  const gap = Math.max(72, frameH * DOOR_SPAN);
  const along = doorAlongRatio(anchor, gap / frameH);
  const y = frameY + Math.min(frameH - gap, Math.max(0, frameH * along));
  const x = wall === "left" ? frameX : frameX + frameW;
  const cx = x;
  const pad = 8;
  const mid = y + gap / 2;
  const half = labelLen / 2;
  const badgeW = 18;
  parts.push(`<rect x="${x - thick}" y="${y}" width="${thick * 2}" height="${gap}" fill="#ffffff"/>`);
  parts.push(
    `<rect x="${cx - badgeW / 2}" y="${mid - half - 6}" width="${badgeW}" height="${labelLen + 12}" rx="4" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1"/>`,
  );
  parts.push(`<line x1="${cx - thick}" y1="${y}" x2="${cx + thick}" y2="${y}" ${solid}/>`);
  parts.push(`<line x1="${cx - thick}" y1="${y + gap}" x2="${cx + thick}" y2="${y + gap}" ${solid}/>`);
  parts.push(`<line x1="${cx - 3.5}" y1="${y + pad}" x2="${cx - 3.5}" y2="${mid - half - 4}" ${dash}/>`);
  parts.push(`<line x1="${cx + 3.5}" y1="${y + pad}" x2="${cx + 3.5}" y2="${mid - half - 4}" ${dash}/>`);
  parts.push(`<line x1="${cx - 3.5}" y1="${mid + half + 4}" x2="${cx - 3.5}" y2="${y + gap - pad}" ${dash}/>`);
  parts.push(`<line x1="${cx + 3.5}" y1="${mid + half + 4}" x2="${cx + 3.5}" y2="${y + gap - pad}" ${dash}/>`);
  parts.push(
    `<text x="${cx}" y="${mid}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="0.04em" fill="${DOOR}" transform="rotate(90 ${cx} ${mid})">${escapeXml(label)}</text>`,
  );
}

function drawDepthAxisSide(parts, x, gridY, gridH, places) {
  if (!places.length) return;
  const step = gridH / places.length;
  places.forEach((place, index) => {
    parts.push(text(x + AXIS_W / 2, gridY + index * step + step / 2, place, { size: 11 }));
  });
}

function drawDepthAxisTop(parts, x, y, places) {
  if (!places.length) return;
  places.forEach((place, index) => {
    parts.push(text(x + index * CELL + CELL / 2, y + AXIS_TOP / 2, place, { size: 11 }));
  });
}

function drawHileraKpiTop(parts, value, gridX, y, gridW) {
  const label = String(Number(value) || 0);
  const bw = Math.max(KPI_MIN_W, label.length * 7.5 + 14);
  const bx = gridX + Math.max(0, (gridW - bw) / 2);
  const by = y;
  const rx = KPI_H / 2;
  parts.push(
    `<rect x="${bx}" y="${by}" width="${bw}" height="${KPI_H}" rx="${rx}" ry="${rx}" fill="${KPI_FILL}" stroke="${KPI_STROKE}" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${bx + bw / 2}" y="${by + KPI_H / 2}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700" fill="${KPI_INK}">${escapeXml(label)}</text>`,
  );
}

/** Contador a la izquierda (solo hilera H): girado -90° (pie hacia la hilera). */
function drawHileraKpiSide(parts, value, x, gridY, gridH) {
  const label = String(Number(value) || 0);
  const bw = Math.max(KPI_MIN_W, label.length * 7.5 + 14);
  const bh = KPI_H;
  const cx = x + KPI_SIDE_W / 2;
  const cy = gridY + gridH / 2;
  const rx = bh / 2;
  parts.push(`<g transform="rotate(-90 ${cx} ${cy})">`);
  parts.push(
    `<rect x="${cx - bw / 2}" y="${cy - bh / 2}" width="${bw}" height="${bh}" rx="${rx}" ry="${rx}" fill="${KPI_FILL}" stroke="${KPI_STROKE}" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700" fill="${KPI_INK}">${escapeXml(label)}</text>`,
  );
  parts.push("</g>");
}

function sideItemDrawnH(item) {
  if ((item.kind === "section" || item.kind === "floor") && item.vertical) return item.h;
  return sideItemTop(item) + item.h;
}

/** Alto de apilado en columna V: sección incluye hueco KPI (como contentW en H). */
function sideItemStackH(item) {
  if (item.kind === "section" && item.vertical) {
    return (item.kpiTopPad || 0) + item.h;
  }
  return sideItemDrawnH(item);
}

function drawSideColumn(parts, column, x, y, sectionH, occupancy, layout, blocks) {
  const items = column.items || [];
  const areaW = Math.max(column.w, column.drawW || column.w);
  const slack = Math.max(0, areaW - column.w);
  const rowAligns = items.map((item) => rowAlignOf(layout, item.block));
  const allCenter = items.length > 0 && rowAligns.every((align) => align === "center");
  const allEnd = items.length > 0 && rowAligns.every((align) => align === "end");
  const firstEnd = rowAligns.findIndex((align) => align === "end");
  let packDx = 0;
  let slackAt = -1;
  if (allEnd) packDx = slack;
  else if (allCenter) packDx = Math.round(slack / 2);
  else if (firstEnd > 0) slackAt = firstEnd;
  else if (firstEnd === 0) packDx = slack;

  // Alto de pista = max(contenido, alto del tramo); solapar no cuenta.
  const contentH = Math.max(
    0,
    ...items
      .filter((item) => !(item.kind === "floor" && item.overlap))
      .map((item) => sideItemStackH(item)),
  );
  const trackH = Math.max(contentH, sectionH);

  const stripBlocks = items.map((entry) => entry.block);
  let cursorX = x + packDx;
  let laid = 0;
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (item.kind === "floor" && item.overlap) {
      index += 1;
      continue;
    }
    const mid = items[index + 1];
    const right = items[index + 2];
    if (
      item.kind === "section" &&
      item.vertical &&
      mid?.kind === "floor" &&
      mid.overlap &&
      right?.kind === "section" &&
      right.vertical &&
      floorSpansTwoSections(stripBlocks, mid.block)
    ) {
      if (index === slackAt) cursorX += slack;
      if (laid > 0) cursorX += RACK_GAP;
      // Cuerpo sin contador; el grupo suma el hueco KPI (Arriba/Medio/Abajo igual).
      const kpiPad = Math.max(item.kpiTopPad || 0, right.kpiTopPad || 0);
      const bodyH = Math.max(
        item.overlayAlong || 0,
        right.overlayAlong || 0,
        item.h,
        right.h,
      );
      const groupH = bodyH + kpiPad;
      const floorAlign = stackAlignOf(layout, mid.block);
      const groupDy = rowAlignOffset(floorAlign, trackH - groupH);
      const startX = cursorX;
      const leftDy = rowAlignOffset(stackAlignOf(layout, item.block), bodyH - item.h);
      drawItem(parts, item, cursorX, y + groupDy + kpiPad + leftDy, occupancy);
      cursorX += item.w + RACK_GAP;
      const rightDy = rowAlignOffset(stackAlignOf(layout, right.block), bodyH - right.h);
      drawItem(parts, right, cursorX, y + groupDy + kpiPad + rightDy, occupancy);
      cursorX += right.w;
      const spanW = cursorX - startX;
      // Absolute: shell = overlayAlong/pista (no depende de stretch_full).
      drawFloorOverlayInBox(
        parts,
        mid,
        startX,
        y + groupDy + kpiPad,
        bodyH,
        spanW,
        occupancy,
        { vertical: true, align: floorAlign },
      );
      laid += 1;
      index += 3;
      continue;
    }
    if (index === slackAt) cursorX += slack;
    if (laid > 0) cursorX += RACK_GAP;
    laid += 1;
    const stackH = sideItemStackH(item);
    const itemDy = rowAlignOffset(stackAlignOf(layout, item.block), trackH - stackH);
    if ((item.kind === "section" || item.kind === "floor") && item.vertical) {
      // Sección V: hueco KPI arriba (mismo ancla en Arriba/Medio/Abajo).
      const kpiPad = item.kind === "section" ? item.kpiTopPad || 0 : 0;
      drawItem(parts, item, cursorX, y + itemDy + kpiPad, occupancy);
      if (item.kind === "section") {
        floorsOverlappingSection(stripBlocks, item.block).forEach((floorBlock) => {
          const floorItem = items.find((entry) => entry.block === floorBlock);
          if (!floorItem) return;
          const floorAlign = stackAlignOf(layout, floorBlock);
          const overlayH = item.overlayAlong || item.h;
          const overlayStackH = overlayH + kpiPad;
          const overlayDy = rowAlignOffset(floorAlign, trackH - overlayStackH);
          drawFloorOverlayInBox(
            parts,
            floorItem,
            cursorX,
            y + overlayDy + kpiPad,
            overlayH,
            item.w,
            occupancy,
            { vertical: true, align: floorAlign },
          );
        });
      }
      cursorX += item.w;
      index += 1;
      continue;
    }
    const kpiTop = sideItemKpiTop(item);
    const topAxis = sideItemTopAxis(item);
    let bodyY = y + itemDy;
    if (kpiTop && item.kind === "rack") {
      const kpis = blockOccupancyKpis(item.block, blocks, occupancy);
      const labelLeft = item.labelSide === "above";
      const gridX = cursorX + (labelLeft ? LABEL_W + LABEL_GAP : 0);
      drawHileraKpiTop(parts, kpis.total, gridX, bodyY, item.gridW || item.w);
      bodyY += kpiTop;
    }
    if (topAxis) {
      const places = orderedDepthPlaces(item.places || [], depthAxisOf(layout, item.block));
      drawDepthAxisTop(parts, cursorX, bodyY, places);
      bodyY += topAxis;
    }
    drawItem(parts, item, cursorX, bodyY, occupancy);
    cursorX += item.w;
    index += 1;
  }
}

/**
 * Piso solapado en SVG: cabe en la caja del pasillo/pista (no se sale del marco).
 * scale uniforme si el largo natural supera boxAlong.
 */
function drawFloorOverlayInBox(
  parts,
  floorItem,
  boxX,
  boxY,
  boxAlong,
  boxCross,
  occupancy,
  { vertical = false, align = "start" } = {},
) {
  if (!floorItem || floorItem.hidden) return;
  const naturalAlong = vertical ? floorItem.h : floorItem.w;
  const scale =
    naturalAlong > boxAlong && boxAlong > 0 ? boxAlong / naturalAlong : 1;
  const drawnW = floorItem.w * scale;
  const drawnH = floorItem.h * scale;
  let ox;
  let oy;
  if (vertical) {
    ox = boxX + Math.round((boxCross - drawnW) / 2);
    oy = boxY + rowAlignOffset(align, boxAlong - drawnH);
  } else {
    ox = boxX + rowAlignOffset(align, boxAlong - drawnW);
    oy = boxY + Math.round((boxCross - drawnH) / 2);
  }
  if (scale === 1) {
    drawItem(parts, floorItem, ox, oy, occupancy);
    return;
  }
  parts.push(`<g transform="translate(${ox} ${oy}) scale(${scale})">`);
  drawItem(parts, floorItem, 0, 0, occupancy);
  parts.push(`</g>`);
}

function drawHorizontalRows(parts, rows, x, y, trackW, occupancy, layout, blocks) {
  const list = rows || [];
  const stripBlocks = list.map((row) => row.block);
  let midY = y;
  let laid = 0;
  let index = 0;
  while (index < list.length) {
    const row = list[index];
    if (row.item.kind === "floor" && row.item.overlap) {
      index += 1;
      continue;
    }
    const mid = list[index + 1];
    const bottom = list[index + 2];
    if (
      row.item.kind === "section" &&
      !row.item.vertical &&
      mid?.item.kind === "floor" &&
      mid.item.overlap &&
      bottom?.item.kind === "section" &&
      !bottom.item.vertical &&
      floorSpansTwoSections(stripBlocks, mid.block)
    ) {
      if (laid > 0) midY += ROW_GAP;
      const floorAlign = rowAlignOf(layout, mid.block);
      const startY = midY;
      const drawSectionRow = (entry) => {
        const contentW = entry.contentW || entry.item.w;
        // Alineación propia de la sección dentro de la pista (100% off = fit).
        let rowX = x + rowAlignOffset(rowAlignOf(layout, entry.block), trackW - contentW);
        // Hueco del contador de hilera (tope 100% no lo incluye).
        rowX += entry.kpiSideW || 0;
        drawItem(parts, entry.item, rowX, midY, occupancy);
        midY += entry.h;
      };
      drawSectionRow(row);
      midY += ROW_GAP;
      drawSectionRow(bottom);
      const spanH = midY - startY;
      // Absolute: shell = pista (no depende de stretch_full).
      drawFloorOverlayInBox(
        parts,
        mid.item,
        x,
        startY,
        trackW,
        spanH,
        occupancy,
        { vertical: false, align: floorAlign },
      );
      laid += 1;
      index += 3;
      continue;
    }
    if (laid > 0) midY += ROW_GAP;
    laid += 1;
    const align = rowAlignOf(layout, row.block);
    const contentW = row.contentW || (row.kpiSideW || 0) + row.axisW + row.item.w;
    const dx = rowAlignOffset(align, trackW - contentW);
    let rowX = x + dx;
    const labelAbove = row.block.label_side === "above";
    const gridH = row.item.gridH || row.item.h;
    const gridY = labelAbove ? midY + LABEL_H + LABEL_GAP : midY;
    if (row.kpiSideW && row.item.kind === "rack") {
      const kpis = blockOccupancyKpis(row.block, blocks, occupancy);
      drawHileraKpiSide(parts, kpis.total, rowX, gridY, gridH);
      rowX += row.kpiSideW;
    } else if (row.kpiSideW && row.item.kind === "section") {
      // Misma sangría que la hilera; el 100% no cubre el contador.
      rowX += row.kpiSideW;
    }
    if (row.axisW) {
      const places = orderedDepthPlaces(depthCodesOf(row.block), depthAxisOf(layout, row.block));
      drawDepthAxisSide(parts, rowX, gridY, gridH, places);
      rowX += row.axisW;
    }
    let bodyY = midY;
    if (row.axisTopH) {
      const places = orderedDepthPlaces(depthCodesOf(row.block), depthAxisOf(layout, row.block));
      drawDepthAxisTop(parts, rowX, midY, places);
      bodyY = midY + row.axisTopH;
    }
    drawItem(parts, row.item, rowX, bodyY, occupancy);
    if (row.item.kind === "section") {
      floorsOverlappingSection(stripBlocks, row.block).forEach((floorBlock) => {
        const floorRow = list.find((entry) => entry.block === floorBlock);
        if (!floorRow) return;
        const floorAlign = rowAlignOf(layout, floorBlock);
        const overlayW = Math.min(row.item.overlayAlong || row.item.w, trackW);
        const overlayDx = rowAlignOffset(floorAlign, trackW - overlayW);
        drawFloorOverlayInBox(
          parts,
          floorRow.item,
          x + overlayDx,
          bodyY,
          overlayW,
          row.item.h,
          occupancy,
          { vertical: false, align: floorAlign },
        );
      });
    }
    midY += row.h;
    index += 1;
  }
  return midY;
}

export function buildCavaPlanSvg({ name, code, blocks, nomenclature, occupancy = {}, planLayout = null }) {
  const layout = normalizePlanLayout(planLayout, blocks);
  const masterAxis = defaultOrientationOf(layout, blocks);
  const rackPrefix = nomenclature?.rack_prefix || "";
  const aislePrefix = nomenclature?.aisle_prefix || "";
  const sections = planSections(blocks, { axis: masterAxis }).map((section) =>
    measureSection(section, blocks, rackPrefix, aislePrefix, layout),
  );
  if (!sections.length) return null;

  const { contentWidth, contentMinH } = expandSectionsToModalWidth(sections, masterAxis);
  const contentOriginX = PAD + FRAME;
  const frameInnerLeft = contentOriginX;
  const frameInnerRight = contentOriginX + contentWidth;
  const title = cavaTitleOf(name, code);
  const total = countSlots(blocks, { planLayout: layout });
  const cavaKpis = cavaOccupancyKpis(occupancy, { blocks, planLayout: layout });
  const shownTotal = cavaKpis.total || total;
  const parts = [];
  let y = PAD + HEADER + FRAME;
  const frameX = frameInnerLeft - FRAME;
  const frameTop = y - FRAME;
  let contentBottom = y;

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) y += CROSS_ORIENTATION_GAP;
    const x = contentOriginX;

    if (section.axis === "vertical") {
      let cursorY = y;
      const bandGap = CROSS_ORIENTATION_GAP;
      if (section.before?.h) {
        drawHorizontalRows(
          parts,
          section.before.middleRows,
          x,
          cursorY,
          contentWidth,
          occupancy,
          layout,
          blocks,
        );
        cursorY += section.before.h + (section.main?.h || section.after?.h ? bandGap : 0);
      }
      const mainH = section.main?.drawH || section.main?.h || 0;
      if (mainH) {
        drawSideColumn(parts, section.main, x, cursorY, mainH, occupancy, layout, blocks);
        cursorY += mainH;
      }
      if (section.after?.h) {
        cursorY += mainH || section.before?.h ? bandGap : 0;
        drawHorizontalRows(
          parts,
          section.after.middleRows,
          x,
          cursorY,
          contentWidth,
          occupancy,
          layout,
          blocks,
        );
        cursorY += section.after.h;
      }
      y += section.h;
      contentBottom = y;
      return;
    }

    let cursorX = x;
    const beforeW = section.before.drawW || section.before.w || 0;
    const afterW = section.after.drawW || section.after.w || 0;
    const mainW = section.main?.w || 0;
    const sideGap = CROSS_ORIENTATION_GAP;
    if (beforeW) {
      drawSideColumn(parts, section.before, cursorX, y, section.h, occupancy, layout, blocks);
      cursorX += beforeW;
    }
    if (mainW) {
      if (beforeW) cursorX += sideGap;
      drawHorizontalRows(
        parts,
        section.main.middleRows,
        cursorX,
        y,
        mainW,
        occupancy,
        layout,
        blocks,
      );
      cursorX += mainW;
    }
    if (afterW) {
      if (beforeW || mainW) cursorX += sideGap;
      drawSideColumn(parts, section.after, cursorX, y, section.h, occupancy, layout, blocks);
    }
    y += section.h;
    contentBottom = y;
  });

  contentBottom = Math.max(contentBottom, frameTop + contentMinH);
  const frameY = frameTop;
  const frameW = frameInnerRight - frameInnerLeft + FRAME * 2;
  const frameH = Math.max(contentBottom - frameTop + FRAME, PLAN_VIEW_FRAME_MIN);
  parts.unshift(
    `<rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
  );
  layout.doors.forEach((door) => {
    drawDoor(parts, door, frameX, frameY, frameW, frameH);
  });

  const width = frameW + PAD * 2;
  const height = frameY + frameH + PAD;
  const body = parts.join("");
  const legendRows = [
    ["#10b981", "Libre", cavaKpis.libre],
    ["#f97316", "Asignado", cavaKpis.asignado],
    ["#ef4444", "Ocupado", cavaKpis.ocupado],
    ["#94a3b8", "Inactivo", cavaKpis.inactivo],
    ["#0ea5e9", "Picking", cavaKpis.picking],
    ["#f59e0b", "Push", cavaKpis.push],
  ];
  const legendStep = Math.max(96, Math.floor((Math.max(width, 720) - PAD * 2) / legendRows.length));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${PAD}" y="${PAD + 8}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="${TITLE}">${escapeXml(title)}</text>
  <text x="${PAD}" y="${PAD + 28}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" fill="${TITLE}">${shownTotal} ubicaciones</text>
  ${legendRows
    .map(([color, label, count], index) => {
      const legendX = PAD + index * legendStep;
      return `<rect x="${legendX}" y="${PAD + 38}" width="8" height="8" fill="${color}"/><text x="${legendX + 14}" y="${PAD + 46}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="${LABEL}">${label} ${count}</text>`;
    })
    .join("")}
  ${body}
</svg>`;

  return { svg, width, height, title, filename: fileNameOf(title) };
}

function loadSvgImage(plan) {
  const blob = new Blob([plan.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

export async function downloadCavaPlan(plan) {
  const { image, url } = await loadSvgImage(plan);
  try {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = plan.width * scale;
    canvas.height = plan.height * scale;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("png");
    const fileUrl = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = plan.filename;
    link.click();
    URL.revokeObjectURL(fileUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function openCavaPlanTab(plan) {
  const payload = JSON.stringify(plan).replace(/</g, "\\u003c");
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeXml(plan.title)}</title>
  <style>
    html, body { height: 100%; }
    body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; flex-direction: column; }
    header { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
    button { height: 32px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #334155; font: inherit; font-size: 13px; cursor: pointer; }
    button:hover { background: #f8fafc; }
    #level { min-width: 3.5rem; font-size: 13px; color: #64748b; }
    main { flex: 1; min-height: 0; padding: 24px; overflow: auto; display: flex; justify-content: center; align-items: flex-start; }
    #stage {
      width: max-content;
      max-width: none;
      background: #fff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    }
    #stage svg { display: block; }
  </style>
</head>
<body>
  <header>
    <button type="button" id="out">Alejar</button>
    <button type="button" id="in">Acercar</button>
    <button type="button" id="fit">Ajustar</button>
    <span id="level">100%</span>
    <button type="button" id="dl">Descargar</button>
  </header>
  <main id="viewport"><div id="stage"></div></main>
  <script id="plan" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("plan").textContent);
    const viewport = document.getElementById("viewport");
    const stage = document.getElementById("stage");
    const maxWidth = ${PLAN_VIEW_MAX_WIDTH};
    stage.innerHTML = data.svg.replace(/^<\\?xml[^>]*>\\s*/, "");
    const drawing = stage.querySelector("svg");
    let zoom = 1;
    // Encajar en ancho Y alto: master V (estrecho) ya no se agranda solo por el ancho.
    function fitScale() {
      const style = window.getComputedStyle(viewport);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const availW = Math.max(120, Math.min(viewport.clientWidth - padX, maxWidth));
      const availH = Math.max(120, viewport.clientHeight - padY);
      return Math.min(availW / data.width, availH / data.height);
    }
    function apply() {
      const scale = fitScale() * zoom;
      drawing.style.width = Math.round(data.width * scale) + "px";
      drawing.style.height = Math.round(data.height * scale) + "px";
      document.getElementById("level").textContent = Math.round(zoom * 100) + "%";
    }
    function fit() {
      zoom = 1;
      apply();
    }
    document.getElementById("in").onclick = () => { zoom = Math.min(zoom * 1.25, 6); apply(); };
    document.getElementById("out").onclick = () => { zoom = Math.max(zoom / 1.25, 0.25); apply(); };
    document.getElementById("fit").onclick = fit;
    document.getElementById("dl").onclick = () => {
      const blob = new Blob([data.svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = data.width * scale;
        canvas.height = data.height * scale;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          const fileUrl = URL.createObjectURL(png);
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = data.filename;
          link.click();
          URL.revokeObjectURL(fileUrl);
          URL.revokeObjectURL(url);
        }, "image/png");
      };
      image.src = url;
    };
    window.addEventListener("resize", apply);
    fit();
  </script>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }
  opened.opener = null;
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
