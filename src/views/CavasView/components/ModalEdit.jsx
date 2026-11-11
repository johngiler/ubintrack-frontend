"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, DoorOpen, GripVertical, LayoutGrid, Plus, Save, Trash2, X } from "lucide-react";

import { Modal, Button, Form, Alert } from "@/components/ui/bootstrap";
import NumberInput from "@/components/ui/NumberInput";
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
import { blocksFromApi, newKey, nextSectionName } from "../cavaBlocks";
import {
  aisleCodeFromSelect,
  aisleDisplayName,
  aisleSelectValue,
  blocksPayload,
  cavaTitleOf,
  countSlots,
  floorAcrossOf,
  floorIsActive,
  isFloorBlock,
  isNamedSection,
  isSectionBlock,
  normalizeSectionType,
  SECTION_TYPES,
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
const FIELD_CLASS = "rounded-md";
const COMPACT_HEIGHT = 32;
const COMPACT_FIELD = "!h-8 rounded-md px-2 py-0 text-xs leading-none";
const KIND_LABEL_CLASS =
  "w-[4.75rem] shrink-0 truncate text-left text-xs font-bold leading-tight text-slate-800";
const NUM_W = "w-[3.25rem] shrink-0";
const SEL_SM = "w-[5.75rem] shrink-0";
const SEL_MD = "w-[6.75rem] shrink-0";
const SEL_LG = "w-[7.5rem] shrink-0";
const SEL_TYPE = "w-[6.5rem] shrink-0";
const NAME_W = "w-[9rem] shrink-0";
const FIELDS_ROW = "flex min-w-0 flex-1 flex-wrap items-center justify-start gap-1";
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

function emptySection(orientation = "horizontal", blocks = [], sectionType = "pasillo") {
  const axis = orientation === "vertical" ? "vertical" : "horizontal";
  const section_type = normalizeSectionType(sectionType);
  const name = nextSectionName(blocks, section_type);
  const used = (blocks || []).filter(isNamedSection).map((block) => block.code);
  return {
    key: newKey(),
    kind: "section",
    section_type,
    name,
    code: uniqueAisleToken(name, used),
    rack_count: 0,
    stretch_full: section_type === "pasillo",
    orientation: axis,
  };
}

function emptyFloor(orientation = "horizontal") {
  const axis = orientation === "vertical" ? "vertical" : "horizontal";
  return {
    key: newKey(),
    kind: "floor",
    rack_count: 1,
    depth: 3,
    overlap: false,
    always_visible: false,
    orientation: axis,
  };
}

/** Etiqueta fija a la izquierda para reconocer el widget. */
function blockKindLabel(block) {
  if (isFloorBlock(block)) return "Piso";
  if (isSectionBlock(block)) {
    const type = normalizeSectionType(block.section_type);
    if (type === "tunel") return "Túnel";
    if (type === "division") return "División";
    return "Pasillo";
  }
  return "Rack";
}

/** Renombra sección, recalcula token y actualiza aisle_code de racks ligados. */
function renameSectionBlocks(blocks, key, nextName) {
  const list = blocks || [];
  const target = list.find((block) => block.key === key);
  if (!target || !isSectionBlock(target)) return list;
  const oldCode = String(target.code || "").trim();
  const used = list
    .filter((block) => isNamedSection(block) && block.key !== key)
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
  const [confirmReduce, setConfirmReduce] = useState(null);
  const [dragKey, setDragKey] = useState(null);
  /** Undo de un paso al cambiar orientación master (restaurar si no hubo ediciones). */
  const masterUndoRef = useRef(null);

  const readOnly = mode === "view";
  const watchToken = useRef(0);
  const aisleChoices = useMemo(() => {
    const seen = new Set();
    const options = [{ value: "", label: "Sin sección" }];
    for (const block of formData.blocks) {
      if (!isNamedSection(block)) continue;
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
      setConfirmReduce(null);
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

  const positionsAlreadyGenerated = Boolean(
    formData.positions_has_been_generated || cava?.positions_has_been_generated,
  );

  const nextSlotCount = useMemo(
    () => countSlots(formData.blocks, { planLayout: formData.plan_layout }),
    [formData.blocks, formData.plan_layout],
  );

  const currentSlotCount = Number(cava?.slot_count ?? 0);
  const slotsToRemove = Math.max(0, currentSlotCount - nextSlotCount);

  const persistAndClose = async () => {
    setFormError("");
    setIsSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      setConfirmReduce(null);
      onHide();
      const msg =
        positionsAlreadyGenerated && slotsToRemove > 0
          ? `Cámara guardada. Se sincronizaron las posiciones (−${slotsToRemove} previstas).`
          : "Cámara guardada correctamente";
      showAlert("success", msg);
    } catch (error) {
      setFormError(messageFromError(error, "No se pudo guardar la cámara."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (
      formData.id &&
      positionsAlreadyGenerated &&
      slotsToRemove > 0 &&
      !confirmReduce
    ) {
      setConfirmReduce({ removed: slotsToRemove, next: nextSlotCount, prev: currentSlotCount });
      return;
    }
    await persistAndClose();
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
  const title = readOnly
    ? `Ver ${cavaTitle}`
    : formData?.id
      ? `Editar ${cavaTitle}`
      : "Nueva cámara";
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
              <NumberInput
                className={`${FIELD_CLASS} h-10 px-3 text-sm`}
                value={formData.temp_min ?? ""}
                readOnly={readOnly}
                placeholder="Mín."
                commitEmptyAs=""
                emptyValue=""
                onChange={(next) => setFormData({ ...formData, temp_min: next === "" ? "" : next })}
              />
            </Form.Group>
            <Form.Group className="col-span-2 mb-0">
              <Form.Label className={LABEL_CLASS}>Máxima (°C)</Form.Label>
              <NumberInput
                className={`${FIELD_CLASS} h-10 px-3 text-sm`}
                value={formData.temp_max ?? ""}
                readOnly={readOnly}
                placeholder="Máx."
                commitEmptyAs=""
                emptyValue=""
                onChange={(next) => setFormData({ ...formData, temp_max: next === "" ? "" : next })}
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
                    Agregar hilera de racks
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
                          emptySection(
                            defaultOrientationOf(current.plan_layout, current.blocks),
                            current.blocks,
                          ),
                        ],
                      }))
                    }
                  >
                    Agregar sección
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
                          emptyFloor(
                            defaultOrientationOf(current.plan_layout, current.blocks),
                          ),
                        ],
                      }))
                    }
                  >
                    Agregar posiciones de piso
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
                  const floorActive = isFloorBlock(block)
                    ? floorIsActive(formData.blocks, block)
                    : true;
                  const isFirst = index === 0;
                  const isLast = index === formData.blocks.length - 1;
                  const rowBg = isSectionBlock(block)
                    ? "bg-amber-50 dark:bg-amber-950/25"
                    : isFloorBlock(block)
                      ? "bg-emerald-50 dark:bg-emerald-950/25"
                      : "bg-slate-100/80 dark:bg-slate-800/50";
                  const kindLabel = blockKindLabel(block);
                  return (
                    <div
                      key={block.key}
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
                      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${
                        dragKey === block.key ? "opacity-60 ring-1 ring-sky-400" : ""
                      } ${rowBg} ${!floorActive ? "opacity-60" : ""}`}
                    >
                      {!readOnly ? (
                        <button
                          type="button"
                          draggable
                          title="Arrastrar para reordenar"
                          className="shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
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
                        <span className="w-4 shrink-0" />
                      )}
                      <span className={KIND_LABEL_CLASS} title={kindLabel}>
                        {kindLabel}
                      </span>
                      <div className={FIELDS_ROW}>
                        {isSectionBlock(block) ? (
                          <>
                            <Select
                              inputId={`cava-section-type-${block.key}`}
                              className={`${SEL_TYPE} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Tipo"
                              options={SECTION_TYPES}
                              value={normalizeSectionType(block.section_type)}
                              onChange={(event) => {
                                const section_type = normalizeSectionType(event.target.value);
                                setFormData((current) => {
                                  const target = current.blocks.find((item) => item.key === block.key);
                                  if (!target) return current;
                                  const nextName = nextSectionName(
                                    current.blocks.filter((item) => item.key !== block.key),
                                    section_type,
                                  );
                                  const used = current.blocks
                                    .filter((item) => isNamedSection(item) && item.key !== block.key)
                                    .map((item) => item.code);
                                  return {
                                    ...current,
                                    blocks: current.blocks.map((item) =>
                                      item.key === block.key
                                        ? {
                                            ...item,
                                            section_type,
                                            name: nextName,
                                            code: uniqueAisleToken(nextName, used),
                                          }
                                        : item,
                                    ),
                                  };
                                });
                              }}
                            />
                            <Form.Control
                              size="sm"
                              className={`${COMPACT_FIELD} ${NAME_W} text-left`}
                              value={block.name || ""}
                              readOnly={readOnly}
                              placeholder="Nombre"
                              title="Nombre de la sección"
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  blocks: renameSectionBlocks(
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
                            <Select
                              inputId={`cava-orientation-${block.key}`}
                              className={`${SEL_MD} text-left`}
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
                              className={`${SEL_SM} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Alineación"
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
                              id={`cava-section-stretch-${block.key}`}
                              className="!mb-0 whitespace-nowrap text-[11px] leading-tight"
                              label="100% ancho"
                              title="Ocupar todo el eje de la hilera relacionada"
                              checked={Boolean(block.stretch_full)}
                              disabled={readOnly}
                              onChange={(event) =>
                                updateBlock(block.key, { stretch_full: event.target.checked })
                              }
                            />
                          </>
                        ) : null}
                        {block.kind === "rack" ? (
                          <>
                            <NumberInput
                              className={`${COMPACT_FIELD} ${NUM_W} text-left`}
                              min={0}
                              value={block.rack_count}
                              readOnly={readOnly}
                              placeholder="Cantidad"
                              commitEmptyAs={0}
                              emptyValue=""
                              onChange={(next) =>
                                updateBlock(block.key, {
                                  rack_count: next === "" ? "" : next,
                                })
                              }
                            />
                            <NumberInput
                              className={`${COMPACT_FIELD} ${NUM_W} text-left`}
                              min={0}
                              value={block.levels}
                              readOnly={readOnly}
                              placeholder="Niveles"
                              commitEmptyAs={0}
                              emptyValue=""
                              onChange={(next) =>
                                updateBlock(block.key, {
                                  levels: next === "" ? "" : next,
                                })
                              }
                            />
                            <NumberInput
                              className={`${COMPACT_FIELD} ${NUM_W} text-left`}
                              min={0}
                              value={block.depth}
                              readOnly={readOnly}
                              placeholder="Profundidad"
                              commitEmptyAs={0}
                              emptyValue=""
                              onChange={(next) =>
                                updateBlock(block.key, {
                                  depth: next === "" ? "" : next,
                                })
                              }
                            />
                            <Select
                              inputId={`cava-depth-axis-${block.key}`}
                              className={`${SEL_SM} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly || Number(block.depth) < 2}
                              placeholder="Orden"
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
                              className={`${SEL_MD} text-left`}
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
                              className={`${SEL_SM} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Alineación"
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
                              className={`${SEL_SM} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Etiqueta"
                              options={labelSideOptions(block.orientation)}
                              value={block.label_side === "above" ? "above" : "below"}
                              onChange={(event) =>
                                updateBlock(block.key, { label_side: event.target.value || "below" })
                              }
                            />
                            <Select
                              inputId={`cava-aisle-${block.key}`}
                              className={`${SEL_LG} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Sección"
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
                        ) : null}
                        {isFloorBlock(block) ? (
                          <>
                            <NumberInput
                              className={`${COMPACT_FIELD} ${NUM_W} text-left`}
                              min={0}
                              title={
                                floorActive
                                  ? "Cantidad total de posiciones de piso"
                                  : "Coloque el piso junto a una sección con nombre"
                              }
                              value={block.rack_count ?? ""}
                              readOnly={readOnly}
                              disabled={readOnly || !floorActive}
                              placeholder="Cant."
                              commitEmptyAs={0}
                              emptyValue=""
                              onChange={(next) =>
                                updateBlock(block.key, {
                                  rack_count: next === "" ? "" : next,
                                })
                              }
                            />
                            <NumberInput
                              className={`${COMPACT_FIELD} ${NUM_W} text-left`}
                              min={0}
                              max={12}
                              title={
                                floorActive
                                  ? "Cuántas caben por grupo en la hilera"
                                  : "Coloque el piso junto a una sección con nombre"
                              }
                              value={block.depth === "" || block.depth == null ? "" : block.depth}
                              readOnly={readOnly}
                              disabled={readOnly || !floorActive}
                              placeholder="Dim."
                              commitEmptyAs={0}
                              emptyValue=""
                              onChange={(next) =>
                                updateBlock(block.key, {
                                  depth: next === "" ? "" : next,
                                })
                              }
                            />
                            <Select
                              inputId={`cava-orientation-${block.key}`}
                              className={`${SEL_MD} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly || !floorActive}
                              placeholder="Orientación"
                              options={ORIENTATION_OPTIONS}
                              value={block.orientation === "vertical" ? "vertical" : "horizontal"}
                              onChange={(event) =>
                                updateBlock(block.key, { orientation: event.target.value || "horizontal" })
                              }
                            />
                            <Select
                              inputId={`cava-align-${block.key}`}
                              className={`${SEL_SM} text-left`}
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly || !floorActive}
                              placeholder="Alineación"
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
                              id={`cava-floor-overlap-${block.key}`}
                              className="!mb-0 whitespace-nowrap text-[11px] leading-tight"
                              label="Solapar"
                              title="Dibujar las posiciones sobre el pasillo/túnel vecino"
                              checked={Boolean(block.overlap)}
                              disabled={readOnly || !floorActive}
                              onChange={(event) =>
                                updateBlock(block.key, { overlap: event.target.checked })
                              }
                            />
                            <Form.Check
                              type="checkbox"
                              id={`cava-floor-always-visible-${block.key}`}
                              className="!mb-0 whitespace-nowrap text-[11px] leading-tight"
                              label="Siempre visible"
                              title="Mostrar este piso aunque «Ver posiciones de piso» esté apagado"
                              checked={Boolean(block.always_visible)}
                              disabled={readOnly || !floorActive}
                              onChange={(event) =>
                                updateBlock(block.key, { always_visible: event.target.checked })
                              }
                            />
                          </>
                        ) : null}
                      </div>
                      {!readOnly ? (
                        <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Agregue racks, secciones o piso para armar la distribución.</p>
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
              onShowFloorPositionsChange={(checked) =>
                setFormData((current) => ({
                  ...current,
                  plan_layout: {
                    ...normalizePlanLayout(current.plan_layout),
                    show_floor_positions: checked,
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
          <Modal.Title>Sincronizar posiciones</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-2 text-sm text-slate-600">
          <p>Se crearán las ubicaciones nuevas del plano.</p>
          <p>Las libres que ya no existan en el plano se eliminarán.</p>
          <p>Asignadas u ocupadas no se borran.</p>
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

      <Modal
        show={Boolean(confirmReduce)}
        onHide={() => setConfirmReduce(null)}
        size="sm"
        layerClassName="z-[80]"
      >
        <Modal.Header closeButton>
          <Modal.Title>Se restarán posiciones</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-2 text-sm text-slate-600">
          <p>
            El plano pasa de{" "}
            <strong className="tabular-nums">{confirmReduce?.prev ?? 0}</strong> a{" "}
            <strong className="tabular-nums">{confirmReduce?.next ?? 0}</strong>{" "}
            ubicaciones (−
            <strong className="tabular-nums">{confirmReduce?.removed ?? 0}</strong>).
          </p>
          <p>Al guardar se eliminarán las posiciones libres que ya no correspondan.</p>
          <p>Las asignadas u ocupadas no se borran.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" icon={X} onClick={() => setConfirmReduce(null)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={Save}
            onClick={() => void persistAndClose()}
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar y sincronizar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
}
