"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Download, Expand } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { Button, Form } from "@/components/ui/bootstrap";
import { getCavaOccupancy } from "@/services/storageService";
import {
  aisleDisplayName,
  aislePositionPlaces,
  blockOccupancyKpis,
  cavaOccupancyKpis,
  cavaTitleOf,
  contiguousBlockGroups,
  countSlots,
  depthCodesOf,
  hileraLabel,
  planSections,
  rackTokensOf,
  relatedRacksForAisle,
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
  AISLE_BAND_PAD_UI,
  AISLE_BOX_PAD_UI,
  AISLE_DOT_GAP_UI,
  AISLE_DOT_UI,
  AISLE_POS_GAP_UI,
  aisleBandThickness,
  aisleGroupBoxSize,
  chunkAislePlaces,
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

/** Ancho de hilera horizontal (eje + racks). */
function horizontalRackSpan(block) {
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  if (!tokens.length || !places.length) return 0;
  return AXIS_SIDE + AXIS_GAP + tokens.length * CELL + Math.max(tokens.length - 1, 0) * PIECE_GAP;
}

/** Ancho total de la fila horizontal: KPI izquierdo + eje + racks (mismo que el pasillo). */
function horizontalRowSpan(block) {
  const rack = horizontalRackSpan(block);
  if (!rack) return 0;
  return HILERA_KPI_SIDE_W + HILERA_KPI_INNER_GAP + rack;
}

/** Alto de hilera vertical (eje superior + mb + gap + racks apilados). */
function verticalRackSpan(block) {
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  if (!tokens.length || !places.length) return 0;
  const axisBlock = places.length >= 1 ? AXIS_TOP + AXIS_GAP : 0;
  return axisBlock + tokens.length * CELL + Math.max(tokens.length - 1, 0) * PIECE_GAP;
}

function maxSpan(blocks, spanOf) {
  if (!blocks?.length) return 0;
  return Math.max(0, ...blocks.map(spanOf));
}

/** Ancho/alto del pasillo = hilera relacionada (o la más ancha del tramo). */
function aisleSpanFor(aisle, scope, spanOf) {
  const related = relatedRacksForAisle(scope, aisle);
  const racks = related.length ? related : (scope || []).filter((block) => block.kind === "rack");
  return Math.max(1, maxSpan(racks, spanOf));
}

/** Pista común: la hilera de rack más ancha/alta del tramo. */
function trackSpanFor(scope, spanOf) {
  const racks = (scope || []).filter((block) => block.kind === "rack");
  if (racks.length) return Math.max(1, maxSpan(racks, spanOf));
  return Math.max(
    1,
    ...(scope || [])
      .filter((block) => block.kind === "aisle")
      .map((block) => aisleSpanFor(block, scope, spanOf)),
  );
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
            title={`Nivel ${item.level} · ${markLabel(item)}`}
            className={`shrink-0 ${markClass(item)}`}
            style={{ width: MARK, height: MARK }}
          />
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

  // Borde externo en el grid + solo right/bottom en celdas → sin doble trazo interno.
  const grid = (
    <div
      className={`grid shrink-0 border-l border-t bg-white ${cellBorder}`}
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
            className={`flex h-full w-full cursor-pointer items-center justify-center border-b border-r bg-white ${cellBorder} ${selected ? "ring-2 ring-inset ring-sky-500" : "hover:bg-slate-50"}`}
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
      <div className="flex flex-col items-start" style={{ gap: AXIS_GAP }}>
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

/** Ver cavaAisleVisual.js — misma geometría que el SVG zoom. */
const AISLE_POS_GAP = AISLE_POS_GAP_UI;

function AislePalletMark({ place, marks, selected, onSelect }) {
  const item = marks?.[0];
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={place}
      title={item ? `${place} · ${markLabel(item)}` : place}
      className={`flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 ${
        selected ? "ring-2 ring-sky-500 ring-offset-1" : ""
      }`}
      style={{ width: AISLE_DOT_UI, height: AISLE_DOT_UI }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(place, event);
      }}
    >
      {item ? (
        <span className={`block h-full w-full ${markClass(item)}`} />
      ) : (
        <span className="block h-full w-full border border-amber-400 bg-transparent" />
      )}
    </button>
  );
}

/**
 * Naranja: capacidad 3 en el ancho del pasillo.
 * Pasillo H → verdes en columna; pasillo V → verdes en fila.
 */
function AisleGroupCell({
  places,
  code,
  blockKey,
  selected,
  occupancy,
  onSelect,
  aisleVertical = false,
}) {
  const anySelected = places.some(
    (place) => selected?.blockKey === blockKey && selected?.place === place,
  );
  const box = aisleGroupBoxSize({ svg: false, aisleVertical });
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-start border border-dashed bg-white ${
        aisleVertical ? "flex-row" : "flex-col"
      } ${
        anySelected
          ? "border-sky-500 ring-2 ring-inset ring-sky-400"
          : "border-amber-500"
      }`}
      style={{
        boxSizing: "content-box",
        width: box.contentW,
        height: box.contentH,
        gap: AISLE_DOT_GAP_UI,
        padding: AISLE_BOX_PAD_UI,
      }}
    >
      {places.map((place) => (
        <AislePalletMark
          key={place}
          place={place}
          marks={occupancy?.[slotKey(code, "", place)] || []}
          selected={selected?.blockKey === blockKey && selected?.place === place}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function aislePlacesCluster(places, align, axis) {
  if (!places.length) return null;
  const fromEnd = align === "end";
  const centered = align === "center";
  const edge = AISLE_BAND_PAD_UI;
  if (axis === "vertical") {
    return {
      className: `absolute inset-x-0 z-[1] flex items-center justify-center px-0 ${
        fromEnd
          ? "flex-col-reverse"
          : centered
            ? "top-1/2 -translate-y-1/2 flex-col"
            : "flex-col"
      }`,
      style: {
        gap: AISLE_POS_GAP,
        ...(fromEnd ? { bottom: edge } : centered ? null : { top: edge }),
      },
    };
  }
  return {
    className: `absolute inset-y-0 z-[1] flex items-center ${
      fromEnd
        ? "flex-row-reverse"
        : centered
          ? "left-1/2 -translate-x-1/2"
          : ""
    }`,
    style: {
      gap: AISLE_POS_GAP,
      ...(fromEnd ? { right: edge } : centered ? null : { left: edge }),
    },
  };
}

function AislePlaceGroup({
  places,
  code,
  blockKey,
  selected,
  occupancy,
  onSelect,
  aisleVertical = false,
}) {
  return chunkAislePlaces(places).map((chunk) => (
    <AisleGroupCell
      key={chunk.join("-")}
      places={chunk}
      code={code}
      blockKey={blockKey}
      selected={selected}
      occupancy={occupancy}
      onSelect={onSelect}
      aisleVertical={aisleVertical}
    />
  ));
}

function AisleBand({
  block,
  align = "start",
  showPositions = false,
  selected,
  occupancy,
  onSelect,
  kpiTotal = null,
  kpiActive = false,
  onKpiClick,
}) {
  const code = String(block.code || "").trim();
  const label = aisleDisplayName(code);
  const places = showPositions ? aislePositionPlaces(block) : [];
  const cluster = aislePlacesCluster(places, align, "horizontal");
  const groupBox = aisleGroupBoxSize({ svg: false, aisleVertical: false });
  const bandH = places.length
    ? aisleBandThickness(groupBox, { emptySize: AISLE_SIZE })
    : AISLE_SIZE;
  return (
    <div
      className="relative flex w-full items-center justify-center border-y-2 border-dashed border-slate-400 bg-slate-50 px-4"
      style={{ height: bandH, minHeight: bandH }}
    >
      <span className="pointer-events-none text-sm font-semibold tracking-wide text-slate-500">
        {label}
      </span>
      {cluster ? (
        <div className={cluster.className} style={cluster.style}>
          <AislePlaceGroup
            places={places}
            code={code}
            blockKey={block.key}
            selected={selected}
            occupancy={occupancy}
            aisleVertical={false}
            onSelect={(place, event) => onSelect?.(block, place, event)}
          />
          {kpiTotal != null && onKpiClick ? (
            <HileraKpiBadge
              total={kpiTotal}
              placement="left"
              active={kpiActive}
              onClick={onKpiClick}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function VerticalAisleBand({
  block,
  align = "start",
  showPositions = false,
  selected,
  occupancy,
  onSelect,
  kpiTotal = null,
  kpiActive = false,
  onKpiClick,
}) {
  const code = String(block.code || "").trim();
  const label = aisleDisplayName(code);
  const places = showPositions ? aislePositionPlaces(block) : [];
  const cluster = aislePlacesCluster(places, align, "vertical");
  const groupBox = aisleGroupBoxSize({ svg: false, aisleVertical: true });
  const bandW = places.length
    ? aisleBandThickness(groupBox, { emptySize: AISLE_SIZE })
    : AISLE_SIZE;
  return (
    <div
      className="relative flex h-full min-h-full shrink-0 items-center justify-center self-stretch border-x-2 border-dashed border-slate-400 bg-slate-50 py-3"
      style={{ width: bandW }}
    >
      <span className="pointer-events-none text-xs font-semibold tracking-wide text-slate-500 [writing-mode:vertical-rl]">
        {label}
      </span>
      {cluster ? (
        <div className={cluster.className} style={cluster.style}>
          <AislePlaceGroup
            places={places}
            code={code}
            blockKey={block.key}
            selected={selected}
            occupancy={occupancy}
            aisleVertical
            onSelect={(place, event) => onSelect?.(block, place, event)}
          />
          {kpiTotal != null && onKpiClick ? (
            <HileraKpiBadge
              total={kpiTotal}
              placement="top"
              active={kpiActive}
              onClick={onKpiClick}
            />
          ) : null}
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
  onShowAislePositionsChange = null,
}) {
  const cavaTitle = cavaTitleOf(name, code);
  const rackPrefix = nomenclature?.rack_prefix || "";
  const layout = useMemo(() => normalizePlanLayout(planLayout, blocks), [planLayout, blocks]);
  const showAislePositions = Boolean(layout.show_aisle_positions);
  const total = countSlots(blocks, { includeAislePositions: showAislePositions });
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
  const rackSpanRefs = useRef(new Map());
  const cavaKpis = useMemo(
    () => cavaOccupancyKpis(occupancy, { includeAislePositions: showAislePositions }),
    [occupancy, showAislePositions],
  );
  const planImage = useMemo(
    () => buildCavaPlanSvg({ name, code, blocks, nomenclature, occupancy, planLayout: layout }),
    [name, code, blocks, nomenclature, occupancy, layout],
  );

  const refreshTrackWidth = () => {
    let max = 0;
    rackSpanRefs.current.forEach((node) => {
      if (node) max = Math.max(max, Math.ceil(node.getBoundingClientRect().width));
    });
    setMeasuredTrackW((prev) => (prev === max ? prev : max));
  };

  const setRackSpanRef = (key, node) => {
    if (node) rackSpanRefs.current.set(key, node);
    else rackSpanRefs.current.delete(key);
  };

  useLayoutEffect(() => {
    // Doble rAF: tras pintar racks medir el ancho real de la hilera más ancha.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      refreshTrackWidth();
      raf2 = requestAnimationFrame(refreshTrackWidth);
    });
    const nodes = [...rackSpanRefs.current.values()];
    if (!nodes.length || typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    const observer = new ResizeObserver(() => refreshTrackWidth());
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
  const selectedIsAisle = selectedBlock?.kind === "aisle";
  const selectedAisle = selectedIsAisle
    ? String(selectedBlock.code || "").trim()
    : selectedBlock
      ? suggestedAisleCode(blocks, selectedBlock)
      : "";
  const selectedTitle = selectedIsAisle
    ? [aisleDisplayName(selectedAisle), selected.place].filter(Boolean).join(" · ")
    : selectedBlock
      ? [
          `${rackPrefix}${selected.token}`,
          selected.place,
          selectedAisle ? aisleDisplayName(selectedAisle) : "",
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
      : kpiBlock?.kind === "aisle"
        ? aisleDisplayName(kpiBlock.code)
        : kpiBlock
          ? `Hilera ${hileraLabel(kpiBlock, rackPrefix)}`
          : "";
  const kpiMenuData =
    kpiSelected?.scope === "cava"
      ? cavaKpis
      : kpiBlock
        ? blockOccupancyKpis(kpiBlock, blocks, occupancy)
        : null;

  function selectCell(block, token, place, event) {
    const anchorEl = event.currentTarget;
    setKpiSelected(null);
    setSelected((current) => (
      current && current.blockKey === block.key && current.token === token && current.place === place
        ? null
        : { blockKey: block.key, token, place, anchorEl }
    ));
  }

  function selectAisleCell(block, place, event) {
    selectCell(block, "", place, event);
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
          ref={(node) => setRackSpanRef(block.key, node)}
          data-rack-span={block.key}
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
          <div className="flex w-max shrink-0 items-start" style={{ gap: AXIS_GAP }}>
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
    const estimated = Math.max(trackSpanFor(middle, horizontalRowSpan), 1);
    const trackW = Math.max(estimated, measuredTrackW);
    const groups = contiguousBlockGroups(middle);
    // Mismos huecos que columnas verticales (PIECE_GAP + divisor hermano).
    return (
      <div className="flex w-full flex-col items-stretch" style={{ gap: PIECE_GAP }}>
        {groups.map((group) => {
          if (group.kind === "rack") {
            return (
              <div
                key={`rack-group-${group.blocks[0].key}`}
                className="flex w-full flex-col"
                style={{ gap: PIECE_GAP }}
              >
                {group.blocks.map((block, index) => {
                  const align = rowAlignOf(layout, block);
                  const prev = group.blocks[index - 1];
                  return (
                    <Fragment key={block.key}>
                      {prev ? (
                        <div className={`flex w-full items-start ${justifyClass(align)}`}>
                          <div className="h-px shrink-0 bg-black" style={{ width: trackW }} />
                        </div>
                      ) : null}
                      {renderMiddleRackRow(block)}
                    </Fragment>
                  );
                })}
              </div>
            );
          }
          return (
            <div
              key={`aisle-group-${group.blocks[0].key}`}
              className="flex w-full flex-col"
              style={{ gap: PIECE_GAP }}
            >
              {group.blocks.map((block) => {
                const align = rowAlignOf(layout, block);
                const aislePlaces = showAislePositions ? aislePositionPlaces(block) : [];
                const kpis = aislePlaces.length
                  ? blockOccupancyKpis(block, blocks, occupancy)
                  : null;
                const kpiActive =
                  kpiSelected?.scope === "hilera" && kpiSelected.blockKey === block.key;
                return (
                  <div
                    key={block.key}
                    className={`flex w-full items-start ${justifyClass(align)}`}
                  >
                    <div className="shrink-0" style={{ width: trackW }}>
                      <AisleBand
                        block={block}
                        align={align}
                        showPositions={showAislePositions}
                        selected={selected}
                        occupancy={occupancy}
                        onSelect={selectAisleCell}
                        kpiTotal={kpis ? kpis.total : null}
                        kpiActive={kpiActive}
                        onKpiClick={kpis ? (event) => selectHileraKpi(block, event) : undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  /** Columnas verticales (flanco en master H, o tramo medio en master V). */
  function renderVerticalStrip(sideBlocks, { fill = false } = {}) {
    const items = sideBlocks || [];
    // items-stretch: el pasillo hereda la altura real de la hilera más alta (sin estimar).
    // Divisor como hermano (no dentro del rack): el gap lo centra igual que en horizontal.
    return (
      <div
        className={`flex items-stretch ${fill ? "w-full justify-start" : "w-max"}`}
        style={{ gap: PIECE_GAP }}
      >
        {items.map((block, index) => {
          const stackAlign = stackAlignOf(layout, block);
          const prev = items[index - 1];
          const showDivider = prev && prev.kind === "rack" && block.kind === "rack";
          const isAisle = block.kind === "aisle";
          return (
            <Fragment key={block.key}>
              {showDivider ? (
                <div className="flex w-px shrink-0 self-stretch bg-black" aria-hidden />
              ) : null}
              <div className="flex shrink-0 items-stretch self-stretch">
                {isAisle ? (
                  (() => {
                    const aislePlaces = showAislePositions ? aislePositionPlaces(block) : [];
                    const kpis = aislePlaces.length
                      ? blockOccupancyKpis(block, blocks, occupancy)
                      : null;
                    const kpiActive =
                      kpiSelected?.scope === "hilera" && kpiSelected.blockKey === block.key;
                    return (
                      <VerticalAisleBand
                        block={block}
                        align={stackAlign}
                        showPositions={showAislePositions}
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
                  <div className={`flex flex-col self-stretch ${justifyClass(stackAlign)}`}>
                    {renderRack(block, { vertical: true, showTopAxis: true })}
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
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
              </span>
            ) : null}
          </button>
        </div>
        {sections.length ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {typeof onShowAislePositionsChange === "function" ? (
              <Form.Check
                type="checkbox"
                id="cava-show-aisle-positions"
                className="!mb-0 text-xs"
                label="Ver posiciones de pasillo?"
                checked={showAislePositions}
                disabled={readOnly}
                onChange={(event) => onShowAislePositionsChange(event.target.checked)}
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
            rack={selectedIsAisle ? "" : selected.token}
            place={selected.place}
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
