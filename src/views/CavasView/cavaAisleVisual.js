/**
 * Geometría visual de posiciones de pasillo (modal + SVG zoom).
 * Mantener ambos lados alineados: un naranja = ancho de 3 verdes, alto fit.
 */
import { UI_CELL, SVG_CELL, UI_PIECE_GAP, SVG_PIECE_GAP } from "./cavaPlanSpacing";

export const AISLE_ACROSS = 3;
export const AISLE_DOT_UI = 10;
export const AISLE_DOT_GAP_UI = 1;
export const AISLE_BOX_PAD_UI = 3;
/** Margen del naranja al borde del pasillo (mismo en V y H). */
export const AISLE_BAND_PAD_UI = 4;

const SVG_SCALE = SVG_CELL / UI_CELL;

export const AISLE_DOT_SVG = Math.round(AISLE_DOT_UI * SVG_SCALE);
export const AISLE_DOT_GAP_SVG = Math.max(1, Math.round(AISLE_DOT_GAP_UI * SVG_SCALE));
export const AISLE_BOX_PAD_SVG = Math.max(2, Math.round(AISLE_BOX_PAD_UI * SVG_SCALE));
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
 * Pasillo vertical: 3 verdes en fila (ancho×3, alto fit).
 * Pasillo horizontal: 3 verdes en columna (alto×3, ancho fit).
 * `contentW/H` = área interna (sin padding); `w/h` = caja total con padding.
 */
export function aisleGroupBoxSize({ svg = false, aisleVertical = false } = {}) {
  const dot = svg ? AISLE_DOT_SVG : AISLE_DOT_UI;
  const gap = svg ? AISLE_DOT_GAP_SVG : AISLE_DOT_GAP_UI;
  const pad = svg ? AISLE_BOX_PAD_SVG : AISLE_BOX_PAD_UI;
  const across = AISLE_ACROSS * dot + Math.max(AISLE_ACROSS - 1, 0) * gap;
  const single = dot;
  if (aisleVertical) {
    return {
      contentW: across,
      contentH: single,
      w: across + pad * 2,
      h: single + pad * 2,
      dot,
      gap,
      pad,
      stack: "row",
    };
  }
  return {
    contentW: single,
    contentH: across,
    w: single + pad * 2,
    h: across + pad * 2,
    dot,
    gap,
    pad,
    stack: "col",
  };
}

/** Avance a lo largo: V → alto del grupo; H → ancho del grupo. */
export function aisleGroupSpan(groups, { aisleVertical = false, svg = false } = {}) {
  if (!groups?.length) return 0;
  const gap = svg ? AISLE_POS_GAP_SVG : AISLE_POS_GAP_UI;
  const box = aisleGroupBoxSize({ svg, aisleVertical });
  const along = aisleVertical ? box.h : box.w;
  return groups.length * along + Math.max(groups.length - 1, 0) * gap;
}

export { UI_CELL, SVG_CELL };
