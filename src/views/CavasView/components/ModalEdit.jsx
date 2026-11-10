"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, DoorOpen, GripVertical, LayoutGrid, Plus, Save, Trash2, X } from "lucide-react";

import { Modal, Button, Form, Alert } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { getApiErrorMessage } from "@/services/httpClient";
import {
  createCava,
  generateCavaPositions,
  getCavaGeneration,
  getPositionNomenclature,
  getStorages,
  updateCava,
} from "@/services/storageService";
import { conditionLabels } from "../cavaLabels";
import {
  aisleCodeFromSelect,
  aisleDisplayName,
  aisleSelectValue,
  blocksPayload,
  cavaTitleOf,
  rackTokensOf,
  uniqueAisleToken,
} from "../cavaPlan";
import {
  DOOR_WALL_OPTIONS,
  MASTER_ORIENTATION_OPTIONS,
  defaultLabelSide,
  defaultOrientationOf,
  depthAxisOf,
  depthAxisOptions,
  doorAnchorOptions,
  hydratePlanLayout,
  labelSideOptions,
  newDoor,
  normalizePlanLayout,
  planLayoutPayload,
  blockAlignOf,
  blockAlignOptions,
  setBlockAlign,
  setDepthAxis,
  switchMasterOrientation,
} from "../planLayout";
import CavaPlan from "./CavaPlan";

const ORIENTATION_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];
const RACK_GRID =
  "w-full grid-cols-[1.5rem_5.5rem_3.25rem_3.25rem_4rem_4.75rem_7.75rem_6.75rem_5.5rem_7.5rem_auto] justify-items-start";
/** Misma pista izquierda que rack: drag + nombre (+ token), luego campos pegados. */
const AISLE_GRID =
  "w-full grid-cols-[1.5rem_minmax(9rem,12rem)_7.75rem_6.75rem_max-content_3.25rem_auto] justify-items-start";
const FIELD_CLASS = "rounded-md";
const COMPACT_HEIGHT = 32;
const COMPACT_FIELD = "!h-8 rounded-md px-2 py-0 text-xs leading-none";
const LABEL_CLASS = "!mb-1.5 !text-xs !font-medium !text-slate-500";
const SELECT_STYLES = {
  control: (base) => ({ ...base, borderRadius: 6 }),
  menu: (base) => ({ ...base, borderRadius: 6 }),
};
const COMPACT_SELECT_STYLES = {
  control: (base) => ({
    ...base,
    minHeight: COMPACT_HEIGHT,
    height: COMPACT_HEIGHT,
    borderRadius: 6,
  }),
  valueContainer: (base) => ({ ...base, height: COMPACT_HEIGHT, padding: "0 6px" }),
  singleValue: (base) => ({
    ...base,
    overflow: "visible",
    textOverflow: "clip",
  }),
  indicatorsContainer: (base) => ({ ...base, height: COMPACT_HEIGHT }),
  dropdownIndicator: (base) => ({ ...base, padding: 2 }),
  menu: (base) => ({ ...base, borderRadius: 6 }),
};

const EMPTY_NOMENCLATURE = {
  separator: "-",
  cava_prefix: "C",
  aisle_prefix: "",
  rack_prefix: "R",
  level_prefix: "N",
};

const EMPTY_CAVA = {
  name: "",
  code: "",
  storage_id: "",
  condition: "",
  temp_min: "",
  temp_max: "",
  is_active: true,
  blocks: [],
  plan_layout: normalizePlanLayout(null),
};

function isBlank(value) {
  return !String(value ?? "").trim();
}

function normalizeNumber(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyRack(orientation = "horizontal") {
  const axis = orientation === "vertical" ? "vertical" : "horizontal";
  return {
    key: newKey(),
    kind: "rack",
    code: "1",
    rack_count: 1,
    levels: 1,
    depth: 1,
    orientation: axis,
    label_side: defaultLabelSide(axis),
    aisle_code: "",
  };
}

function nextAisleName(blocks) {
  const used = new Set();
  (blocks || []).forEach((block) => {
    if (block.kind !== "aisle") return;
    const match = /^Pasillo\s+(\d+)$/i.exec(String(block.name || "").trim());
    if (match) used.add(Number(match[1]));
  });
  let next = 1;
  while (used.has(next)) next += 1;
  return `Pasillo ${next}`;
}

function emptyAisle(orientation = "horizontal", blocks = []) {
  const axis = orientation === "vertical" ? "vertical" : "horizontal";
  const name = nextAisleName(blocks);
  const used = (blocks || []).filter((block) => block.kind === "aisle").map((block) => block.code);
  return {
    key: newKey(),
    kind: "aisle",
    name,
    code: uniqueAisleToken(name, used),
    create_aisle_positions: false,
    rack_count: 0,
    orientation: axis,
  };
}

function blocksFromApi(blocks) {
  const mapped = (blocks || []).map((block, index) => {
    const aisleCount =
      block.kind === "aisle" ? Math.max(0, Number(block.rack_count) || 0) : 0;
    const code = block.code || "";
    const name =
      block.kind === "aisle"
        ? String(block.name || "").trim() || aisleDisplayName({ code })
        : "";
    return {
      key: block.id ? `id-${block.id}` : newKey(),
      id: block.id,
      sort_order: block.sort_order ?? index,
      kind: block.kind,
      name,
      code,
      create_aisle_positions: block.kind === "aisle" ? aisleCount > 0 : false,
      rack_count: block.kind === "aisle" ? aisleCount : block.rack_count || 1,
      levels: block.levels || "",
      depth: block.depth || "",
      orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      label_side: block.label_side === "above" ? "above" : "below",
      aisle_code: block.aisle_code || "",
    };
  });
  const used = [];
  mapped.forEach((block) => {
    if (block.kind !== "aisle") return;
    if (!String(block.name || "").trim()) block.name = nextAisleName(mapped);
    if (!String(block.code || "").trim()) {
      block.code = uniqueAisleToken(block.name, used);
    }
    used.push(block.code);
  });
  return mapped;
}

function blockTitle(block, nomenclature) {
  if (block.kind === "aisle") {
    return aisleDisplayName(block);
  }
  const tokens = rackTokensOf(block);
  const prefix = nomenclature?.rack_prefix || "R";
  if (!tokens.length) return "Grupo de racks";
  const first = `${prefix}${tokens[0]}`;
  const last = `${prefix}${tokens[tokens.length - 1]}`;
  return tokens.length === 1 ? first : `${first} a ${last}`;
}

/** Renombra pasillo, recalcula token y actualiza aisle_code de racks ligados. */
function renameAisleBlocks(blocks, key, nextName) {
  const list = blocks || [];
  const target = list.find((block) => block.key === key);
  if (!target || target.kind !== "aisle") return list;
  const oldCode = String(target.code || "").trim();
  const used = list
    .filter((block) => block.kind === "aisle" && block.key !== key)
    .map((block) => block.code);
  const newCode = uniqueAisleToken(nextName, used);
  return list.map((block) => {
    if (block.key === key) return { ...block, name: nextName, code: newCode };
    if (block.kind === "rack" && String(block.aisle_code || "").trim() === oldCode) {
      return { ...block, aisle_code: newCode };
    }
    return block;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generationIsOpen(status) {
  return status === "pending" || status === "running";
}

async function waitForGeneration(cavaId, isCurrent) {
  while (isCurrent()) {
    await sleep(2000);
    if (!isCurrent()) return null;
    const current = await getCavaGeneration(cavaId);
    if (!generationIsOpen(current.status)) return current;
  }
  return null;
}

function firstText(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstText(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = firstText(item);
      if (found) return found;
    }
  }
  return "";
}

function messageFromError(error, fallback) {
  const direct = getApiErrorMessage(error, "");
  if (direct) return direct;
  return firstText(error?.response?.data) || fallback;
}

export default function ModalEdit({ show, onHide, cava, mode, onSave, showAlert }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeVariant, setNoticeVariant] = useState("success");
  const [formData, setFormData] = useState(EMPTY_CAVA);
  const [nomenclature, setNomenclature] = useState(EMPTY_NOMENCLATURE);
  const [storages, setStorages] = useState([]);
  const [isLoadingStorages, setIsLoadingStorages] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [occupancyRevision, setOccupancyRevision] = useState(0);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [dragKey, setDragKey] = useState(null);
  /** Undo de un paso al cambiar orientación master (restaurar si no hubo ediciones). */
  const masterUndoRef = useRef(null);

  const readOnly = mode === "view";
  const watchToken = useRef(0);
  const aisleChoices = useMemo(() => {
    const seen = new Set();
    const options = [{ value: "", label: "Sin pasillo" }];
    for (const block of formData.blocks) {
      if (block.kind !== "aisle") continue;
      const code = String(block.code || "").trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      options.push({ value: code, label: aisleDisplayName(block) });
    }
    return options;
  }, [formData.blocks]);

  useEffect(() => {
    if (!show) return undefined;
    let cancelled = false;
    setIsLoadingStorages(true);
    setFormError("");
    setNotice("");
    setNoticeVariant("success");
    Promise.all([getStorages(1, "", 200), getPositionNomenclature().catch(() => EMPTY_NOMENCLATURE)])
      .then(([storageResponse, nomenclatureResponse]) => {
        if (cancelled) return;
        setStorages(storageResponse.results || []);
        setNomenclature({ ...EMPTY_NOMENCLATURE, ...nomenclatureResponse });
      })
      .catch(() => {
        if (!cancelled) setStorages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStorages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [show]);

  useEffect(() => {
    masterUndoRef.current = null;
    if (cava) {
      const blocks = blocksFromApi(cava.blocks);
      setFormData({
        ...EMPTY_CAVA,
        ...cava,
        code: cava.code || "",
        storage_id: cava.storage?.id ?? cava.storage_id ?? "",
        temp_min: cava.temp_min ?? "",
        temp_max: cava.temp_max ?? "",
        is_active: cava.is_active !== false,
        blocks,
        plan_layout: hydratePlanLayout(cava.plan_layout, blocks),
      });
    } else {
      setFormData(EMPTY_CAVA);
    }
    if (!show) {
      setShowValidation(false);
      setConfirmGenerate(false);
      setDragKey(null);
    }
  }, [cava, show]);

  const storageOptions = useMemo(
    () => storages.map((storage) => ({ value: String(storage.id), label: storage.name })),
    [storages],
  );
  const conditionOptions = useMemo(
    () => Object.entries(conditionLabels).map(([value, label]) => ({ value, label })),
    [],
  );

  const updateBlock = (key, patch) => {
    setFormData((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.key !== key) return block;
        const next = { ...block, ...patch };
        if (patch.orientation && patch.orientation !== block.orientation) {
          next.label_side = defaultLabelSide(patch.orientation);
        }
        return next;
      }),
    }));
  };

  const moveBlock = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    setFormData((current) => {
      const from = current.blocks.findIndex((block) => block.key === fromKey);
      const to = current.blocks.findIndex((block) => block.key === toKey);
      if (from < 0 || to < 0) return current;
      const blocks = [...current.blocks];
      const [item] = blocks.splice(from, 1);
      blocks.splice(to, 0, item);
      return { ...current, blocks };
    });
  };

  const moveBlockBy = (key, delta) => {
    setFormData((current) => {
      const from = current.blocks.findIndex((block) => block.key === key);
      if (from < 0) return current;
      const to = from + delta;
      if (to < 0 || to >= current.blocks.length) return current;
      const blocks = [...current.blocks];
      const [item] = blocks.splice(from, 1);
      blocks.splice(to, 0, item);
      return { ...current, blocks };
    });
  };

  const persist = async () => {
    const nameMissing = isBlank(formData.name);
    const storageMissing = !formData.storage_id;
    const conditionMissing = !formData.condition;
    if (nameMissing || storageMissing || conditionMissing) {
      setShowValidation(true);
      setFormError("Complete el nombre, el almacén y la condición.");
      return null;
    }
    const payload = {
      name: formData.name.trim(),
      code: String(formData.code || "").trim(),
      storage_id: Number(formData.storage_id),
      condition: formData.condition,
      temp_min: normalizeNumber(formData.temp_min),
      temp_max: normalizeNumber(formData.temp_max),
      is_active: Boolean(formData.is_active),
      blocks: blocksPayload(formData.blocks),
      plan_layout: planLayoutPayload(formData.plan_layout, formData.blocks),
    };
    const saved = formData.id ? await updateCava(formData.id, payload) : await createCava(payload);
    const blocks = blocksFromApi(saved.blocks);
    setFormData((current) => ({
      ...current,
      id: saved.id,
      blocks,
      plan_layout: hydratePlanLayout(saved.plan_layout, blocks),
      positions_has_been_generated: saved.positions_has_been_generated,
    }));
    await onSave();
    return saved;
  };

  const handleSave = async () => {
    setFormError("");
    setIsSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      onHide();
      showAlert("success", "Cava guardada correctamente");
    } catch (error) {
      setFormError(messageFromError(error, "No se pudo guardar la cava."));
    } finally {
      setIsSaving(false);
    }
  };

  const applyGenerationResult = async (job) => {
    const failed = job?.status === "failed";
    setNoticeVariant(failed ? "danger" : "success");
    setNotice(job?.detail || (failed ? "No se pudieron crear las posiciones." : "Posiciones creadas."));
    if (!failed) {
      setOccupancyRevision((value) => value + 1);
      setFormData((current) => ({ ...current, positions_has_been_generated: true }));
    }
    await onSave();
  };

  useEffect(() => {
    if (!show || !cava?.id) return undefined;
    const token = watchToken.current + 1;
    watchToken.current = token;
    let ignore = false;
    getCavaGeneration(cava.id)
      .then(async (job) => {
        if (ignore || watchToken.current !== token) return;
        if (!generationIsOpen(job.status)) {
          setIsGenerating(false);
          return;
        }
        setIsGenerating(true);
        setNoticeVariant("success");
        setNotice(job.detail || "En proceso. Puedes continuar mientras se crean.");
        try {
          const current = await waitForGeneration(cava.id, () => watchToken.current === token);
          if (current && watchToken.current === token) await applyGenerationResult(current);
        } finally {
          if (watchToken.current === token) setIsGenerating(false);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [show, cava?.id]);

  const runGenerate = async () => {
    if (isGenerating) return;
    setFormError("");
    setNotice("");
    setConfirmGenerate(false);
    const token = watchToken.current + 1;
    watchToken.current = token;
    setIsGenerating(true);
    try {
      const saved = await persist();
      if (!saved || watchToken.current !== token) return;
      let job;
      try {
        job = await generateCavaPositions(saved.id);
      } catch (error) {
        if (error?.response?.status !== 409) throw error;
        job = { status: "pending", detail: "En proceso. Puedes continuar mientras se crean." };
      }
      if (!generationIsOpen(job.status)) {
        await applyGenerationResult(job);
        return;
      }
      setNoticeVariant("success");
      setNotice(job.detail || "En proceso. Puedes continuar mientras se crean.");
      const current = await waitForGeneration(saved.id, () => watchToken.current === token);
      if (current && watchToken.current === token) await applyGenerationResult(current);
    } catch (error) {
      if (watchToken.current === token) {
        setFormError(messageFromError(error, "No se pudo iniciar la generación."));
      }
    } finally {
      if (watchToken.current === token) setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    const alreadyGenerated = Boolean(
      formData.positions_has_been_generated || cava?.positions_has_been_generated,
    );
    if (alreadyGenerated) {
      setConfirmGenerate(true);
      return;
    }
    void runGenerate();
  };

  const cavaTitle = cavaTitleOf(formData.name, formData.code);
  const title = readOnly ? `Ver ${cavaTitle}` : formData?.id ? `Editar ${cavaTitle}` : "Nueva cava";
  const nameMissing = showValidation && isBlank(formData.name);
  const storageMissing = showValidation && !formData.storage_id;
  const conditionMissing = showValidation && !formData.condition;
  const busy = isSaving || isGenerating;

  return (
    <Modal show={show} onHide={onHide} size="xl" className="max-w-[min(96vw,1480px)]">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? <Alert variant="danger" className="mb-3">{formError}</Alert> : null}
        {notice ? <Alert variant={noticeVariant} className="mb-3">{notice}</Alert> : null}
        <Form onSubmit={(event) => event.preventDefault()}>
          <div className="grid grid-cols-12 items-end gap-x-3 gap-y-3">
            <Form.Group className="col-span-8 mb-0">
              <Form.Label className={LABEL_CLASS}>Nombre <span className="text-red-500">*</span></Form.Label>
              <Form.Control
                className={FIELD_CLASS}
                isInvalid={nameMissing}
                value={formData.name || ""}
                readOnly={readOnly}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </Form.Group>
            <Form.Group className="col-span-4 mb-0">
              <Form.Label className={LABEL_CLASS}>Código</Form.Label>
              <Form.Control
                className={FIELD_CLASS}
                value={formData.code || ""}
                readOnly={readOnly}
                placeholder="9"
                onChange={(event) => setFormData({ ...formData, code: event.target.value })}
              />
            </Form.Group>
            <Form.Group className="col-span-4 mb-0">
              <Form.Label className={LABEL_CLASS}>Almacén <span className="text-red-500">*</span></Form.Label>
              <Select
                inputId="cava-storage"
                styles={SELECT_STYLES}
                isDisabled={readOnly || isLoadingStorages}
                isInvalid={storageMissing}
                placeholder={isLoadingStorages ? "Cargando almacenes…" : "Seleccione un almacén"}
                options={storageOptions}
                value={formData.storage_id ? String(formData.storage_id) : ""}
                onChange={(event) => setFormData({ ...formData, storage_id: event.target.value || "" })}
              />
            </Form.Group>
            <Form.Group className="col-span-4 mb-0">
              <Form.Label className={LABEL_CLASS}>Condición <span className="text-red-500">*</span></Form.Label>
              <Select
                inputId="cava-condition"
                styles={SELECT_STYLES}
                isDisabled={readOnly}
                isInvalid={conditionMissing}
                placeholder="Seleccione una condición"
                options={conditionOptions}
                value={formData.condition || ""}
                onChange={(event) => setFormData({ ...formData, condition: event.target.value || "" })}
              />
            </Form.Group>
            <Form.Group className="col-span-2 mb-0">
              <Form.Label className={LABEL_CLASS}>Mínima (°C)</Form.Label>
              <Form.Control
                className={FIELD_CLASS}
                type="number"
                value={formData.temp_min ?? ""}
                readOnly={readOnly}
                onChange={(event) => setFormData({ ...formData, temp_min: event.target.value })}
              />
            </Form.Group>
            <Form.Group className="col-span-2 mb-0">
              <Form.Label className={LABEL_CLASS}>Máxima (°C)</Form.Label>
              <Form.Control
                className={FIELD_CLASS}
                type="number"
                value={formData.temp_max ?? ""}
                readOnly={readOnly}
                onChange={(event) => setFormData({ ...formData, temp_max: event.target.value })}
              />
            </Form.Group>
          </div>

          <section className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Distribución</p>
              {!readOnly ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        blocks: [
                          ...current.blocks,
                          emptyRack(defaultOrientationOf(current.plan_layout, current.blocks)),
                        ],
                      }))
                    }
                  >
                    Agregar rack
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        blocks: [
                          ...current.blocks,
                          emptyAisle(
                            defaultOrientationOf(current.plan_layout, current.blocks),
                            current.blocks,
                          ),
                        ],
                      }))
                    }
                  >
                    Agregar pasillo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={DoorOpen}
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        plan_layout: {
                          ...normalizePlanLayout(current.plan_layout),
                          doors: [...normalizePlanLayout(current.plan_layout).doors, newDoor()],
                        },
                      }))
                    }
                  >
                    Agregar puerta
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-4" role="radiogroup" aria-label="Orientación">
              {MASTER_ORIENTATION_OPTIONS.map((option) => {
                const active =
                  defaultOrientationOf(formData.plan_layout, formData.blocks) === option.value;
                return (
                  <Form.Check
                    key={option.value}
                    type="radio"
                    id={`cava-master-orientation-${option.value}`}
                    name="cava-master-orientation"
                    label={option.label}
                    checked={active}
                    disabled={readOnly}
                    className="cursor-pointer text-sm text-slate-700"
                    onChange={() => {
                      if (readOnly || active) return;
                      setFormData((current) => {
                        const next = switchMasterOrientation({
                          plan_layout: current.plan_layout,
                          blocks: current.blocks,
                          nextOrientation: option.value,
                          defaultLabelSide,
                          undo: masterUndoRef.current,
                        });
                        masterUndoRef.current = next.undo;
                        return {
                          ...current,
                          plan_layout: next.plan_layout,
                          blocks: next.blocks,
                        };
                      });
                    }}
                  />
                );
              })}
            </div>
            {normalizePlanLayout(formData.plan_layout).doors.length ? (
              <div className="mb-3 space-y-1 rounded-md border border-slate-200 bg-slate-50/80 p-2">
                <p className="px-1 text-[11px] font-medium text-slate-500">Puertas (solo referencia visual)</p>
                {normalizePlanLayout(formData.plan_layout).doors.map((door) => (
                  <div key={door.id} className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-2">
                    <Form.Control
                      size="sm"
                      type="text"
                      className={`${COMPACT_FIELD} w-full min-w-0`}
                      placeholder="Nombre"
                      value={door.name ?? ""}
                      readOnly={readOnly}
                      maxLength={40}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => {
                        const name = event.target.value.slice(0, 40);
                        setFormData((current) => {
                          const layout = normalizePlanLayout(current.plan_layout);
                          return {
                            ...current,
                            plan_layout: {
                              ...layout,
                              doors: layout.doors.map((item) =>
                                item.id === door.id ? { ...item, name } : item,
                              ),
                            },
                          };
                        });
                      }}
                    />
                    <Select
                      inputId={`cava-door-wall-${door.id}`}
                      size="sm"
                      styles={COMPACT_SELECT_STYLES}
                      isDisabled={readOnly}
                      options={DOOR_WALL_OPTIONS}
                      value={door.wall}
                      onChange={(event) => {
                        const wall = event.target.value || "top";
                        setFormData((current) => {
                          const layout = normalizePlanLayout(current.plan_layout);
                          return {
                            ...current,
                            plan_layout: {
                              ...layout,
                              doors: layout.doors.map((item) =>
                                item.id === door.id ? { ...item, wall, anchor: "center" } : item,
                              ),
                            },
                          };
                        });
                      }}
                    />
                    <Select
                      inputId={`cava-door-anchor-${door.id}`}
                      size="sm"
                      styles={COMPACT_SELECT_STYLES}
                      isDisabled={readOnly}
                      options={doorAnchorOptions(door.wall)}
                      value={door.anchor}
                      onChange={(event) => {
                        const anchor = event.target.value || "center";
                        setFormData((current) => {
                          const layout = normalizePlanLayout(current.plan_layout);
                          return {
                            ...current,
                            plan_layout: {
                              ...layout,
                              doors: layout.doors.map((item) =>
                                item.id === door.id ? { ...item, anchor } : item,
                              ),
                            },
                          };
                        });
                      }}
                    />
                    {!readOnly ? (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Trash2}
                        className="px-2"
                        onClick={() =>
                          setFormData((current) => {
                            const layout = normalizePlanLayout(current.plan_layout);
                            return {
                              ...current,
                              plan_layout: {
                                ...layout,
                                doors: layout.doors.filter((item) => item.id !== door.id),
                              },
                            };
                          })
                        }
                      >
                        Quitar
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {formData.blocks.length ? (
              <div className="space-y-0.5">
                {formData.blocks.map((block, index) => {
                  const showRackHeader =
                    block.kind === "rack" &&
                    (index === 0 || formData.blocks[index - 1].kind !== "rack");
                  const showAisleHeader =
                    block.kind === "aisle" &&
                    (index === 0 || formData.blocks[index - 1].kind !== "aisle");
                  const isFirst = index === 0;
                  const isLast = index === formData.blocks.length - 1;
                  return (
                    <div key={block.key}>
                      {showRackHeader ? (
                        <div className={`grid ${RACK_GRID} items-end gap-x-1 px-1.5 pb-0.5 text-left text-[11px] font-medium text-slate-400`}>
                          <span />
                          <span>Rack</span>
                          <span>Cantidad</span>
                          <span>Niveles</span>
                          <span>Profundidad</span>
                          <span>Orden</span>
                          <span>Orientación</span>
                          <span>Alineación</span>
                          <span>Etiqueta</span>
                          <span>Pasillo</span>
                          <span />
                        </div>
                      ) : null}
                      {showAisleHeader ? (
                        <div className={`grid ${AISLE_GRID} items-end gap-x-1 px-1.5 pb-0.5 text-left text-[11px] font-medium text-slate-400`}>
                          <span />
                          <span>Nombre</span>
                          <span>Orientación</span>
                          <span>Alineación</span>
                          <span>Posiciones</span>
                          <span>Cant.</span>
                          <span />
                        </div>
                      ) : null}
                      <div
                        onDragOver={(event) => {
                          if (readOnly || !dragKey || dragKey === block.key) return;
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (readOnly) return;
                          moveBlock(dragKey, block.key);
                          setDragKey(null);
                        }}
                        className={`grid items-center gap-x-1 rounded-md px-1.5 py-1 ${
                          dragKey === block.key ? "opacity-60 ring-1 ring-sky-400" : ""
                        } ${
                          block.kind === "aisle"
                            ? `${AISLE_GRID} bg-amber-50 dark:bg-amber-950/25`
                            : `${RACK_GRID} bg-slate-100/80 dark:bg-slate-800/50`
                        }`}
                      >
                        {!readOnly ? (
                          <button
                            type="button"
                            draggable
                            title="Arrastrar para reordenar"
                            className="cursor-grab justify-self-center text-slate-400 active:cursor-grabbing"
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", block.key);
                              setDragKey(block.key);
                            }}
                            onDragEnd={() => setDragKey(null)}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        ) : (
                          <span />
                        )}
                        {block.kind === "aisle" ? (
                          <div className="flex w-full min-w-0 items-center gap-1">
                            <Form.Control
                              size="sm"
                              className={`${COMPACT_FIELD} w-full min-w-0 text-left`}
                              value={block.name || ""}
                              readOnly={readOnly}
                              placeholder="Pasillo 1"
                              title="Nombre del pasillo"
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  blocks: renameAisleBlocks(
                                    current.blocks,
                                    block.key,
                                    event.target.value,
                                  ),
                                }))
                              }
                            />
                            <span
                              className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-400"
                              title="Token en el código de posición"
                            >
                              {block.code || "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate text-left text-xs font-semibold text-slate-600">
                            {blockTitle(block, nomenclature)}
                          </span>
                        )}
                        {block.kind === "rack" ? (
                          <>
                            <Form.Control
                              size="sm"
                              className={`${COMPACT_FIELD} w-full min-w-0 text-left`}
                              type="number"
                              min={1}
                              value={block.rack_count}
                              readOnly={readOnly}
                              onChange={(event) => updateBlock(block.key, { rack_count: event.target.value })}
                            />
                            <Form.Control
                              size="sm"
                              className={`${COMPACT_FIELD} w-full min-w-0 text-left`}
                              type="number"
                              min={1}
                              value={block.levels}
                              readOnly={readOnly}
                              onChange={(event) => updateBlock(block.key, { levels: event.target.value })}
                            />
                            <Form.Control
                              size="sm"
                              className={`${COMPACT_FIELD} w-full min-w-0 text-left`}
                              type="number"
                              min={1}
                              value={block.depth}
                              readOnly={readOnly}
                              onChange={(event) => updateBlock(block.key, { depth: event.target.value })}
                            />
                            <Select
                              inputId={`cava-depth-axis-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly || Number(block.depth) < 2}
                              options={depthAxisOptions(block.depth)}
                              value={depthAxisOf(formData.plan_layout, block)}
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  plan_layout: setDepthAxis(
                                    current.plan_layout,
                                    block,
                                    event.target.value === "desc" ? "desc" : "asc",
                                  ),
                                }))
                              }
                            />
                            <Select
                              inputId={`cava-orientation-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              options={ORIENTATION_OPTIONS}
                              value={block.orientation === "vertical" ? "vertical" : "horizontal"}
                              onChange={(event) =>
                                updateBlock(block.key, { orientation: event.target.value || "horizontal" })
                              }
                            />
                            <Select
                              inputId={`cava-align-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              options={blockAlignOptions(
                                defaultOrientationOf(formData.plan_layout, formData.blocks),
                                block.orientation,
                              )}
                              value={blockAlignOf(
                                formData.plan_layout,
                                block,
                                defaultOrientationOf(formData.plan_layout, formData.blocks),
                              )}
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  plan_layout: setBlockAlign(
                                    current.plan_layout,
                                    block,
                                    defaultOrientationOf(current.plan_layout, current.blocks),
                                    event.target.value,
                                  ),
                                }))
                              }
                            />
                            <Select
                              inputId={`cava-label-side-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              options={labelSideOptions(block.orientation)}
                              value={block.label_side === "above" ? "above" : "below"}
                              onChange={(event) =>
                                updateBlock(block.key, { label_side: event.target.value || "below" })
                              }
                            />
                            <Select
                              inputId={`cava-aisle-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Sin pasillo"
                              options={aisleChoices}
                              value={aisleSelectValue(formData.blocks, block)}
                              onChange={(event) =>
                                updateBlock(block.key, {
                                  aisle_code: aisleCodeFromSelect(
                                    formData.blocks,
                                    block,
                                    event.target.value,
                                  ),
                                })
                              }
                            />
                          </>
                        ) : (
                          <>
                            <Select
                              inputId={`cava-orientation-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Orientación"
                              options={ORIENTATION_OPTIONS}
                              value={block.orientation === "vertical" ? "vertical" : "horizontal"}
                              onChange={(event) =>
                                updateBlock(block.key, { orientation: event.target.value || "horizontal" })
                              }
                            />
                            <Select
                              inputId={`cava-align-${block.key}`}
                              className="w-full min-w-0 text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              options={blockAlignOptions(
                                defaultOrientationOf(formData.plan_layout, formData.blocks),
                                block.orientation,
                              )}
                              value={blockAlignOf(
                                formData.plan_layout,
                                block,
                                defaultOrientationOf(formData.plan_layout, formData.blocks),
                              )}
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  plan_layout: setBlockAlign(
                                    current.plan_layout,
                                    block,
                                    defaultOrientationOf(current.plan_layout, current.blocks),
                                    event.target.value,
                                  ),
                                }))
                              }
                            />
                            <Form.Check
                              type="checkbox"
                              id={`cava-aisle-create-${block.key}`}
                              className="!mb-0 justify-self-start whitespace-nowrap text-[11px] leading-tight"
                              label="Crear posiciones de pasillo"
                              checked={Boolean(block.create_aisle_positions)}
                              disabled={readOnly}
                              onChange={(event) =>
                                updateBlock(block.key, {
                                  create_aisle_positions: event.target.checked,
                                  rack_count: event.target.checked
                                    ? Math.max(0, Number(block.rack_count) || 0)
                                    : 0,
                                })
                              }
                            />
                            {block.create_aisle_positions ? (
                              <Form.Control
                                size="sm"
                                className={`${COMPACT_FIELD} w-full min-w-0 text-left`}
                                type="number"
                                min={0}
                                title="Cantidad"
                                value={block.rack_count ?? 0}
                                readOnly={readOnly}
                                placeholder="Cant."
                                onChange={(event) => {
                                  const next = Math.max(0, Number(event.target.value) || 0);
                                  updateBlock(block.key, { rack_count: next });
                                }}
                              />
                            ) : (
                              <span />
                            )}
                          </>
                        )}
                        {!readOnly ? (
                          <div className="flex shrink-0 items-center justify-self-end gap-0.5">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={ChevronUp}
                              className="px-1.5"
                              disabled={isFirst}
                              title="Subir"
                              onClick={() => moveBlockBy(block.key, -1)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              icon={ChevronDown}
                              className="px-1.5"
                              disabled={isLast}
                              title="Bajar"
                              onClick={() => moveBlockBy(block.key, 1)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Trash2}
                              className="px-1.5"
                              title="Quitar"
                              onClick={() =>
                                setFormData((current) => ({
                                  ...current,
                                  blocks: current.blocks.filter((item) => item.key !== block.key),
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <span />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Agregue racks para armar la distribución.</p>
            )}
          </section>

          <div className="mt-4">
            <CavaPlan
              cavaId={formData.id}
              name={formData.name}
              code={formData.code}
              blocks={formData.blocks}
              nomenclature={nomenclature}
              planLayout={formData.plan_layout}
              readOnly={readOnly}
              occupancyRevision={occupancyRevision}
              onShowAislePositionsChange={(checked) =>
                setFormData((current) => ({
                  ...current,
                  plan_layout: {
                    ...normalizePlanLayout(current.plan_layout),
                    show_aisle_positions: checked,
                  },
                }))
              }
            />
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Form.Check
              type="switch"
              id="cava-is-active"
              label={formData.is_active ? "Activo" : "Inactivo"}
              checked={Boolean(formData.is_active)}
              disabled={readOnly}
              onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
            />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          Cerrar
        </Button>
        {!readOnly ? (
          <Button variant="outline" icon={LayoutGrid} onClick={handleGenerate} disabled={busy} loading={isGenerating}>
            {isGenerating ? "Generando…" : "Generar posiciones"}
          </Button>
        ) : null}
        {!readOnly ? (
          <Button variant="primary" icon={Save} onClick={handleSave} disabled={busy} loading={isSaving}>
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        ) : null}
      </Modal.Footer>
      <Modal show={confirmGenerate} onHide={() => setConfirmGenerate(false)} size="sm" layerClassName="z-[80]">
        <Modal.Header closeButton>
          <Modal.Title>Regenerar posiciones</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-2 text-sm text-slate-600">
          <p>Se crearán las ubicaciones nuevas del plano.</p>
          <p>Las posiciones eliminadas se volverán a crear.</p>
          <p>Las que ya existen (incluidas desactivadas o editadas) no se modifican.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" icon={X} onClick={() => setConfirmGenerate(false)}>
            Cancelar
          </Button>
          <Button variant="primary" icon={LayoutGrid} onClick={() => void runGenerate()} disabled={busy}>
            Continuar
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
}
