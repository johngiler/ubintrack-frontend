/**
 * Geometría visual de secciones y posiciones de piso (modal + SVG zoom).
 * Dimensión 1–2: cada marca = interior de una celda rack; el grupo crece.
 * Dimensión >2: las marcas se encogen para caber en el ancho de 2 a tamaño pleno.
 */
import { UI_CELL, SVG_CELL, UI_PIECE_GAP, SVG_PIECE_GAP, UI_AISLE_SIZE } from "./cavaPlanSpacing";

export const AISLE_ACROSS = 3;
/** Fallback; el tamaño real del punto sale de aisleGroupBoxSize. */
export const AISLE_DOT_UI = 10;
export const AISLE_DOT_GAP_UI = 1;
export const AISLE_BOX_PAD_UI = 2;
/** Borde 1px del naranja. */
export const AISLE_BOX_BORDER_UI = 1;
/** Margen del naranja al borde del pasillo (mismo en V y H). */
export const AISLE_BAND_PAD_UI = 4;

const SVG_SCALE = SVG_CELL / UI_CELL;

export const AISLE_DOT_SVG = Math.round(AISLE_DOT_UI * SVG_SCALE);
export const AISLE_DOT_GAP_SVG = Math.max(1, Math.round(AISLE_DOT_GAP_UI * SVG_SCALE));
export const AISLE_BOX_PAD_SVG = Math.max(2, Math.round(AISLE_BOX_PAD_UI * SVG_SCALE));
export const AISLE_BOX_BORDER_SVG = Math.max(1, Math.round(AISLE_BOX_BORDER_UI * SVG_SCALE));
export const AISLE_BAND_PAD_SVG = Math.max(2, Math.round(AISLE_BAND_PAD_UI * SVG_SCALE));

export const AISLE_POS_GAP_UI = UI_PIECE_GAP;
export const AISLE_POS_GAP_SVG = SVG_PIECE_GAP;

/**
 * Grosor del pasillo (eje fino) con posiciones: naranja + margen, sin piso AISLE
 * (el piso dejaba el naranja “sumido” con gutters asimétricos a la vista).
 */
export function aisleBandThickness(groupBox, { svg = false, emptySize } = {}) {
  if (!groupBox) return emptySize;
  const pad = svg ? AISLE_BAND_PAD_SVG : AISLE_BAND_PAD_UI;
  const alongThin = groupBox.stack === "row" ? groupBox.w : groupBox.h;
  return alongThin + pad * 2;
}

export function chunkAislePlaces(places, across = AISLE_ACROSS) {
  const chunks = [];
  for (let index = 0; index < (places || []).length; index += across) {
    chunks.push(places.slice(index, index + across));
  }
  return chunks;
}

/**
 * Dimensión ≤2: marca = interior de celda; el grupo crece.
 * Dimensión >2: marcas un poco más chicas (caben en ~2.3 a tamaño pleno).
 * El padre es fit-content de las marcas (`count` = marcas reales del lote).
 * Vertical: marcas en fila. Horizontal: marcas en columna.
 */
export function aisleGroupBoxSize({
  svg = false,
  aisleVertical = false,
  across: acrossCount = AISLE_ACROSS,
  count: countMarks,
} = {}) {
  const n = Math.max(1, Number(acrossCount) || AISLE_ACROSS);
  const marks = Math.max(1, Number(countMarks) || n);
  const cell = svg ? SVG_CELL : UI_CELL;
  const gap = svg ? AISLE_DOT_GAP_SVG : AISLE_DOT_GAP_UI;
  const pad = svg ? AISLE_BOX_PAD_SVG : AISLE_BOX_PAD_UI;
  const border = svg ? AISLE_BOX_BORDER_SVG : AISLE_BOX_BORDER_UI;
  const fullMark = Math.max(1, cell - border * 2 - pad * 2);
  // >2: un poco más grandes que caber en 2 (referencia 2.3 a tamaño pleno).
  const fitSlots = 2.3;
  const mark =
    n <= 2
      ? fullMark
      : Math.max(
          1,
          Math.floor(
            (fitSlots * fullMark + Math.max(fitSlots - 1, 0) * gap - (n - 1) * gap) / n,
          ),
        );
  const contentAcross = marks * mark + Math.max(marks - 1, 0) * gap;
  const boxAcross = contentAcross + pad * 2 + border * 2;
  const boxAlong = mark + pad * 2 + border * 2;
  if (aisleVertical) {
    return {
      contentW: contentAcross,
      contentH: mark,
      w: boxAcross,
      h: boxAlong,
      outerW: boxAcross,
      outerH: boxAlong,
      cell,
      markW: mark,
      markH: mark,
      dot: mark,
      gap,
      pad,
      border,
      across: n,
      count: marks,
      stack: "row",
    };
  }
  return {
    contentW: mark,
    contentH: contentAcross,
    w: boxAlong,
    h: boxAcross,
    outerW: boxAlong,
    outerH: boxAcross,
    cell,
    markW: mark,
    markH: mark,
    dot: mark,
    gap,
    pad,
    border,
    across: n,
    count: marks,
    stack: "col",
  };
}

/** Avance a lo largo: V → alto del grupo; H → ancho del grupo (lotes incompletos = fit). */
export function aisleGroupSpan(groups, { aisleVertical = false, svg = false, across = AISLE_ACROSS } = {}) {
  if (!groups?.length) return 0;
  const gap = svg ? AISLE_POS_GAP_SVG : AISLE_POS_GAP_UI;
  return groups.reduce((total, chunk, index) => {
    const box = aisleGroupBoxSize({
      svg,
      aisleVertical,
      across,
      count: chunk?.length || across,
    });
    const along = aisleVertical ? box.h : box.w;
    return total + along + (index < groups.length - 1 ? gap : 0);
  }, 0);
}

/** Grosor base por tipo de sección (eje fino). */
export function sectionBandBaseSize(sectionType, { emptySize = UI_AISLE_SIZE } = {}) {
  if (sectionType === "division") return 2;
  if (sectionType === "tunel") return Math.max(10, Math.round(emptySize * 0.55));
  return emptySize;
}

/**
 * Largo en el eje libre: crece con el vecino relacionado/contiguo;
 * si no hay, fit (0 = fit-content en UI).
 */
export function sectionAlongSpan(_block, { relatedSpan = 0 } = {}) {
  const related = Math.max(0, Number(relatedSpan) || 0);
  return related > 0 ? related : 0;
}

export { UI_CELL, SVG_CELL };
