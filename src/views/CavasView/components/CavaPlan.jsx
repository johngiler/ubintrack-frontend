"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Expand } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { Button, Form } from "@/components/ui/bootstrap";
import { getCavaOccupancy } from "@/services/storageService";
import {
  aisleDisplayName,
  aisleLabelForCode,
  blockIsPush,
  blockOccupancyKpis,
  cavaOccupancyKpis,
  cavaTitleOf,
  countSlots,
  depthCodesOf,
  floorAcrossOf,
  floorHallToken,
  floorOverlaps,
  floorOverlapSection,
  floorOverlapSections,
  floorPositionPlaces,
  floorShowsPositions,
  floorSpansTwoSections,
  floorsOverlappingSection,
  hileraLabel,
  isFloorBlock,
  isSectionBlock,
  normalizeSectionType,
  planSections,
  rackTokensOf,
  relatedRacksForAisle,
  sectionNeighbors,
  slotKey,
  suggestedAisleCode,
} from "../cavaPlan";
import { buildCavaPlanSvg, downloadCavaPlan, openCavaPlanTab } from "../cavaPlanImage";
import {
  DOOR_SPAN,
  doorAlongRatio,
  doorDisplayName,
  defaultOrientationOf,
  depthAxisOf,
  isTunnelToken,
  normalizePlanLayout,
  orderedDepthPlaces,
  planFrameMinStyle,
  rowAlignOf,
  stackAlignOf,
} from "../planLayout";
import {
  UI_AISLE_SIZE,
  UI_CELL,
  UI_CROSS_GAP,
  UI_LABEL_GAP,
  UI_PIECE_GAP,
} from "../cavaPlanSpacing";
import {
  AISLE_DOT_UI,
  AISLE_POS_GAP_UI,
  aisleGroupBoxSize,
  aisleGroupSpan,
  chunkAislePlaces,
  sectionAlongSpan,
  sectionBandBaseSize,
  sectionShellAlong,
} from "../cavaAisleVisual";
import CellPositionsMenu from "./CellPositionsMenu";
import HileraKpisMenu from "./HileraKpisMenu";

const CELL = UI_CELL;
const LABEL_W = 40;
const RACK_LABEL_H = 16; // text-xs
const PIECE_GAP = UI_PIECE_GAP;
const RACK_GAP = PIECE_GAP;
const LABEL_GAP = UI_LABEL_GAP;
const RACK_LABEL_GAP = LABEL_GAP;
const AXIS_GAP = LABEL_GAP;
const AISLE_SIZE = UI_AISLE_SIZE;
/** V↔H al lado y arriba/abajo: mismo valor (también en SVG zoom). */
const CROSS_ORIENTATION_GAP = UI_CROSS_GAP;
const HILERA_KPI_INNER_GAP = PIECE_GAP;
/** Ancho del badge KPI girado (w-6) en hilera horizontal. */
const HILERA_KPI_SIDE_W = 24;
/** Alto del badge KPI (h-6) encima de hilera vertical. */
const HILERA_KPI_TOP_H = 24;
const AXIS_SIDE = 16; // w-4
const AXIS_TOP = 14;
const MARK = 10;
const MARK_GAP = 1;
const FRAME_PAD = 22;

function justifyClass(align) {
  if (align === "center") return "justify-center";
  if (align === "end") return "justify-end";
  return "justify-start";
}

/**
 * Overlay de solapar (position absolute):
 * - Eje largo: alineación del piso (alto en V / ancho en H).
 * - Eje fino: siempre centrado en el pasillo (ancho en V / alto en H).
 */
function overlayPositionStyle(align, { vertical = false } = {}) {
  if (vertical) {
    // Centrado horizontal siempre; vertical según Arriba/Medio/Abajo.
    if (align === "center") {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    }
    if (align === "end") {
      return { left: "50%", bottom: 0, transform: "translateX(-50%)" };
    }
    return { left: "50%", top: 0, transform: "translateX(-50%)" };
  }
  // Centrado vertical siempre; horizontal según Izquierda/Medio/Derecha.
  if (align === "center") {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }
  if (align === "end") {
    return { right: 0, top: "50%", transform: "translateY(-50%)" };
  }
  return { left: 0, top: "50%", transform: "translateY(-50%)" };
}

/** Ancho de hilera horizontal (eje + racks). */
function horizontalRackSpan(block) {
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  if (!tokens.length || !places.length) return 0;
  return AXIS_SIDE + AXIS_GAP + tokens.length * CELL + Math.max(tokens.length - 1, 0) * PIECE_GAP;
}

/** Ancho total de la fila horizontal: KPI izquierdo + eje + racks. */
function horizontalRowSpan(block) {
  const rack = horizontalRackSpan(block);
  if (!rack) return 0;
  return HILERA_KPI_SIDE_W + HILERA_KPI_INNER_GAP + rack;
}

/** Tope 100% de sección horizontal: eje + racks, sin contador de hilera. */
function horizontalSectionSpan(block) {
  return horizontalRackSpan(block);
}

const HILERA_KPI_PAD = HILERA_KPI_SIDE_W + HILERA_KPI_INNER_GAP;

/** Alto de hilera vertical (KPI + eje superior + racks apilados). */
function verticalRackSpan(block) {
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  if (!tokens.length || !places.length) return 0;
  const kpiBlock = HILERA_KPI_TOP_H + PIECE_GAP;
  const axisBlock = places.length >= 1 ? AXIS_TOP + AXIS_GAP : 0;
  return kpiBlock + axisBlock + tokens.length * CELL + Math.max(tokens.length - 1, 0) * PIECE_GAP;
}

/** Alto de sección vertical: eje + racks, sin contador (como horizontalSectionSpan). */
function verticalSectionSpan(block) {
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  if (!tokens.length || !places.length) return 0;
  const axisBlock = places.length >= 1 ? AXIS_TOP + AXIS_GAP : 0;
  return axisBlock + tokens.length * CELL + Math.max(tokens.length - 1, 0) * PIECE_GAP;
}

const VERTICAL_KPI_PAD = HILERA_KPI_TOP_H + PIECE_GAP;

/** Alto/ancho del piso a lo largo (solo posiciones, sin KPI). */
function floorAlongSpan(block, { vertical = false, planLayout = null } = {}) {
  if (!floorShowsPositions(block, planLayout)) return 0;
  const places = floorPositionPlaces(block);
  if (!places.length) return 0;
  const across = floorAcrossOf(block);
  const groups = chunkAislePlaces(places, across);
  return aisleGroupSpan(groups, { aisleVertical: vertical, svg: false, across });
}

/** Grosor del piso (eje fino): V → ancho del grupo; H → alto del grupo. */
function floorCrossSpan(block, { vertical = false, planLayout = null } = {}) {
  if (!floorShowsPositions(block, planLayout)) return 0;
  const places = floorPositionPlaces(block);
  if (!places.length) return 0;
  const across = floorAcrossOf(block);
  const box = aisleGroupBoxSize({ svg: false, aisleVertical: vertical, across });
  return vertical ? box.w : box.h;
}

function overlayFloorCross(overlayFloors, { vertical = false, planLayout = null } = {}) {
  return Math.max(
    0,
    ...(overlayFloors || []).map((block) => floorCrossSpan(block, { vertical, planLayout })),
  );
}

/**
 * Empaqueta pasillo+piso(solapar)+pasillo para abarcar ambos y centrar.
 * Piso no visible: no ocupa fila ni overlay (evita etiqueta T1/Piso encima del túnel).
 */
function packOverlapStrip(items, planLayout = null) {
  const list = items || [];
  const out = [];
  let i = 0;
  while (i < list.length) {
    const a = list[i];
    const b = list[i + 1];
    const c = list[i + 2];
    if (
      isSectionBlock(a) &&
      b &&
      isFloorBlock(b) &&
      floorShowsPositions(b, planLayout) &&
      floorOverlaps(b) &&
      c &&
      isSectionBlock(c) &&
      floorSpansTwoSections(list, b)
    ) {
      out.push({ type: "span2", sections: [a, c], floor: b });
      i += 3;
      continue;
    }
    if (isFloorBlock(a)) {
      // Solapar (overlay) o oculto: no deja hueco ni placeholder.
      if (
        !floorShowsPositions(a, planLayout) ||
        (floorOverlaps(a) && floorOverlapSections(list, a).length >= 1)
      ) {
        i += 1;
        continue;
      }
    }
    out.push({ type: "item", block: a });
    i += 1;
  }
  return out;
}

function renderFloorOverlay(floorBlock, {
  blocks,
  planLayout = null,
  selected,
  occupancy,
  onSelect,
  vertical = false,
  align = "start",
  kpiTotal = null,
  kpiActive = false,
  onKpiClick,
}) {
  const Band = vertical ? VerticalFloorBand : FloorBand;
  return (
    <Band
      block={floorBlock}
      blocks={blocks}
      align={align}
      inOverlay
      showPositions={floorShowsPositions(floorBlock, planLayout)}
      selected={selected}
      occupancy={occupancy}
      onSelect={onSelect}
      kpiTotal={kpiTotal}
      kpiActive={kpiActive}
      onKpiClick={onKpiClick}
    />
  );
}

function maxSpan(blocks, spanOf) {
  if (!blocks?.length) return 0;
  return Math.max(0, ...blocks.map(spanOf));
}

/** Ancho/alto del pasillo = hilera relacionada (o la más ancha del tramo). */
function aisleSpanFor(aisle, scope, spanOf, { throughSections = false } = {}) {
  const related = relatedRacksForAisle(scope, aisle, { throughSections });
  const racks = related.length ? related : (scope || []).filter((block) => block.kind === "rack");
  return Math.max(0, maxSpan(racks, spanOf));
}

/** Piso que aún ocupa fila/columna (solapar no cuenta para la pista de racks). */
function restingFloorAlongSpan(block, scope, { vertical = false, planLayout = null } = {}) {
  if (!isFloorBlock(block)) return 0;
  if (floorOverlaps(block) && floorOverlapSections(scope, block).length) return 0;
  return floorAlongSpan(block, { vertical, planLayout });
}

/** Pisos vecinos o que solapan esta sección (largo = solo posiciones, sin KPI). */
function floorsAlongSection(scope, section) {
  const list = scope || [];
  // Solapar (1 o 2 vecinos): cualquier piso que tenga esta sección como vecina.
  const overlapping = list.filter(
    (block) =>
      floorOverlaps(block) && floorOverlapSections(list, block).includes(section),
  );
  if (overlapping.length) return overlapping;
  const index = list.indexOf(section);
  if (index < 0) return [];
  const neighbors = [];
  if (index > 0 && isFloorBlock(list[index - 1])) neighbors.push(list[index - 1]);
  if (index < list.length - 1 && isFloorBlock(list[index + 1])) neighbors.push(list[index + 1]);
  return neighbors;
}

function floorSpanForSection(section, scope, { vertical = false, planLayout = null } = {}) {
  return Math.max(
    0,
    ...floorsAlongSection(scope, section).map((block) =>
      floorAlongSpan(block, { vertical, planLayout }),
    ),
  );
}

/**
 * Relacionado de una sección.
 * Túnel: alto/ancho = largo de posiciones de piso (sin contador).
 * Resto: racks ligados, o piso en reposo.
 */
function relatedSpanForSection(
  section,
  scope,
  spanOf,
  { vertical = false, planLayout = null, throughSections = false } = {},
) {
  const floorSpan = floorSpanForSection(section, scope, { vertical, planLayout });
  if (normalizeSectionType(section?.section_type) === "tunel" && floorSpan > 0) {
    return floorSpan;
  }
  const rackSpan = aisleSpanFor(section, scope, spanOf, { throughSections });
  if (rackSpan > 0) return rackSpan;
  if (floorSpan > 0) return floorSpan;
  const restingFloorSpan = Math.max(
    0,
    ...(scope || []).map((block) => restingFloorAlongSpan(block, scope, { vertical, planLayout })),
  );
  return restingFloorSpan;
}

/** Pista común: racks del tramo, o piso en reposo (solapar no infla). */
function trackSpanFor(scope, spanOf, { vertical = false, planLayout = null } = {}) {
  const racks = (scope || []).filter((block) => block.kind === "rack");
  const rackMax = racks.length ? maxSpan(racks, spanOf) : 0;
  const floorMax = Math.max(
    0,
    ...(scope || []).map((block) => restingFloorAlongSpan(block, scope, { vertical, planLayout })),
  );
  return Math.max(1, rackMax, floorMax);
}

function markClass(item) {
  if (!item.is_active) return "bg-slate-400";
  if (item.status === "ocupado") return "bg-red-500";
  if (item.status === "asignado") return "bg-orange-500";
  return "bg-emerald-500";
}

function markLabel(item) {
  if (!item.is_active) return "Inactivo";
  if (item.status === "ocupado") return "Ocupado";
  if (item.status === "asignado") return "Asignado";
  return "Libre";
}

/** Misma grilla de niveles en horizontal y vertical (máx. 3 columnas). */
function LevelMarks({ marks, levels = 0 }) {
  const sorted = marks?.length ? [...marks].sort((a, b) => a.level - b.level) : null;
  const placeholderCount = !sorted && levels >= 1 ? levels : 0;
  const items = sorted || Array.from({ length: placeholderCount }, (_, index) => ({ level: index + 1, placeholder: true }));
  if (!items.length) return null;
  const columns = Math.min(3, items.length);
  return (
    <span
      className="grid place-content-center"
      style={{
        gridTemplateColumns: `repeat(${columns}, ${MARK}px)`,
        gap: MARK_GAP,
        padding: 2,
      }}
    >
      {items.map((item) =>
        item.placeholder ? (
          <span
            key={`ph-${item.level}`}
            title={`Nivel ${item.level}`}
            className="shrink-0 border border-amber-400 bg-transparent"
            style={{ width: MARK, height: MARK }}
          />
        ) : (
          <span
            key={item.level}
            title={`Nivel ${item.level} · ${markLabel(item)}${item.is_picking ? " · Picking" : ""}`}
            className={`relative flex shrink-0 items-center justify-center ${markClass(item)}`}
            style={{ width: MARK, height: MARK }}
          >
            {item.is_picking ? (
              <Check className="h-[70%] w-[70%] text-white" strokeWidth={3} aria-hidden />
            ) : null}
          </span>
        ),
      )}
    </span>
  );
}

const DOOR_SIZE = `${DOOR_SPAN * 100}%`;
const DOOR_THICK = 28;
/** Mitad fuera del borde: el scroll del modal no debe recortar la puerta. */
const DOOR_OVERHANG = DOOR_THICK / 2;
/** Centrar en el trazo del border-2 (1px hacia fuera del padding edge). */
const DOOR_BORDER_CENTER = -1;

function doorStyle(wall, anchor) {
  const along = `${doorAlongRatio(anchor, DOOR_SPAN) * 100}%`;
  if (wall === "top") {
    return {
      top: DOOR_BORDER_CENTER,
      left: along,
      width: DOOR_SIZE,
      height: DOOR_THICK,
      transform: "translateY(-50%)",
    };
  }
  if (wall === "bottom") {
    return {
      bottom: DOOR_BORDER_CENTER,
      left: along,
      width: DOOR_SIZE,
      height: DOOR_THICK,
      transform: "translateY(50%)",
    };
  }
  if (wall === "left") {
    return {
      left: DOOR_BORDER_CENTER,
      top: along,
      width: DOOR_THICK,
      height: DOOR_SIZE,
      transform: "translateX(-50%)",
    };
  }
  return {
    right: DOOR_BORDER_CENTER,
    top: along,
    width: DOOR_THICK,
    height: DOOR_SIZE,
    transform: "translateX(50%)",
  };
}

function DoorDash({ side }) {
  if (side) {
    return (
      <span className="flex min-h-[8px] flex-1 flex-row justify-center gap-1" aria-hidden>
        <span className="h-full w-0 border-l-2 border-dashed border-sky-500" />
        <span className="h-full w-0 border-l-2 border-dashed border-sky-500" />
      </span>
    );
  }
  return (
    <span className="flex min-w-[8px] flex-1 flex-col justify-center gap-1" aria-hidden>
      <span className="h-0 w-full border-t-2 border-dashed border-sky-500" />
      <span className="h-0 w-full border-t-2 border-dashed border-sky-500" />
    </span>
  );
}

/** Apertura en la pared: topes + dashed + nombre (sin tarjeta que “flote”). */
function DoorMarkLabel({ side, label }) {
  const nameClass =
    "shrink-0 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-sky-800";
  if (side) {
    return (
      <div className="flex h-full w-full flex-col items-center gap-0.5 bg-white px-0.5 py-0.5">
        <span className="h-1 w-full shrink-0 bg-sky-600" aria-hidden />
        <DoorDash side />
        <span className={`${nameClass} max-h-[5.5rem] overflow-hidden [writing-mode:vertical-rl]`}>
          {label}
        </span>
        <DoorDash side />
        <span className="h-1 w-full shrink-0 bg-sky-600" aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center gap-0.5 bg-white px-0.5">
      <span className="h-full w-1 shrink-0 bg-sky-600" aria-hidden />
      <DoorDash />
      <span className={`${nameClass} max-w-[7rem] truncate`}>{label}</span>
      <DoorDash />
      <span className="h-full w-1 shrink-0 bg-sky-600" aria-hidden />
    </div>
  );
}

function DoorMarks({ doors }) {
  return (doors || []).map((door, index) => {
    const side = door.wall === "left" || door.wall === "right";
    const label = doorDisplayName(door);
    return (
      <div
        key={door.id || `${door.wall}-${door.anchor}-${index}`}
        title={label}
        className="pointer-events-none absolute z-10"
        style={doorStyle(door.wall, door.anchor)}
      >
        <DoorMarkLabel side={side} label={label} />
      </div>
    );
  });
}

function RackDrawing({
  token,
  places,
  rackPrefix,
  direction,
  labelSide,
  selectedPlace,
  marksFor,
  tunnel,
  onSelect,
  levels = 0,
}) {
  const cells = Math.max(places.length, 1);
  const columns = direction === "vertical" ? cells : 1;
  const rows = direction === "vertical" ? 1 : cells;
  const label = `${rackPrefix || ""}${token}`;
  const vertical = direction === "vertical";
  const labelLeft = vertical && labelSide === "above";
  const labelAbove = !vertical && labelSide === "above";
  const cellBorder = tunnel ? "border-amber-500" : "border-slate-900";
  const edgeBorder = tunnel ? "border-l-2 border-t-2" : "border-l border-t";
  const cellEdge = tunnel ? "border-b-2 border-r-2" : "border-b border-r";

  // Borde externo en el grid + solo right/bottom en celdas → sin doble trazo interno.
  const grid = (
    <div
      className={`grid shrink-0 bg-white ${edgeBorder} ${cellBorder}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, ${CELL}px)`,
        gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
      }}
    >
      {places.map((place) => {
        const selected = selectedPlace === place;
        const marks = marksFor(token, place);
        return (
          <button
            key={place}
            type="button"
            aria-pressed={selected}
            aria-label={`${label} ${place}`}
            className={`flex h-full w-full cursor-pointer items-center justify-center bg-white ${cellEdge} ${cellBorder} ${selected ? "ring-2 ring-inset ring-sky-500" : "hover:bg-slate-50"}`}
            onClick={(event) => onSelect(place, event)}
          >
            <LevelMarks marks={marks} levels={levels} />
          </button>
        );
      })}
    </div>
  );

  // Mismo RACK_LABEL_GAP en H y V (= hueco letra profundidad ↔ cuadro).
  const labelEl = (
    <span
      className={`inline-flex shrink-0 items-center truncate text-xs font-medium tabular-nums text-slate-600 ${
        vertical ? (labelLeft ? "justify-end" : "justify-start") : "justify-center"
      }`}
      style={{ width: LABEL_W, height: RACK_LABEL_H }}
    >
      {label}
    </span>
  );

  if (vertical) {
    return (
      <div
        className={`flex shrink-0 items-center ${labelLeft ? "flex-row" : "flex-row-reverse"}`}
        style={{ gap: RACK_LABEL_GAP }}
      >
        {labelEl}
        {grid}
      </div>
    );
  }

  return (
    <div
      className={`flex ${labelAbove ? "flex-col-reverse" : "flex-col"}`}
      style={{ gap: RACK_LABEL_GAP }}
    >
      {grid}
      {labelEl}
    </div>
  );
}

function DepthAxis({ places, layout = "side", offsetTop = 0 }) {
  if (!places.length) return null;
  if (layout === "top") {
    return (
      <div
        className="grid justify-items-center"
        style={{
          height: AXIS_TOP,
          gridTemplateColumns: `repeat(${places.length}, ${CELL}px)`,
        }}
      >
        {places.map((place) => (
          <span
            key={place}
            className="flex h-full w-full items-center justify-center text-[10px] font-semibold leading-none text-slate-500"
          >
            {place}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      className="grid shrink-0 justify-items-center"
      style={{
        width: AXIS_SIDE,
        marginTop: offsetTop || undefined,
        gridTemplateRows: `repeat(${places.length}, ${CELL}px)`,
      }}
    >
      {places.map((place) => (
        <span
          key={place}
          className="flex h-full w-full items-center justify-center text-[10px] font-semibold leading-none text-slate-500"
        >
          {place}
        </span>
      ))}
    </div>
  );
}

/**
 * Contador de hilera (pill sky).
 * Vertical → arriba (pill horizontal).
 * Horizontal → izquierda, girado -90° (pie contra la cara de la hilera).
 */
function HileraKpiBadge({ total, placement = "top", active = false, onClick }) {
  const sideways = placement === "left";
  const pillClass = `inline-flex h-6 min-w-[2.5rem] cursor-pointer items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums tracking-tight shadow-sm transition-all ${
    active
      ? "bg-sky-600 text-white shadow-md shadow-sky-200/80 ring-2 ring-sky-300 ring-offset-1"
      : "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-300/80 hover:bg-sky-100 hover:text-sky-950 hover:ring-sky-400 hover:shadow"
  }`;
  if (!sideways) {
    return (
      <button
        type="button"
        title="Ver KPIs de la hilera"
        aria-pressed={active}
        onClick={onClick}
        className={`shrink-0 ${pillClass}`}
      >
        {Number(total) || 0}
      </button>
    );
  }
  return (
    <button
      type="button"
      title="Ver KPIs de la hilera"
      aria-pressed={active}
      onClick={onClick}
      className="flex h-[2.5rem] w-6 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
    >
      <span className={`${pillClass} origin-center -rotate-90`}>
        {Number(total) || 0}
      </span>
    </button>
  );
}

function RackBand({
  block,
  rackPrefix,
  direction,
  selected,
  marksFor,
  places,
  tunnelFor,
  onSelect,
  showTopAxis,
  kpiTotal = 0,
  kpiActive = false,
  onKpiClick,
  /** Ref al cuerpo (eje + racks), sin contador — para medir relacionado de sección. */
  bodyRef = null,
}) {
  const tokens = rackTokensOf(block);
  const levels = Number(block.levels) || 0;
  if (!tokens.length || levels < 1 || !places.length) {
    return <p className="text-xs text-slate-400">Rack incompleto</p>;
  }
  const horizontal = direction !== "vertical";
  const labelLeft = !horizontal && block.label_side === "above";
  const gridW = places.length * CELL;
  const labelOffset = labelLeft ? LABEL_W + RACK_LABEL_GAP : 0;
  // Vertical: KPI arriba, centrado sobre la grilla.
  const kpiAbove = !horizontal && onKpiClick ? (
    <div
      className="flex shrink-0 justify-center"
      style={{ marginLeft: labelOffset, width: gridW }}
    >
      <HileraKpiBadge
        total={kpiTotal}
        placement="top"
        active={kpiActive}
        onClick={onKpiClick}
      />
    </div>
  ) : null;
  const tokenStack = (
    <div
      className={horizontal ? "flex w-max items-start" : "flex flex-col items-start"}
      style={{ gap: PIECE_GAP }}
    >
      {tokens.map((token) => (
        <RackDrawing
          key={token}
          token={token}
          places={places}
          rackPrefix={rackPrefix}
          direction={direction}
          labelSide={block.label_side}
          selectedPlace={selected?.blockKey === block.key && selected?.token === token ? selected.place : ""}
          marksFor={marksFor}
          tunnel={tunnelFor(token)}
          levels={levels}
          onSelect={(place, event) => onSelect(block, token, place, event)}
        />
      ))}
    </div>
  );

  if (horizontal) {
    return tokenStack;
  }

  return (
    <div className="inline-flex flex-col items-start" style={{ gap: PIECE_GAP }}>
      {kpiAbove}
      <div
        ref={bodyRef}
        data-rack-body={block.key}
        className="flex flex-col items-start"
        style={{ gap: AXIS_GAP }}
      >
        {showTopAxis ? (
          <div style={{ marginLeft: labelOffset }}>
            <DepthAxis places={places} layout="top" />
          </div>
        ) : null}
        {tokenStack}
      </div>
    </div>
  );
}

function AislePalletMark({
  place,
  marks,
  width = AISLE_DOT_UI,
  height = AISLE_DOT_UI,
}) {
  const item = marks?.[0];
  return (
    <span
      aria-hidden
      title={item ? `${place} · ${markLabel(item)}${item.is_picking ? " · Picking" : ""}` : place}
      className="pointer-events-none flex shrink-0 items-center justify-center"
      style={{ width, height }}
    >
      {item ? (
        <span
          className={`relative flex h-full w-full items-center justify-center ${markClass(item)}`}
        >
          {item.is_picking ? (
            <Check className="h-[65%] w-[65%] text-white" strokeWidth={3} aria-hidden />
          ) : null}
        </span>
      ) : (
        <span className="block h-full w-full border border-amber-400 bg-transparent" />
      )}
    </span>
  );
}

function samePlaceList(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return false;
  return a.every((place, index) => place === b[index]);
}

/**
 * Naranja = fit-content de las marcas internas (dimensión).
 * Click en el dashed: lista todas las posiciones del grupo.
 */
function AisleGroupCell({
  places,
  code,
  blockKey,
  selected,
  occupancy,
  onSelect,
  aisleVertical = false,
  across = 3,
}) {
  const groupSelected =
    selected?.blockKey === blockKey && samePlaceList(selected?.places, places);
  // Marca según dimensión; padre = fit-content del lote real.
  const box = aisleGroupBoxSize({
    svg: false,
    aisleVertical,
    across,
    count: places.length,
  });
  const label = places.length > 1 ? `${places[0]}–${places[places.length - 1]}` : places[0] || "";
  return (
    <button
      type="button"
      aria-pressed={groupSelected}
      aria-label={`Posiciones ${label}`}
      title={label}
      className={`inline-flex w-fit h-fit shrink-0 cursor-pointer items-center border border-dashed bg-white p-0 ${
        aisleVertical ? "flex-row" : "flex-col"
      } ${
        groupSelected
          ? "border-sky-500 ring-2 ring-inset ring-sky-400"
          : "border-amber-500 hover:border-sky-400"
      }`}
      style={{
        boxSizing: "border-box",
        gap: box.gap,
        padding: box.pad,
        justifyContent: "flex-start",
        alignItems: "center",
      }}
      onClick={(event) => onSelect?.(places, event)}
    >
      {places.map((place) => (
        <AislePalletMark
          key={place}
          place={place}
          width={box.markW}
          height={box.markH}
          marks={occupancy?.[slotKey(code, "", place)] || []}
        />
      ))}
    </button>
  );
}

function AislePlaceGroup({
  places,
  code,
  blockKey,
  selected,
  occupancy,
  onSelect,
  aisleVertical = false,
  across = 3,
  translucent = false,
}) {
  return (
    <div
      className={`inline-flex shrink-0 ${aisleVertical ? "flex-col" : "flex-row"} ${
        translucent ? "opacity-55" : ""
      }`}
      style={{ gap: AISLE_POS_GAP_UI }}
      data-floor-places
    >
      {chunkAislePlaces(places, across).map((chunk) => (
        <AisleGroupCell
          key={chunk.join("-")}
          places={chunk}
          code={code}
          blockKey={blockKey}
          selected={selected}
          occupancy={occupancy}
          onSelect={onSelect}
          aisleVertical={aisleVertical}
          across={across}
        />
      ))}
    </div>
  );
}

function sectionBandClasses(sectionType, vertical, fillAlong) {
  const along = fillAlong
    ? vertical
      ? "h-auto"
      : "w-auto"
    : vertical
      ? "h-auto"
      : "w-max";
  if (sectionType === "division") {
    return vertical
      ? `relative shrink-0 bg-slate-500 ${along}`
      : `relative bg-slate-500 ${along}`;
  }
  if (sectionType === "tunel") {
    return vertical
      ? `relative flex shrink-0 items-center justify-center border-x border-slate-500 bg-slate-100/80 ${along}`
      : `relative flex items-center justify-center border-y border-slate-500 bg-slate-100/80 ${along}`;
  }
  return vertical
    ? `relative flex shrink-0 items-center justify-center border-x-2 border-dashed border-slate-400 bg-slate-50 ${along}`
    : `relative flex items-center justify-center border-y-2 border-dashed border-slate-400 bg-slate-50 ${along}`;
}

/** Si el largo forzado es menor que esto, el band usa fit-content (la etiqueta cabe). */
const AISLE_LABEL_MIN_ALONG = 72;

function AisleBand({
  block,
  align = "start",
  trackSpan = 0,
  relatedSpan = 0,
  /** Alto mínimo (solapar: grosor del piso). */
  crossSpan = 0,
}) {
  const sectionType = normalizeSectionType(block.section_type);
  const label = aisleDisplayName(block);
  const base = sectionBandBaseSize(sectionType, { emptySize: AISLE_SIZE });
  const along = sectionAlongSpan(block, { relatedSpan, trackSpan });
  const fillAlong = along >= AISLE_LABEL_MIN_ALONG;
  const bandW = fillAlong ? Math.max(base, along) : "fit-content";
  const bandH = Math.max(base, Number(crossSpan) || 0);
  const alignSelf =
    align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start";
  if (sectionType === "division") {
    const divFill = along > 0;
    return (
      <div
        className={sectionBandClasses(sectionType, false, divFill)}
        style={{
          height: Math.max(1, Number(crossSpan) || 1),
          minHeight: 1,
          width: divFill ? Math.max(base, along) : "fit-content",
          minWidth: !divFill ? 48 : undefined,
          alignSelf,
          marginTop: 4,
          marginBottom: 4,
        }}
        title={label}
      />
    );
  }
  return (
    <div
      className={sectionBandClasses(sectionType, false, fillAlong)}
      style={{
        boxSizing: "border-box",
        height: bandH,
        minHeight: bandH,
        width: bandW,
        paddingLeft: 16,
        paddingRight: 16,
        alignSelf,
      }}
    >
      <span className="pointer-events-none whitespace-nowrap text-sm font-semibold tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}

function VerticalAisleBand({
  block,
  align = "start",
  trackSpan = 0,
  relatedSpan = 0,
  /** Alto en px de la columna de piso/pista a igualar. */
  columnHeight = 0,
  /** Ancho mínimo (solapar: grosor del piso). */
  crossSpan = 0,
}) {
  const sectionType = normalizeSectionType(block.section_type);
  const label = aisleDisplayName(block);
  const base = sectionBandBaseSize(sectionType, { emptySize: AISLE_SIZE });
  const along = sectionAlongSpan(block, {
    relatedSpan: columnHeight || relatedSpan,
    trackSpan,
  });
  const fillAlong = along >= AISLE_LABEL_MIN_ALONG;
  const bandH = fillAlong ? Math.max(base, along) : "fit-content";
  const bandW = Math.max(base, Number(crossSpan) || 0);
  const alignSelf =
    align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start";
  if (sectionType === "division") {
    const divFill = along > 0;
    return (
      <div
        className={sectionBandClasses(sectionType, true, divFill)}
        style={{
          boxSizing: "border-box",
          width: Math.max(1, Number(crossSpan) || 1),
          minWidth: 1,
          height: divFill ? Math.max(base, along) : "fit-content",
          minHeight: !divFill ? 48 : undefined,
          alignSelf,
          marginLeft: 4,
          marginRight: 4,
        }}
        title={label}
      />
    );
  }
  return (
    <div
      className={sectionBandClasses(sectionType, true, fillAlong)}
      style={{
        boxSizing: "border-box",
        width: bandW,
        height: bandH,
        paddingTop: 12,
        paddingBottom: 12,
        alignSelf,
      }}
    >
      <span className="pointer-events-none whitespace-nowrap text-xs font-semibold tracking-wide text-slate-500 [writing-mode:vertical-rl]">
        {label}
      </span>
    </div>
  );
}

function FloorBand({
  block,
  blocks,
  align = "start",
  inOverlay = false,
  showPositions = false,
  selected,
  occupancy,
  onSelect,
  kpiTotal = null,
  kpiActive = false,
  onKpiClick,
}) {
  const hall = floorHallToken(sectionNeighbors(blocks, block));
  const places = showPositions ? floorPositionPlaces(block) : [];
  const across = floorAcrossOf(block);
  // En overlay el padre centra el eje fino; no pisar con alignSelf.
  const alignSelf = inOverlay
    ? undefined
    : align === "center"
      ? "center"
      : align === "end"
        ? "flex-end"
        : "flex-start";
  if (!places.length) return null;
  const showKpi = kpiTotal != null && typeof onKpiClick === "function";
  const translucent = inOverlay || floorOverlaps(block);
  // KPI fuera de flujo a la izquierda: ancho = solo posiciones (túnel alinea sin contador).
  return (
    <div className="relative w-max shrink-0" style={alignSelf ? { alignSelf } : undefined}>
      <AislePlaceGroup
        places={places}
        code={hall}
        blockKey={block.key}
        selected={selected}
        occupancy={occupancy}
        aisleVertical={false}
        across={across}
        translucent={translucent}
        onSelect={(place, event) => onSelect?.(block, place, event)}
      />
      {showKpi ? (
        <div
          className="absolute top-1/2 z-[1] -translate-y-1/2"
          style={{ right: "100%", marginRight: AISLE_POS_GAP_UI }}
        >
          <HileraKpiBadge
            total={kpiTotal}
            placement="left"
            active={kpiActive}
            onClick={onKpiClick}
          />
        </div>
      ) : null}
    </div>
  );
}

function VerticalFloorBand({
  block,
  blocks,
  align = "start",
  inOverlay = false,
  showPositions = false,
  selected,
  occupancy,
  onSelect,
  kpiTotal = null,
  kpiActive = false,
  onKpiClick,
}) {
  const hall = floorHallToken(sectionNeighbors(blocks, block));
  const places = showPositions ? floorPositionPlaces(block) : [];
  const across = floorAcrossOf(block);
  // En overlay el padre centra el eje fino; no pisar con alignSelf.
  const alignSelf = inOverlay
    ? undefined
    : align === "center"
      ? "center"
      : align === "end"
        ? "flex-end"
        : "flex-start";
  if (!places.length) return null;
  const showKpi = kpiTotal != null && typeof onKpiClick === "function";
  const translucent = inOverlay || floorOverlaps(block);
  // KPI fuera de flujo, siempre arriba (como hilera V y SVG). Arriba/Medio/Abajo no lo mueven.
  return (
    <div
      className="relative h-max w-max shrink-0"
      style={alignSelf ? { alignSelf } : undefined}
      data-floor-places
    >
      <AislePlaceGroup
        places={places}
        code={hall}
        blockKey={block.key}
        selected={selected}
        occupancy={occupancy}
        aisleVertical
        across={across}
        translucent={translucent}
        onSelect={(place, event) => onSelect?.(block, place, event)}
      />
      {showKpi ? (
        <div
          className="absolute left-1/2 z-[1] -translate-x-1/2"
          style={{ bottom: "100%", marginBottom: AISLE_POS_GAP_UI }}
        >
          <HileraKpiBadge
            total={kpiTotal}
            placement="top"
            active={kpiActive}
            onClick={onKpiClick}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function CavaPlan({
  cavaId,
  name,
  code,
  blocks,
  nomenclature,
  planLayout = null,
  readOnly = false,
  occupancyRevision = 0,
  showTitle = true,
  onShowFloorPositionsChange = null,
}) {
  const cavaTitle = cavaTitleOf(name, code);
  const rackPrefix = nomenclature?.rack_prefix || "";
  const baseLayout = useMemo(() => normalizePlanLayout(planLayout, blocks), [planLayout, blocks]);
  const [floorPreview, setFloorPreview] = useState(null);
  const layout = useMemo(() => {
    if (floorPreview === null) return baseLayout;
    return { ...baseLayout, show_floor_positions: floorPreview };
  }, [baseLayout, floorPreview]);
  const showFloorPositions = Boolean(layout.show_floor_positions);
  const total = countSlots(blocks, { planLayout: layout });
  const masterAxis = defaultOrientationOf(layout, blocks);
  const sections = useMemo(
    () => planSections(blocks, { axis: masterAxis }),
    [blocks, masterAxis],
  );
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [kpiSelected, setKpiSelected] = useState(null);
  const [occupancy, setOccupancy] = useState({});
  const [occupancyTick, setOccupancyTick] = useState(0);
  const [measuredTrackW, setMeasuredTrackW] = useState(0);
  const [measuredTrackH, setMeasuredTrackH] = useState(0);
  /** Cuerpo de hilera (sin contador): { node, vertical }. */
  const rackBodyRefs = useRef(new Map());
  const cavaKpis = useMemo(
    () => cavaOccupancyKpis(occupancy, { blocks, planLayout: layout }),
    [occupancy, blocks, layout],
  );
  const planImage = useMemo(
    () => buildCavaPlanSvg({ name, code, blocks, nomenclature, occupancy, planLayout: layout }),
    [name, code, blocks, nomenclature, occupancy, layout],
  );

  useEffect(() => {
    setFloorPreview(null);
  }, [cavaId, planLayout]);

  const refreshRackBodyMeasures = () => {
    let maxBodyW = 0;
    let maxBodyH = 0;
    rackBodyRefs.current.forEach((entry) => {
      const node = entry?.node;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (entry.vertical) {
        maxBodyH = Math.max(maxBodyH, Math.ceil(rect.height));
      } else {
        maxBodyW = Math.max(maxBodyW, Math.ceil(rect.width));
      }
    });
    // Pista = cuerpo + hueco del contador (H izquierda / V arriba).
    const nextW = maxBodyW > 0 ? maxBodyW + HILERA_KPI_PAD : 0;
    const nextH = maxBodyH > 0 ? maxBodyH + VERTICAL_KPI_PAD : 0;
    setMeasuredTrackW((prev) => (prev === nextW ? prev : nextW));
    setMeasuredTrackH((prev) => (prev === nextH ? prev : nextH));
  };

  /**
   * Largo real del relacionado sin contador (ancho H / alto V).
   * El widget de sección debe igualar solo este cuerpo.
   */
  function measuredRelatedRackAlong(
    section,
    scope,
    { throughSections = false, vertical = false } = {},
  ) {
    const related = relatedRacksForAisle(scope, section, { throughSections });
    if (!related.length) return 0;
    return Math.max(
      0,
      ...related.map((rack) => {
        const entry = rackBodyRefs.current.get(rack.key);
        const node = entry?.node;
        if (!node) return 0;
        const rect = node.getBoundingClientRect();
        const alongVertical = vertical || rack.orientation === "vertical";
        return Math.max(0, Math.ceil(alongVertical ? rect.height : rect.width));
      }),
    );
  }

  /** Hueco KPI izquierdo si la sección sigue una hilera horizontal. */
  function sectionUsesHileraKpiPad(section, scope) {
    return relatedRacksForAisle(scope, section).some(
      (rack) => rack.orientation !== "vertical",
    );
  }

  /** Hueco KPI superior si la sección sigue una hilera vertical (arriba y abajo igual). */
  function sectionUsesVerticalKpiPad(section, scope) {
    return relatedRacksForAisle(scope, section).some(
      (rack) => rack.orientation === "vertical",
    );
  }

  const setRackBodyRef = (key, node, { vertical = false } = {}) => {
    if (node) rackBodyRefs.current.set(key, { node, vertical: Boolean(vertical) });
    else rackBodyRefs.current.delete(key);
  };

  useLayoutEffect(() => {
    // Doble rAF: tras pintar racks medir cuerpo (sin contador) y pista.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      refreshRackBodyMeasures();
      raf2 = requestAnimationFrame(refreshRackBodyMeasures);
    });
    const nodes = [...rackBodyRefs.current.values()].map((entry) => entry.node).filter(Boolean);
    if (!nodes.length || typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    const observer = new ResizeObserver(() => refreshRackBodyMeasures());
    nodes.forEach((node) => observer.observe(node));
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer.disconnect();
    };
  }, [blocks, layout, sections.length, occupancy]);

  useEffect(() => {
    if (!cavaId) {
      setOccupancy({});
      return undefined;
    }
    let cancelled = false;
    getCavaOccupancy(cavaId)
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        (rows || []).forEach((row) => {
          const key = slotKey(row.hall, row.rack, row.place);
          if (!map[key]) map[key] = [];
          map[key].push(row);
        });
        Object.values(map).forEach((list) => list.sort((a, b) => a.level - b.level));
        setOccupancy(map);
      })
      .catch(() => {
        if (!cancelled) setOccupancy({});
      });
    return () => {
      cancelled = true;
    };
  }, [cavaId, occupancyRevision, occupancyTick]);

  const selectedBlock = selected ? (blocks || []).find((block) => block.key === selected.blockKey) : null;
  const selectedIsFloor = isFloorBlock(selectedBlock);
  const selectedAisle = selectedIsFloor
    ? floorHallToken(sectionNeighbors(blocks, selectedBlock))
    : selectedBlock
      ? suggestedAisleCode(blocks, selectedBlock)
      : "";
  const selectedPlaces = selectedIsFloor
    ? selected?.places?.length
      ? selected.places
      : selected?.place
        ? [selected.place]
        : []
    : null;
  const selectedTitle = selectedIsFloor
    ? [
        selectedAisle || "Piso",
        selectedPlaces?.length > 1
          ? `${selectedPlaces[0]}–${selectedPlaces[selectedPlaces.length - 1]}`
          : selectedPlaces?.[0] || "",
      ]
        .filter(Boolean)
        .join(" · ")
    : selectedBlock
      ? [
          `${rackPrefix}${selected.token}`,
          selected.place,
          selectedAisle ? aisleLabelForCode(blocks, selectedAisle) : "",
        ].filter(Boolean).join(" · ")
      : "";
  const kpiBlock =
    kpiSelected?.scope === "cava"
      ? null
      : kpiSelected
        ? (blocks || []).find((block) => block.key === kpiSelected.blockKey)
        : null;
  const kpiMenuTitle =
    kpiSelected?.scope === "cava"
      ? cavaTitle
      : isSectionBlock(kpiBlock)
        ? aisleDisplayName(kpiBlock)
        : isFloorBlock(kpiBlock)
          ? floorHallToken(sectionNeighbors(blocks, kpiBlock)) || "Piso"
          : kpiBlock
            ? `Hilera ${hileraLabel(kpiBlock, rackPrefix)}`
            : "";
  const kpiMenuData =
    kpiSelected?.scope === "cava"
      ? cavaKpis
      : kpiBlock
        ? blockOccupancyKpis(kpiBlock, blocks, occupancy)
        : null;
  const kpiPushDepth = kpiBlock?.kind === "rack" ? depthCodesOf(kpiBlock).length : 0;
  const kpiShowPush = kpiSelected?.scope === "hilera" && kpiPushDepth > 2;
  const kpiPushHall = kpiShowPush ? suggestedAisleCode(blocks, kpiBlock) : "";
  const kpiPushRacks = kpiShowPush ? rackTokensOf(kpiBlock) : null;
  const kpiIsPush = kpiShowPush ? blockIsPush(kpiBlock, blocks, occupancy) : false;

  function selectCell(block, token, place, event) {
    const anchorEl = event.currentTarget;
    setKpiSelected(null);
    setSelected((current) => (
      current && current.blockKey === block.key && current.token === token && current.place === place
        ? null
        : { blockKey: block.key, token, place, anchorEl }
    ));
  }

  function selectAisleCell(block, placesOrPlace, event) {
    const places = Array.isArray(placesOrPlace)
      ? placesOrPlace
      : placesOrPlace
        ? [placesOrPlace]
        : [];
    const anchorEl = event.currentTarget;
    setKpiSelected(null);
    setSelected((current) => (
      current &&
      current.blockKey === block.key &&
      samePlaceList(current.places, places)
        ? null
        : {
            blockKey: block.key,
            token: "",
            places,
            place: places.length === 1 ? places[0] : places.join(","),
            anchorEl,
          }
    ));
  }

  function selectHileraKpi(block, event) {
    const anchorEl = event.currentTarget;
    setSelected(null);
    setKpiSelected((current) => (
      current && current.scope !== "cava" && current.blockKey === block.key
        ? null
        : { scope: "hilera", blockKey: block.key, anchorEl }
    ));
  }

  function selectCavaKpi(event) {
    const anchorEl = event.currentTarget;
    setSelected(null);
    setKpiSelected((current) => (
      current?.scope === "cava" ? null : { scope: "cava", anchorEl }
    ));
  }

  async function onDownload() {
    if (!planImage) return;
    setDownloading(true);
    setNotice("");
    try {
      await downloadCavaPlan(planImage);
    } catch {
      setNotice("No se pudo descargar el plano.");
    } finally {
      setDownloading(false);
    }
  }

  function onOpen() {
    if (!planImage) return;
    const opened = openCavaPlanTab(planImage);
    setNotice(opened ? "" : "Permita abrir otra pestaña para ver el plano.");
  }

  function renderRack(block, { vertical, showTopAxis = false, axisForPlaces = null }) {
    const places = orderedDepthPlaces(
      depthCodesOf(block),
      axisForPlaces || depthAxisOf(layout, block),
    );
    const hall = suggestedAisleCode(blocks, block);
    const kpis = blockOccupancyKpis(block, blocks, occupancy);
    const kpiActive = kpiSelected?.scope === "hilera" && kpiSelected.blockKey === block.key;
    return (
      <RackBand
        key={block.key}
        block={block}
        rackPrefix={rackPrefix}
        direction={vertical ? "vertical" : "horizontal"}
        selected={selected}
        places={places}
        showTopAxis={showTopAxis}
        marksFor={(token, place) => occupancy[slotKey(hall, token, place)] || []}
        tunnelFor={(token) => isTunnelToken(occupancy, hall, token, depthCodesOf(block))}
        onSelect={selectCell}
        kpiTotal={kpis.total}
        kpiActive={kpiActive}
        onKpiClick={vertical ? (event) => selectHileraKpi(block, event) : undefined}
        bodyRef={
          vertical
            ? (node) => setRackBodyRef(block.key, node, { vertical: true })
            : undefined
        }
      />
    );
  }

  function renderMiddleRackRow(block) {
    const axisPlaces = depthCodesOf(block);
    const axis = depthAxisOf(layout, block);
    const drawnAxis = orderedDepthPlaces(axisPlaces, axis);
    const showAxis = axisPlaces.length >= 1;
    const align = rowAlignOf(layout, block);
    const kpis = blockOccupancyKpis(block, blocks, occupancy);
    const kpiActive = kpiSelected?.scope === "hilera" && kpiSelected.blockKey === block.key;
    const labelAbove = block.label_side === "above";
    const gridH = Math.max(drawnAxis.length, 1) * CELL;
    return (
      <div key={block.key} className={`flex w-full items-start ${justifyClass(align)}`}>
        <div
          className="flex w-max shrink-0 items-start"
          style={{ gap: HILERA_KPI_INNER_GAP }}
        >
          {/* Horizontal: contador a la izquierda, pill vertical (girado). */}
          <div className="flex shrink-0 flex-col">
            {labelAbove ? <div style={{ height: RACK_LABEL_H + RACK_LABEL_GAP }} aria-hidden /> : null}
            <div className="flex items-center justify-center" style={{ height: gridH }}>
              <HileraKpiBadge
                total={kpis.total}
                placement="left"
                active={kpiActive}
                onClick={(event) => selectHileraKpi(block, event)}
              />
            </div>
          </div>
          {/* Cuerpo sin contador: mide el ancho del relacionado de sección. */}
          <div
            ref={(node) => setRackBodyRef(block.key, node, { vertical: false })}
            data-rack-body={block.key}
            className="flex w-max shrink-0 items-start"
            style={{ gap: AXIS_GAP }}
          >
            {showAxis ? (
              <DepthAxis
                places={drawnAxis}
                layout="side"
                offsetTop={labelAbove ? RACK_LABEL_H + RACK_LABEL_GAP : 0}
              />
            ) : null}
            {renderRack(block, { vertical: false, axisForPlaces: axis })}
          </div>
        </div>
      </div>
    );
  }

  function renderMiddleGroups(middle) {
    // Incluye KPI izquierdo: si no, el pasillo queda corto a la derecha.
    const estimated = Math.max(
      trackSpanFor(middle, horizontalRowSpan, {
        vertical: false,
        planLayout: layout,
      }),
      1,
    );
    const trackW = Math.max(estimated, measuredTrackW);
    const packed = packOverlapStrip(middle, layout);
    return (
      <div className="flex w-full flex-col items-stretch" style={{ gap: PIECE_GAP }}>
        {packed.map((entry) => {
          if (entry.type === "span2") {
            const { sections, floor } = entry;
            const floorAlign = rowAlignOf(layout, floor);
            // span2 = absolute/solapar: puede mirar racks al otro lado del piso.
            const relatedSpan = Math.max(
              floorAlongSpan(floor, { vertical: false, planLayout: layout }),
              ...sections.map((section) =>
                Math.max(
                  relatedSpanForSection(section, middle, horizontalSectionSpan, {
                    vertical: false,
                    planLayout: layout,
                    throughSections: true,
                  }),
                  measuredRelatedRackAlong(section, middle, { throughSections: true }),
                ),
              ),
            );
            const usesKpiPad = sections.some((section) =>
              sectionUsesHileraKpiPad(section, middle),
            );
            const kpiPad = usesKpiPad ? HILERA_KPI_PAD : 0;
            // Pista medida sin contador (tope del 100%).
            const sectionTrackW = Math.max(0, trackW - kpiPad);
            const shellAlong = Math.max(
              relatedSpan,
              ...sections.map((section) =>
                sectionAlongSpan(section, {
                  relatedSpan,
                  trackSpan: sectionTrackW,
                }),
              ),
            );
            const shellW = sectionShellAlong(shellAlong, {
              hasOverlay: true,
              overlaySpan: relatedSpan,
            });
            return (
              <div
                key={`span-${floor.key}`}
                className={`relative flex w-full items-start ${justifyClass(floorAlign)}`}
              >
                <div
                  className="relative flex shrink-0 items-start"
                  style={usesKpiPad ? { gap: HILERA_KPI_INNER_GAP } : undefined}
                >
                  {usesKpiPad ? (
                    <div className="shrink-0" style={{ width: HILERA_KPI_SIDE_W }} aria-hidden />
                  ) : null}
                  <div
                    className="relative flex flex-col"
                    style={{ gap: PIECE_GAP, width: shellW > 0 ? shellW : undefined }}
                  >
                    {sections.map((section) => (
                      <AisleBand
                        key={section.key}
                        block={section}
                        align={floorAlign}
                        trackSpan={sectionTrackW}
                        relatedSpan={relatedSpan}
                      />
                    ))}
                    <div className="pointer-events-auto absolute inset-0 z-[1]">
                      <div
                        className="absolute"
                        style={overlayPositionStyle(floorAlign, { vertical: false })}
                      >
                        {renderFloorOverlayWithKpi(floor, {
                          vertical: false,
                          align: floorAlign,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const block = entry.block;
          const align = rowAlignOf(layout, block);
          if (block.kind === "rack") {
            return <Fragment key={block.key}>{renderMiddleRackRow(block)}</Fragment>;
          }
          if (isFloorBlock(block)) {
            const places = floorShowsPositions(block, layout) ? floorPositionPlaces(block) : [];
            const kpis = places.length
              ? blockOccupancyKpis(block, blocks, occupancy)
              : null;
            const kpiActive =
              kpiSelected?.scope === "hilera" && kpiSelected.blockKey === block.key;
            return (
              <div
                key={block.key}
                className={`flex w-full items-start ${justifyClass(align)}`}
              >
                <FloorBand
                  block={block}
                  blocks={blocks}
                  align={align}
                  showPositions={floorShowsPositions(block, layout)}
                  selected={selected}
                  occupancy={occupancy}
                  onSelect={selectAisleCell}
                  kpiTotal={kpis ? kpis.total : null}
                  kpiActive={kpiActive}
                  onKpiClick={kpis ? (event) => selectHileraKpi(block, event) : undefined}
                />
              </div>
            );
          }
          const overlayFloors = floorsOverlappingSection(middle, block).filter((floor) =>
            floorShowsPositions(floor, layout),
          );
          // Solo absolute/solapar mira racks al otro lado; sin eso = solo relacionados.
          const throughSections = floorsOverlappingSection(middle, block).length > 0;
          const relatedSpan = Math.max(
            relatedSpanForSection(block, middle, horizontalSectionSpan, {
              vertical: false,
              planLayout: layout,
              throughSections,
            }),
            measuredRelatedRackAlong(block, middle, { throughSections }),
          );
          const overlayCross = overlayFloorCross(overlayFloors, {
            vertical: false,
            planLayout: layout,
          });
          const sectionAlign = overlayFloors.length
            ? rowAlignOf(layout, overlayFloors[0])
            : align;
          const usesKpiPad = sectionUsesHileraKpiPad(block, middle);
          const kpiPad = usesKpiPad ? HILERA_KPI_PAD : 0;
          // Pista medida sin contador (tope del 100%). Sin 100% = solo relacionado.
          const sectionTrackW = Math.max(0, trackW - kpiPad);
          const bandAlong = sectionAlongSpan(block, {
            relatedSpan,
            trackSpan: sectionTrackW,
          });
          const shellW = sectionShellAlong(bandAlong, {
            hasOverlay: overlayFloors.length > 0,
            overlaySpan: relatedSpan,
          });
          return (
            <div
              key={block.key}
              className={`relative flex w-full items-start ${justifyClass(sectionAlign)}`}
            >
              <div
                className="relative flex shrink-0 items-start"
                style={usesKpiPad ? { gap: HILERA_KPI_INNER_GAP } : undefined}
              >
                {usesKpiPad ? (
                  <div className="shrink-0" style={{ width: HILERA_KPI_SIDE_W }} aria-hidden />
                ) : null}
                <div
                  className="relative flex flex-col"
                  style={shellW > 0 ? { width: shellW } : undefined}
                >
                  <AisleBand
                    block={block}
                    align={align}
                    trackSpan={sectionTrackW}
                    relatedSpan={relatedSpan}
                    crossSpan={overlayCross}
                  />
                  {overlayFloors.map((floorBlock) => {
                    const floorAlign = rowAlignOf(layout, floorBlock);
                    return (
                      <div
                        key={`ov-${floorBlock.key}`}
                        className="pointer-events-auto absolute z-[1]"
                        style={overlayPositionStyle(floorAlign, { vertical: false })}
                      >
                        {renderFloorOverlayWithKpi(floorBlock, {
                          vertical: false,
                          align: floorAlign,
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderFloorOverlayWithKpi(floorBlock, { vertical = false, align = "start" } = {}) {
    const places = floorShowsPositions(floorBlock, layout) ? floorPositionPlaces(floorBlock) : [];
    const kpis = places.length ? blockOccupancyKpis(floorBlock, blocks, occupancy) : null;
    const kpiActive =
      kpiSelected?.scope === "hilera" && kpiSelected.blockKey === floorBlock.key;
    return renderFloorOverlay(floorBlock, {
      blocks,
      planLayout: layout,
      selected,
      occupancy,
      onSelect: selectAisleCell,
      vertical,
      align,
      kpiTotal: kpis ? kpis.total : null,
      kpiActive,
      onKpiClick: kpis ? (event) => selectHileraKpi(floorBlock, event) : undefined,
    });
  }

  /** Columnas verticales (flanco en master H, o tramo medio en master V). */
  function renderVerticalStrip(sideBlocks, { fill = false } = {}) {
    const items = sideBlocks || [];
    const estimated = Math.max(
      trackSpanFor(items, verticalRackSpan, {
        vertical: true,
        planLayout: layout,
      }),
      1,
    );
    // Pista medida (cuerpo + hueco KPI); el widget de sección usa pista − contador.
    const trackH = Math.max(estimated, measuredTrackH);
    const packed = packOverlapStrip(items, layout);
    return (
      <div
        className={`flex h-full min-h-0 self-stretch ${fill ? "w-full" : "w-max"}`}
      >
        <div className="flex h-full min-h-0 items-stretch" style={{ gap: PIECE_GAP }}>
          {packed.map((entry) => {
            if (entry.type === "span2") {
              const { sections, floor } = entry;
              const floorAlign = stackAlignOf(layout, floor);
              const alignSelf =
                floorAlign === "center"
                  ? "center"
                  : floorAlign === "end"
                    ? "flex-end"
                    : "flex-start";
              // span2 = absolute/solapar: puede mirar racks al otro lado del piso.
              // Relacionado = cuerpo sin contador (fórmula + DOM).
              const relatedSpan = Math.max(
                floorAlongSpan(floor, { vertical: true, planLayout: layout }),
                ...sections.map((section) =>
                  Math.max(
                    relatedSpanForSection(section, items, verticalSectionSpan, {
                      vertical: true,
                      planLayout: layout,
                      throughSections: true,
                    }),
                    measuredRelatedRackAlong(section, items, {
                      throughSections: true,
                      vertical: true,
                    }),
                  ),
                ),
              );
              const usesKpiPad = sections.some((section) =>
                sectionUsesVerticalKpiPad(section, items),
              );
              const kpiPad = usesKpiPad ? VERTICAL_KPI_PAD : 0;
              const sectionTrackH = Math.max(0, trackH - kpiPad);
              const shellAlong = Math.max(
                relatedSpan,
                ...sections.map((section) =>
                  sectionAlongSpan(section, { relatedSpan, trackSpan: sectionTrackH }),
                ),
              );
              const shellH = sectionShellAlong(shellAlong, {
                hasOverlay: true,
                overlaySpan: relatedSpan,
              });
              const groupH = shellH > 0 ? shellH + kpiPad : undefined;
              return (
                <div
                  key={`span-${floor.key}`}
                  className="relative flex shrink-0 flex-col"
                  style={{
                    alignSelf,
                    height: groupH,
                  }}
                >
                  {usesKpiPad ? (
                    <div className="shrink-0" style={{ height: kpiPad }} aria-hidden />
                  ) : null}
                  <div
                    className="relative flex shrink-0"
                    style={{ gap: PIECE_GAP, height: shellH > 0 ? shellH : undefined }}
                  >
                    {sections.map((section) => (
                      <VerticalAisleBand
                        key={section.key}
                        block={section}
                        align={floorAlign}
                        trackSpan={sectionTrackH}
                        relatedSpan={relatedSpan}
                      />
                    ))}
                    {/* Entre los dos pasillos (eje fino centrado); alto según alineación del piso. */}
                    <div className="pointer-events-auto absolute inset-0 z-[1]">
                      <div
                        className="absolute"
                        style={overlayPositionStyle(floorAlign, { vertical: true })}
                      >
                        {renderFloorOverlayWithKpi(floor, {
                          vertical: true,
                          align: floorAlign,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const block = entry.block;
            const overlayFloors = isSectionBlock(block)
              ? floorsOverlappingSection(items, block).filter((floor) =>
                  floorShowsPositions(floor, layout),
                )
              : [];
            // Solo absolute/solapar mira racks al otro lado; sin eso = solo relacionados.
            const throughSections =
              isSectionBlock(block) && floorsOverlappingSection(items, block).length > 0;
            // Relacionado = cuerpo sin contador (fórmula + DOM). Arriba/Medio/Abajo igual.
            const relatedSpan = isSectionBlock(block)
              ? Math.max(
                  relatedSpanForSection(block, items, verticalSectionSpan, {
                    vertical: true,
                    planLayout: layout,
                    throughSections,
                  }),
                  measuredRelatedRackAlong(block, items, {
                    throughSections,
                    vertical: true,
                  }),
                )
              : 0;
            const overlayCross = overlayFloorCross(overlayFloors, {
              vertical: true,
              planLayout: layout,
            });
            const align = overlayFloors.length
              ? stackAlignOf(layout, overlayFloors[0])
              : stackAlignOf(layout, block);
            const alignSelf =
              align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start";
            const usesKpiPad =
              isSectionBlock(block) && sectionUsesVerticalKpiPad(block, items);
            const kpiPad = usesKpiPad ? VERTICAL_KPI_PAD : 0;
            const sectionTrackH = Math.max(0, trackH - kpiPad);
            const bandAlong = isSectionBlock(block)
              ? sectionAlongSpan(block, { relatedSpan, trackSpan: sectionTrackH })
              : 0;
            const shellH = isSectionBlock(block)
              ? sectionShellAlong(bandAlong, {
                  hasOverlay: overlayFloors.length > 0,
                  overlaySpan: relatedSpan,
                })
              : 0;
            const groupH = isSectionBlock(block) && shellH > 0 ? shellH + kpiPad : undefined;
            return (
              <div
                key={block.key}
                className={`relative flex shrink-0 ${isSectionBlock(block) ? "flex-col" : ""}`}
                style={{
                  alignSelf,
                  height: groupH,
                }}
              >
                {isSectionBlock(block) ? (
                  <>
                    {usesKpiPad ? (
                      <div className="shrink-0" style={{ height: kpiPad }} aria-hidden />
                    ) : null}
                    <div
                      className="relative flex shrink-0"
                      style={shellH > 0 ? { height: shellH } : undefined}
                    >
                      <VerticalAisleBand
                        block={block}
                        align={align}
                        trackSpan={sectionTrackH}
                        relatedSpan={relatedSpan}
                        crossSpan={overlayCross}
                      />
                      {overlayFloors.map((floorBlock) => {
                        const floorAlign = stackAlignOf(layout, floorBlock);
                        return (
                          <div
                            key={`ov-${floorBlock.key}`}
                            className="pointer-events-auto absolute z-[1]"
                            style={overlayPositionStyle(floorAlign, { vertical: true })}
                          >
                            {renderFloorOverlayWithKpi(floorBlock, {
                              vertical: true,
                              align: floorAlign,
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : isFloorBlock(block) ? (
                  (() => {
                    const places = floorShowsPositions(block, layout) ? floorPositionPlaces(block) : [];
                    const kpis = places.length
                      ? blockOccupancyKpis(block, blocks, occupancy)
                      : null;
                    const kpiActive =
                      kpiSelected?.scope === "hilera" && kpiSelected.blockKey === block.key;
                    return (
                      <VerticalFloorBand
                        block={block}
                        blocks={blocks}
                        align={align}
                        showPositions={floorShowsPositions(block, layout)}
                        selected={selected}
                        occupancy={occupancy}
                        onSelect={selectAisleCell}
                        kpiTotal={kpis ? kpis.total : null}
                        kpiActive={kpiActive}
                        onKpiClick={kpis ? (event) => selectHileraKpi(block, event) : undefined}
                      />
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-start">
                    {renderRack(block, { vertical: true, showTopAxis: true })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSection(section, sectionIndex) {
    const axis = section.axis || masterAxis;
    if (axis === "vertical") {
      const onlyMain = !section.before.length && !section.after.length;
      const hasCross = section.before.length || section.after.length;
      return (
        <div
          key={sectionIndex}
          className="flex w-full min-w-0 flex-col items-stretch justify-start"
          style={{
            gap: hasCross ? CROSS_ORIENTATION_GAP : undefined,
            ...(onlyMain ? { minHeight: planFrameMinStyle(masterAxis).minHeight } : null),
          }}
        >
          {section.before.length ? (
            <div className="flex w-full shrink-0 flex-col items-stretch">
              {renderMiddleGroups(section.before)}
            </div>
          ) : null}
          {section.main.length ? (
            <div
              className={`flex w-full shrink-0 items-stretch ${onlyMain ? "min-h-0 flex-1" : ""}`}
            >
              {renderVerticalStrip(section.main, { fill: false })}
            </div>
          ) : null}
          {section.after.length ? (
            <div className="flex w-full shrink-0 flex-col items-stretch">
              {renderMiddleGroups(section.after)}
            </div>
          ) : null}
        </div>
      );
    }

    const onlyFlanks = !section.main.length;
    const hasCross = !onlyFlanks && (section.before.length || section.after.length);
    return (
      <div
        key={sectionIndex}
        className="flex w-full min-w-0 items-stretch justify-start"
        style={{ gap: hasCross ? CROSS_ORIENTATION_GAP : undefined }}
      >
        {section.before.length ? (
          <div
            className={`flex items-stretch self-stretch ${
              onlyFlanks ? "min-w-0 flex-1" : "shrink-0"
            }`}
          >
            {renderVerticalStrip(section.before, { fill: onlyFlanks })}
          </div>
        ) : null}
        {section.main.length ? (
          <div className="flex min-w-0 flex-1 flex-col items-stretch self-stretch">
            {renderMiddleGroups(section.main)}
          </div>
        ) : null}
        {section.after.length ? (
          <div
            className={`flex items-stretch self-stretch ${
              onlyFlanks ? "min-w-0 flex-1" : "shrink-0"
            }`}
          >
            {renderVerticalStrip(section.after, { fill: onlyFlanks })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showTitle ? <p className="text-base font-semibold text-slate-800">{cavaTitle}</p> : null}
          <button
            type="button"
            title="Ver KPIs de la cava"
            onClick={selectCavaKpi}
            className={`${showTitle ? "mt-1 " : ""}flex cursor-pointer flex-col items-start gap-1 rounded-md px-0 py-0.5 text-left transition-colors ${
              kpiSelected?.scope === "cava" ? "text-sky-800" : "hover:text-sky-800"
            }`}
          >
            <span className="text-sm font-semibold tabular-nums text-slate-800">
              {cavaKpis.total || total}{" "}
              <span className="font-medium text-slate-600">ubicaciones</span>
            </span>
            {sections.length ? (
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500" /> Libre{" "}
                  <span className="font-semibold tabular-nums text-slate-700">{cavaKpis.libre}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-orange-500" /> Asignado{" "}
                  <span className="font-semibold tabular-nums text-slate-700">{cavaKpis.asignado}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-red-500" /> Ocupado{" "}
                  <span className="font-semibold tabular-nums text-slate-700">{cavaKpis.ocupado}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-slate-400" /> Inactivo{" "}
                  <span className="font-semibold tabular-nums text-slate-700">{cavaKpis.inactivo}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-sky-500" /> Picking{" "}
                  <span className="font-semibold tabular-nums text-slate-700">{cavaKpis.picking}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-amber-500" /> Push{" "}
                  <span className="font-semibold tabular-nums text-slate-700">{cavaKpis.push}</span>
                </span>
              </span>
            ) : null}
          </button>
        </div>
        {sections.length ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {typeof onShowFloorPositionsChange === "function" || readOnly ? (
              <Form.Check
                type="checkbox"
                id="cava-show-floor-positions"
                className="!mb-0 text-xs"
                label="Ver posiciones de piso"
                checked={showFloorPositions}
                onChange={(event) => {
                  const checked = event.target.checked;
                  if (readOnly || typeof onShowFloorPositionsChange !== "function") {
                    setFloorPreview(checked);
                    return;
                  }
                  setFloorPreview(null);
                  onShowFloorPositionsChange(checked);
                }}
              />
            ) : null}
            <Button variant="outline" size="sm" icon={Expand} onClick={onOpen}>
              Abrir plano
            </Button>
            <Button variant="outline" size="sm" icon={Download} loading={downloading} onClick={onDownload}>
              Descargar
            </Button>
          </div>
        ) : null}
      </div>
      {notice ? <p className="mb-2 text-xs text-red-600">{notice}</p> : null}
      <AnimatePresence initial={false}>
        {selectedBlock ? (
          <CellPositionsMenu
            key={`${selected.blockKey}-${selected.token}-${selected.place}`}
            cavaId={cavaId}
            hall={selectedAisle}
            rack={selectedIsFloor ? "" : selected.token}
            place={selectedIsFloor ? undefined : selected.place}
            places={selectedIsFloor ? selectedPlaces : null}
            title={selectedTitle}
            readOnly={readOnly}
            anchorEl={selected.anchorEl}
            onClose={() => setSelected(null)}
            onChanged={() => setOccupancyTick((value) => value + 1)}
          />
        ) : null}
        {kpiSelected && kpiMenuData ? (
          <HileraKpisMenu
            key={kpiSelected.scope === "cava" ? "cava-kpis" : `hilera-${kpiSelected.blockKey}`}
            title={kpiMenuTitle}
            kpis={kpiMenuData}
            anchorEl={kpiSelected.anchorEl}
            onClose={() => setKpiSelected(null)}
            cavaId={cavaId}
            hall={kpiPushHall}
            racks={kpiPushRacks}
            showPush={kpiShowPush}
            isPush={kpiIsPush}
            readOnly={readOnly}
            onChanged={() => setOccupancyTick((value) => value + 1)}
          />
        ) : null}
      </AnimatePresence>
      <div
        className="flex w-full max-w-full justify-center overflow-x-auto"
        style={{ padding: DOOR_OVERHANG }}
      >
        {/* Lienzo a ancho mín.; el contenido llena el frame para que “medio” centre. */}
        <div
          className="relative box-border w-max max-w-full border-2 border-slate-700 bg-white"
          style={{ padding: FRAME_PAD, ...planFrameMinStyle(masterAxis) }}
        >
          <DoorMarks doors={layout.doors} />
          <div
            className="relative flex min-h-0 w-full min-w-0 flex-col items-stretch justify-start"
            style={{ gap: CROSS_ORIENTATION_GAP }}
          >
            {sections.length ? (
              sections.map((section, sectionIndex) => renderSection(section, sectionIndex))
            ) : (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-400">
                Agregue racks para ver el plano.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
