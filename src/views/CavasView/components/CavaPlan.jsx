"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Download, Expand } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/bootstrap";
import { getCavaOccupancy } from "@/services/storageService";
import {
  cavaTitleOf,
  countSlots,
  depthCodesOf,
  planRows,
  rackTokensOf,
  slotKey,
  suggestedAisleCode,
} from "../cavaPlan";
import { buildCavaPlanSvg, downloadCavaPlan, openCavaPlanTab } from "../cavaPlanImage";
import CellPositionsMenu from "./CellPositionsMenu";

const CELL_MIN = 28;
const CELL_MAX = 40;

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

function RackDrawing({ token, places, rackPrefix, direction, labelSide, fill, selectedPlace, marksFor, onSelect }) {
  const cells = Math.max(places.length, 1);
  const columns = direction === "vertical" ? cells : 1;
  const rows = direction === "vertical" ? 1 : cells;
  const label = `${rackPrefix || ""}${token}`;
  const track = fill ? `minmax(${CELL_MIN}px, ${CELL_MAX}px)` : `${CELL_MIN}px`;

  return (
    <div
      className={`flex items-center gap-1 ${fill ? "w-full flex-1" : ""} ${labelSide === "above" ? "flex-col-reverse" : "flex-col"}`}
      style={fill ? { minWidth: columns * CELL_MIN, maxWidth: columns * CELL_MAX } : undefined}
    >
      <div
        className={`grid border border-slate-900 bg-white ${fill ? "w-full" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, ${track})`,
          gridTemplateRows: `repeat(${rows}, ${track})`,
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
              className={`flex aspect-square h-full w-full min-h-7 min-w-7 max-h-10 max-w-10 cursor-pointer items-center justify-center border border-slate-900 bg-white ${selected ? "ring-2 ring-inset ring-sky-500" : "hover:bg-slate-50"}`}
              onClick={(event) => onSelect(place, event)}
            >
              {marks.length ? (
                <span className="flex max-h-full max-w-full flex-wrap content-center items-center justify-center gap-px p-0.5">
                  {marks.map((item) => (
                    <span
                      key={item.level}
                      title={`Nivel ${item.level} · ${markLabel(item)}`}
                      className={`h-2.5 w-2.5 ${markClass(item)}`}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <span className="max-w-10 truncate text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
}

function RackBand({ block, rackPrefix, direction, selected, marksFor, onSelect }) {
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  const levels = Number(block.levels) || 0;
  if (!tokens.length || levels < 1 || !places.length) {
    return <p className="text-xs text-slate-400">Rack incompleto</p>;
  }
  const horizontal = direction !== "vertical";
  return (
    <div className={horizontal ? "flex w-max min-w-full items-end gap-1" : "inline-flex flex-col items-stretch gap-3"}>
      {tokens.map((token) => (
        <RackDrawing
          key={token}
          token={token}
          places={places}
          rackPrefix={rackPrefix}
          direction={direction}
          labelSide={block.label_side}
          fill={horizontal}
          selectedPlace={selected?.blockKey === block.key && selected?.token === token ? selected.place : ""}
          marksFor={marksFor}
          onSelect={(place, event) => onSelect(block, token, place, event)}
        />
      ))}
    </div>
  );
}

function rowIsRacks(row) {
  return row.length > 0 && row.every((block) => block.kind !== "aisle");
}

function AisleBand({ block, aislePrefix }) {
  const code = String(block.code || "").trim();
  const label = code ? `Pasillo ${aislePrefix}${code}` : "Pasillo";
  return (
    <div className="flex h-14 w-full items-center justify-center border-y-2 border-dashed border-slate-400 bg-slate-50">
      <span className="text-sm font-semibold tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

export default function CavaPlan({
  cavaId,
  name,
  code,
  blocks,
  nomenclature,
  readOnly = false,
  occupancyRevision = 0,
  showTitle = true,
}) {
  const total = countSlots(blocks);
  const cavaTitle = cavaTitleOf(name, code);
  const rackPrefix = nomenclature?.rack_prefix || "";
  const aislePrefix = nomenclature?.aisle_prefix || "";
  const rows = planRows(blocks);
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [occupancy, setOccupancy] = useState({});
  const [occupancyTick, setOccupancyTick] = useState(0);
  const planImage = useMemo(
    () => buildCavaPlanSvg({ name, code, blocks, nomenclature, occupancy }),
    [name, code, blocks, nomenclature, occupancy],
  );

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
  const selectedAisle = selectedBlock ? suggestedAisleCode(blocks, selectedBlock) : "";
  const selectedTitle = selectedBlock
    ? [
        `${rackPrefix}${selected.token}`,
        selected.place,
        selectedAisle ? `Pasillo ${aislePrefix}${selectedAisle}` : "",
      ].filter(Boolean).join(" · ")
    : "";

  function selectCell(block, token, place, event) {
    const anchorEl = event.currentTarget;
    setSelected((current) => (
      current && current.blockKey === block.key && current.token === token && current.place === place
        ? null
        : { blockKey: block.key, token, place, anchorEl }
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

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showTitle ? <p className="text-base font-semibold text-slate-800">{cavaTitle}</p> : null}
          <div className={`${showTitle ? "mt-1 " : ""}flex flex-wrap items-center justify-start gap-x-3 gap-y-1`}>
            <p className="text-sm text-slate-600">{total} ubicaciones</p>
            {rows.length ? (
              <p className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-500" /> Libre</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 bg-orange-500" /> Asignado</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 bg-red-500" /> Ocupado</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 bg-slate-400" /> Inactivo</span>
              </p>
            ) : null}
          </div>
        </div>
        {rows.length ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
            rack={selected.token}
            place={selected.place}
            title={selectedTitle}
            readOnly={readOnly}
            anchorEl={selected.anchorEl}
            onClose={() => setSelected(null)}
            onChanged={() => setOccupancyTick((value) => value + 1)}
          />
        ) : null}
      </AnimatePresence>
      <div className="w-full overflow-x-auto pt-1">
        {rows.length ? (
          <div className="flex w-max min-w-full flex-col items-stretch">
            {rows.map((row, rowIndex) => {
              const previous = rows[rowIndex - 1];
              const contiguousRacks = previous && rowIsRacks(previous) && rowIsRacks(row);
              return (
                <Fragment key={rowIndex}>
                  {rowIndex > 0 ? (
                    contiguousRacks ? (
                      <div className="my-1 h-0.5 w-full bg-slate-400" />
                    ) : (
                      <div className="h-5" />
                    )
                  ) : null}
                  <div className={row.length > 1 ? "flex items-stretch" : "w-full"}>
                    {row.map((block, index) => {
                      const splitGroups = index > 0 && row[index - 1].kind !== "aisle" && block.kind !== "aisle";
                      if (block.kind === "aisle") {
                        return block.orientation === "vertical" ? (
                          <div
                            key={block.key || index}
                            className="flex w-14 shrink-0 items-center justify-center border-x-2 border-dashed border-slate-400 bg-slate-50"
                          >
                            <span className="text-xs font-semibold tracking-wide text-slate-500 [writing-mode:vertical-rl]">
                              {String(block.code || "").trim()
                                ? `Pasillo ${aislePrefix}${String(block.code).trim()}`
                                : "Pasillo"}
                            </span>
                          </div>
                        ) : (
                          <AisleBand key={block.key || index} block={block} aislePrefix={aislePrefix} />
                        );
                      }
                      return (
                        <Fragment key={block.key || index}>
                          {splitGroups ? <div className="w-0.5 shrink-0 bg-slate-400" /> : null}
                          <RackBand
                            block={block}
                            rackPrefix={rackPrefix}
                            direction={block.orientation === "vertical" ? "vertical" : "horizontal"}
                            selected={selected}
                            marksFor={(token, place) => occupancy[slotKey(suggestedAisleCode(blocks, block), token, place)] || []}
                            onSelect={selectCell}
                          />
                        </Fragment>
                      );
                    })}
                  </div>
                </Fragment>
              );
            })}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">Agregue racks para ver el plano.</p>
        )}
      </div>
    </div>
  );
}
