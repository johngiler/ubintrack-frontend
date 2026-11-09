/**
 * Escala de huecos del plano (modal UI y SVG zoom/descarga).
 * Misma lógica en master H y V: lado = arriba/abajo.
 */

export const UI_CELL = 38;
export const UI_PIECE_GAP = 4;
export const UI_LABEL_GAP = 8;
/** Orientación opuesta (V↔H). No usar tamaño de pasillo. */
export const UI_CROSS_GAP = 24;
export const UI_AISLE_SIZE = 56;

export const SVG_CELL = 50;
const SVG_SCALE = SVG_CELL / UI_CELL;

export const SVG_PIECE_GAP = Math.round(UI_PIECE_GAP * SVG_SCALE);
export const SVG_LABEL_GAP = Math.round(UI_LABEL_GAP * SVG_SCALE);
export const SVG_CROSS_GAP = Math.round(UI_CROSS_GAP * SVG_SCALE);
/** Ancho/alto del pasillo dibujado (independiente del gap cruzado). */
export const SVG_AISLE_SIZE = 64;
