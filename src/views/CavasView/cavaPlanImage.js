import {
  aisleDisplayName,
  aislePositionPlaces,
  blockOccupancyKpis,
  cavaOccupancyKpis,
  cavaTitleOf,
  countSlots,
  depthCodesOf,
  planSections,
  rackTokensOf,
  relatedRacksForAisle,
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
  AISLE_BAND_PAD_SVG,
  AISLE_DOT_SVG,
  AISLE_POS_GAP_SVG,
  aisleBandThickness,
  aisleGroupBoxSize,
  aisleGroupSpan,
  chunkAislePlaces,
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
const DIVIDER = 1;
const DIVIDER_GAP = PIECE_GAP;
const DIVIDER_FILL = "#000000";
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
const AISLE_DOT = AISLE_DOT_SVG;

function measureBlock(block, blocks, rackPrefix, aislePrefix, planLayout, scopeBlocks = null) {
  if (block.kind === "aisle") {
    const code = String(block.code || "").trim();
    const label = aisleDisplayName(code);
    const vertical = block.orientation === "vertical";
    const places = planLayout?.show_aisle_positions ? aislePositionPlaces(block) : [];
    const align = vertical ? stackAlignOf(planLayout, block) : rowAlignOf(planLayout, block);
    const scope = scopeBlocks || blocks;
    const related = relatedRacksForAisle(scope, block);
    const relatedMeasures = related.map((rack) => measureRack(rack, blocks, rackPrefix, planLayout));
    const groupBox = aisleGroupBoxSize({ svg: true, aisleVertical: vertical });
    const thin = places.length ? aisleBandThickness(groupBox, { svg: true, emptySize: AISLE }) : AISLE;
    if (vertical) {
      const relatedH = Math.max(
        128,
        ...relatedMeasures.map(
          (item) => item.h + (item.places?.length ? AXIS_TOP + AXIS_GAP : 0) + KPI_H + KPI_GAP,
        ),
        0,
      );
      return {
        kind: "aisle",
        vertical: true,
        w: thin,
        h: relatedH,
        label,
        block,
        places,
        hall: code,
        align,
      };
    }
    const relatedW = Math.max(
      192,
      ...relatedMeasures.map((item) => {
        const axisW = item.places?.length ? AXIS_W + AXIS_GAP : 0;
        const kpiW = item.horizontal ? KPI_SIDE_W + KPI_INNER_GAP : 0;
        return kpiW + axisW + item.w;
      }),
      0,
    );
    return {
      kind: "aisle",
      vertical: false,
      w: relatedW,
      h: thin,
      label,
      block,
      places,
      hall: code,
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
  let w = 0;
  let h = 0;
  items.forEach((item, index) => {
    if (index > 0) {
      const prev = items[index - 1];
      const contiguous = prev.kind === "rack" && item.kind === "rack";
      w += contiguous ? DIVIDER_GAP + DIVIDER + DIVIDER_GAP : RACK_GAP;
    }
    w += item.w;
    h = Math.max(h, item.h + sideItemTop(item));
  });
  // Pasillos verticales = altura de la columna (tope a tope con la hilera más alta).
  items.forEach((item) => {
    if (item.kind === "aisle" && item.vertical) item.h = h;
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

function finalizeHorizontalRows(middleRows) {
  const rackTrack = Math.max(
    0,
    ...middleRows.filter((row) => row.block.kind === "rack").map((row) => row.contentW),
  );
  middleRows.forEach((row) => {
    if (row.item.kind === "aisle" && !row.item.vertical && rackTrack > 0) {
      row.item.w = Math.max(row.item.w, rackTrack);
      row.contentW = row.axisW + row.item.w;
    }
  });
  const trackW = Math.max(rackTrack, ...middleRows.map((row) => row.contentW), 0);
  middleRows.forEach((row) => {
    row.w = trackW;
    row.dividerW = 0;
  });
  for (let index = 1; index < middleRows.length; index += 1) {
    const prev = middleRows[index - 1];
    const row = middleRows[index];
    if (prev.block.kind === "rack" && row.block.kind === "rack") {
      row.dividerW = Math.max(prev.contentW, row.contentW, rackTrack);
    }
  }
  let middleH = 0;
  middleRows.forEach((row, index) => {
    if (index > 0) {
      const prev = middleRows[index - 1];
      const contiguous = prev.block.kind === "rack" && row.block.kind === "rack";
      middleH += contiguous ? DIVIDER_GAP + DIVIDER + DIVIDER_GAP : ROW_GAP;
    }
    middleH += row.h;
  });
  return { middleRows, trackW, middleH, w: trackW, h: middleH };
}

function measureHorizontalBand(bandBlocks, blocks, rackPrefix, aislePrefix, planLayout) {
  const list = bandBlocks || [];
  const middleRows = list.map((block) =>
    measureMiddleRow(block, blocks, rackPrefix, aislePrefix, planLayout, list),
  );
  return finalizeHorizontalRows(middleRows);
}

function stretchVerticalAisles(column) {
  (column.items || []).forEach((item) => {
    if (item.kind === "aisle" && item.vertical) {
      item.h = column.h;
    }
  });
}

function measureSection(section, blocks, rackPrefix, aislePrefix, planLayout) {
  const axis = section.axis === "vertical" ? "vertical" : "horizontal";
  if (axis === "vertical") {
    const before = measureHorizontalBand(section.before, blocks, rackPrefix, aislePrefix, planLayout);
    const main = measureSideColumn(section.main, blocks, rackPrefix, aislePrefix, planLayout);
    stretchVerticalAisles(main);
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
  stretchVerticalAisles(before);
  const after = measureSideColumn(section.after, blocks, rackPrefix, aislePrefix, planLayout);
  stretchVerticalAisles(after);
  const main = measureHorizontalBand(section.main, blocks, rackPrefix, aislePrefix, planLayout);
  const h = Math.max(before.h, after.h, main.h, 0);
  [before, after].forEach((column) => {
    column.h = Math.max(column.h, h);
    stretchVerticalAisles(column);
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
        (section.main.items || []).forEach((item) => {
          if (item.kind === "aisle" && item.vertical) item.h = section.main.drawH;
        });
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
      parts.push(
        `<rect x="${mx}" y="${my}" width="${dot}" height="${dot}" fill="${markFill(mark)}"><title>Nivel ${mark.level} · ${escapeXml(markName(mark))}</title></rect>`,
      );
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
  const strokeW = 1.5;
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
  if (item.kind === "aisle") {
    parts.push(`<rect x="${x}" y="${y}" width="${item.w}" height="${item.h}" fill="${AISLE_FILL}"/>`);
    const places = item.places || [];
    const groups = chunkAislePlaces(places);
    const align = item.align || "start";
    const pad = AISLE_BAND_PAD_SVG;
    const showKpi = groups.length > 0;
    const kpiTotal = showKpi ? blockOccupancyKpis(item.block, null, occupancy).total : 0;
    const kpiGap = showKpi ? AISLE_POS_GAP : 0;
    const cellStroke = `stroke="${PLACEHOLDER}" stroke-width="1.5" stroke-dasharray="4 3"`;
    const aisleVertical = Boolean(item.vertical);
    const boxSize = aisleGroupBoxSize({ svg: true, aisleVertical });
    // Mismo margen en V y H (no centrar en un piso AISLE más ancho/alto).
    const crossX = x + pad;
    const crossY = y + pad;
    const drawGroupCell = (chunk, cellX, cellY) => {
      parts.push(`<rect x="${cellX}" y="${cellY}" width="${boxSize.w}" height="${boxSize.h}" fill="#ffffff" ${cellStroke}/>`);
      const innerX = cellX + boxSize.pad;
      const innerY = cellY + boxSize.pad;
      chunk.forEach((place, index) => {
        const marks = occupancy[slotKey(item.hall || "", "", place)] || [];
        const mark = marks[0];
        const step = index * (boxSize.dot + boxSize.gap);
        const dotX = aisleVertical ? innerX + step : innerX + (boxSize.contentW - boxSize.dot) / 2;
        const dotY = aisleVertical ? innerY + (boxSize.contentH - boxSize.dot) / 2 : innerY + step;
        if (mark) {
          parts.push(
            `<rect x="${dotX}" y="${dotY}" width="${boxSize.dot}" height="${boxSize.dot}" fill="${markFill(mark)}"/>`,
          );
        } else {
          parts.push(
            `<rect x="${dotX}" y="${dotY}" width="${boxSize.dot}" height="${boxSize.dot}" fill="none" stroke="${PLACEHOLDER}" stroke-width="1.25"/>`,
          );
        }
      });
      return boxSize;
    };
    if (item.vertical) {
      parts.push(`<line x1="${x + 1}" y1="${y}" x2="${x + 1}" y2="${y + item.h}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
      parts.push(`<line x1="${x + item.w - 1}" y1="${y}" x2="${x + item.w - 1}" y2="${y + item.h}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
      const cx = x + item.w / 2;
      const cy = y + item.h / 2;
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" fill="${LABEL}" transform="rotate(90 ${cx} ${cy})">${escapeXml(item.label)}</text>`,
      );
      const groupSpan = aisleGroupSpan(groups, { aisleVertical: true, svg: true });
      const kpiBlock = showKpi ? KPI_H + kpiGap : 0;
      let originY;
      if (align === "end") {
        originY = y + item.h - pad - groupSpan;
      } else if (align === "center") {
        originY = y + (item.h - groupSpan - kpiBlock) / 2;
      } else {
        originY = y + pad;
      }
      if (align === "end") {
        let cursorY = y + item.h - pad;
        groups.forEach((chunk, groupIndex) => {
          cursorY -= boxSize.h;
          drawGroupCell(chunk, crossX, cursorY);
          if (groupIndex < groups.length - 1) cursorY -= AISLE_POS_GAP;
        });
        if (showKpi) {
          drawHileraKpiTop(parts, kpiTotal, crossX, cursorY - kpiGap - KPI_H, boxSize.w);
        }
      } else {
        let cursorY = originY;
        groups.forEach((chunk, groupIndex) => {
          drawGroupCell(chunk, crossX, cursorY);
          cursorY += boxSize.h + (groupIndex < groups.length - 1 ? AISLE_POS_GAP : 0);
        });
        if (showKpi) {
          drawHileraKpiTop(parts, kpiTotal, crossX, cursorY + kpiGap, boxSize.w);
        }
      }
      return;
    }
    parts.push(`<line x1="${x}" y1="${y + 1}" x2="${x + item.w}" y2="${y + 1}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
    parts.push(`<line x1="${x}" y1="${y + item.h - 1}" x2="${x + item.w}" y2="${y + item.h - 1}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
    parts.push(text(x + item.w / 2, y + item.h / 2, item.label, { size: 15 }));
    const groupSpan = aisleGroupSpan(groups, { aisleVertical: false, svg: true });
    const kpiBlock = showKpi ? KPI_SIDE_W + kpiGap : 0;
    const gridY = crossY;
    if (align === "end") {
      let cursorX = x + item.w - pad;
      groups.forEach((chunk, groupIndex) => {
        cursorX -= boxSize.w;
        drawGroupCell(chunk, cursorX, gridY);
        if (groupIndex < groups.length - 1) cursorX -= AISLE_POS_GAP;
      });
      if (showKpi) {
        drawHileraKpiSide(parts, kpiTotal, cursorX - kpiGap - KPI_SIDE_W, gridY, boxSize.h);
      }
    } else {
      const originX =
        align === "center"
          ? x + (item.w - groupSpan - kpiBlock) / 2
          : x + pad;
      let cursorX = originX;
      groups.forEach((chunk, groupIndex) => {
        drawGroupCell(chunk, cursorX, gridY);
        cursorX += boxSize.w + (groupIndex < groups.length - 1 ? AISLE_POS_GAP : 0);
      });
      if (showKpi) {
        drawHileraKpiSide(parts, kpiTotal, cursorX + kpiGap, gridY, boxSize.h);
      }
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

function drawSideColumn(parts, column, x, y, sectionH, occupancy, layout, blocks) {
  const items = column.items || [];
  const areaW = Math.max(column.w, column.drawW || column.w);
  const slack = Math.max(0, areaW - column.w);
  const aligns = items.map((item) => rowAlignOf(layout, item.block));
  const allCenter = items.length > 0 && aligns.every((align) => align === "center");
  const allEnd = items.length > 0 && aligns.every((align) => align === "end");
  const firstEnd = aligns.findIndex((align) => align === "end");
  let packDx = 0;
  let slackAt = -1;
  if (allEnd) packDx = slack;
  else if (allCenter) packDx = Math.round(slack / 2);
  else if (firstEnd > 0) slackAt = firstEnd;
  else if (firstEnd === 0) packDx = slack;

  let cursorX = x + packDx;
  items.forEach((item, index) => {
    if (index === slackAt) cursorX += slack;
    if (index > 0) {
      const prev = items[index - 1];
      const contiguous = prev.kind === "rack" && item.kind === "rack";
      if (contiguous) {
        cursorX += DIVIDER_GAP;
        const dividerH = Math.max(prev.h + sideItemTop(prev), item.h + sideItemTop(item));
        parts.push(
          `<rect x="${cursorX}" y="${y}" width="${DIVIDER}" height="${dividerH}" fill="${DIVIDER_FILL}"/>`,
        );
        cursorX += DIVIDER + DIVIDER_GAP;
      } else {
        cursorX += RACK_GAP;
      }
    }
    if (item.kind === "aisle" && item.vertical) {
      drawItem(parts, { ...item, h: sectionH }, cursorX, y, occupancy);
      cursorX += item.w;
      return;
    }
    const kpiTop = sideItemKpiTop(item);
    const topAxis = sideItemTopAxis(item);
    const itemH = kpiTop + topAxis + item.h;
    const stackAlign = stackAlignOf(layout, item.block);
    const dy = rowAlignOffset(stackAlign, sectionH - itemH);
    let bodyY = y + dy;
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
  });
}

function drawHorizontalRows(parts, rows, x, y, trackW, occupancy, layout, blocks) {
  let midY = y;
  (rows || []).forEach((row, rowIndex) => {
    if (rowIndex > 0) {
      const prev = rows[rowIndex - 1];
      const contiguous = prev.block.kind === "rack" && row.block.kind === "rack";
      if (contiguous) {
        midY += DIVIDER_GAP;
        const dividerW = row.dividerW || Math.max(prev.contentW, row.contentW);
        const groupAlign =
          prev.contentW >= row.contentW
            ? rowAlignOf(layout, prev.block)
            : rowAlignOf(layout, row.block);
        const groupDx = rowAlignOffset(groupAlign, trackW - dividerW);
        parts.push(
          `<rect x="${x + groupDx}" y="${midY}" width="${dividerW}" height="${DIVIDER}" fill="${DIVIDER_FILL}"/>`,
        );
        midY += DIVIDER + DIVIDER_GAP;
      } else {
        midY += ROW_GAP;
      }
    }
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
    midY += row.h;
  });
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
  const showAislePositions = Boolean(layout.show_aisle_positions);
  const total = countSlots(blocks, { includeAislePositions: showAislePositions });
  const cavaKpis = cavaOccupancyKpis(occupancy, { includeAislePositions: showAislePositions });
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
  ];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${PAD}" y="${PAD + 8}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="${TITLE}">${escapeXml(title)}</text>
  <text x="${PAD}" y="${PAD + 28}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" fill="${TITLE}">${shownTotal} ubicaciones</text>
  ${legendRows
    .map(([color, label, count], index) => {
      const legendX = PAD + index * 118;
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
