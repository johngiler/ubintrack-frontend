"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Plus, Save, Trash2, X } from "lucide-react";

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
  updatePositionNomenclature,
} from "@/services/storageService";
import { conditionLabels } from "../cavaLabels";
import { blocksPayload, cavaTitleOf, rackTokensOf, suggestedAisleCode } from "../cavaPlan";
import CavaPlan from "./CavaPlan";

const ORIENTATION_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];
const LABEL_SIDE_OPTIONS = [
  { value: "below", label: "Abajo" },
  { value: "above", label: "Arriba" },
];
const RACK_GRID = "w-full grid-cols-[7.5rem_4.5rem_4.5rem_6rem_9.5rem_7rem_8.5rem_1fr] justify-items-start";
const AISLE_GRID = "w-full grid-cols-[7.5rem_6rem_9.5rem_1fr] justify-items-start";
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
  indicatorsContainer: (base) => ({ ...base, height: COMPACT_HEIGHT }),
  dropdownIndicator: (base) => ({ ...base, padding: 2 }),
  menu: (base) => ({ ...base, borderRadius: 6 }),
};

const EMPTY_NOMENCLATURE = {
  separator: "-",
  cava_prefix: "C",
  aisle_prefix: "P",
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

function emptyRack() {
  return {
    key: newKey(),
    kind: "rack",
    code: "1",
    rack_count: 1,
    levels: 1,
    depth: 1,
    orientation: "horizontal",
    label_side: "below",
    aisle_code: "",
  };
}

function emptyAisle() {
  return { key: newKey(), kind: "aisle", code: "", orientation: "horizontal" };
}

function blocksFromApi(blocks) {
  return (blocks || []).map((block) => ({
    key: block.id ? `id-${block.id}` : newKey(),
    kind: block.kind,
    code: block.code || "",
    rack_count: block.rack_count || 1,
    levels: block.levels || "",
    depth: block.depth || "",
    orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
    label_side: block.label_side === "above" ? "above" : "below",
    aisle_code: block.aisle_code || "",
  }));
}

function groupBlocks(blocks) {
  const groups = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (!last || last.kind !== block.kind) {
      groups.push({ kind: block.kind, blocks: [block] });
    } else {
      last.blocks.push(block);
    }
  }
  return groups;
}

function blockTitle(block, nomenclature) {
  if (block.kind === "aisle") {
    const code = String(block.code || "").trim();
    const prefix = nomenclature?.aisle_prefix || "";
    return code ? `Pasillo ${prefix}${code}` : "Pasillo";
  }
  const tokens = rackTokensOf(block);
  const prefix = nomenclature?.rack_prefix || "";
  if (!tokens.length) return "Grupo de racks";
  const first = `${prefix}${tokens[0]}`;
  const last = `${prefix}${tokens[tokens.length - 1]}`;
  return tokens.length === 1 ? first : `${first} a ${last}`;
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

  const readOnly = mode === "view";
  const watchToken = useRef(0);
  const aisleChoices = useMemo(() => {
    const prefix = nomenclature?.aisle_prefix || "";
    const seen = new Set();
    const options = [];
    for (const block of formData.blocks) {
      if (block.kind !== "aisle") continue;
      const code = String(block.code || "").trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      options.push({ value: code, label: `Pasillo ${prefix}${code}` });
    }
    return options;
  }, [formData.blocks, nomenclature]);

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
    if (cava) {
      setFormData({
        ...EMPTY_CAVA,
        ...cava,
        code: cava.code || "",
        storage_id: cava.storage?.id ?? cava.storage_id ?? "",
        temp_min: cava.temp_min ?? "",
        temp_max: cava.temp_max ?? "",
        is_active: cava.is_active !== false,
        blocks: blocksFromApi(cava.blocks),
      });
    } else {
      setFormData(EMPTY_CAVA);
    }
    if (!show) setShowValidation(false);
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
      blocks: current.blocks.map((block) => (block.key === key ? { ...block, ...patch } : block)),
    }));
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
    };
    await updatePositionNomenclature({
      separator: nomenclature.separator || "-",
      cava_prefix: nomenclature.cava_prefix || "",
      aisle_prefix: nomenclature.aisle_prefix || "",
      rack_prefix: nomenclature.rack_prefix || "",
      level_prefix: nomenclature.level_prefix || "",
    });
    const saved = formData.id ? await updateCava(formData.id, payload) : await createCava(payload);
    setFormData((current) => ({
      ...current,
      id: saved.id,
      blocks: blocksFromApi(saved.blocks),
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
    if (!failed) setOccupancyRevision((value) => value + 1);
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

  const handleGenerate = async () => {
    if (isGenerating) return;
    setFormError("");
    setNotice("");
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

  const cavaTitle = cavaTitleOf(formData.name, formData.code);
  const title = readOnly ? `Ver ${cavaTitle}` : formData?.id ? `Editar ${cavaTitle}` : "Nueva cava";
  const nameMissing = showValidation && isBlank(formData.name);
  const storageMissing = showValidation && !formData.storage_id;
  const conditionMissing = showValidation && !formData.condition;
  const busy = isSaving || isGenerating;

  return (
    <Modal show={show} onHide={onHide} size="xl" className="max-w-[1103px]">
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

          <div className="mt-4 grid grid-cols-5 items-end gap-3">
            {[
              ["separator", "Separador"],
              ["cava_prefix", "Cava"],
              ["aisle_prefix", "Pasillo"],
              ["rack_prefix", "Rack"],
              ["level_prefix", "Nivel"],
            ].map(([field, label]) => (
              <Form.Group key={field} className="mb-0">
                <Form.Label className={LABEL_CLASS}>{label}</Form.Label>
                <Form.Control
                  className={FIELD_CLASS}
                  value={nomenclature[field] ?? ""}
                  readOnly={readOnly}
                  onChange={(event) => setNomenclature({ ...nomenclature, [field]: event.target.value })}
                />
              </Form.Group>
            ))}
          </div>

          <section className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Distribución</p>
              {!readOnly ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" icon={Plus} onClick={() => setFormData((current) => ({ ...current, blocks: [...current.blocks, emptyRack()] }))}>
                    Agregar rack
                  </Button>
                  <Button variant="outline" size="sm" icon={Plus} onClick={() => setFormData((current) => ({ ...current, blocks: [...current.blocks, emptyAisle()] }))}>
                    Agregar pasillo
                  </Button>
                </div>
              ) : null}
            </div>
            {formData.blocks.length ? (
              <div className="space-y-1">
                {groupBlocks(formData.blocks).map((group) => (
                  <div key={group.blocks[0].key}>
                    {group.kind === "rack" ? (
                      <div className={`grid ${RACK_GRID} items-end gap-x-1 px-1.5 pb-0.5 text-left text-[11px] font-medium text-slate-400`}>
                        <span>Rack</span>
                        <span>Cantidad</span>
                        <span>Niveles</span>
                        <span>Profundidad</span>
                        <span>Orientación</span>
                        <span>Nombre</span>
                        <span>Pasillo</span>
                        <span />
                      </div>
                    ) : null}
                    <div className="space-y-0.5">
                      {group.blocks.map((block) => (
                        <div
                          key={block.key}
                          className={`grid items-center gap-x-1 rounded-md px-1.5 py-1 ${
                            block.kind === "aisle"
                              ? `${AISLE_GRID} bg-amber-50 dark:bg-amber-950/25`
                              : `${RACK_GRID} bg-slate-100/80 dark:bg-slate-800/50`
                          }`}
                        >
                          <span className="truncate text-left text-xs font-semibold text-slate-600">
                            {blockTitle(block, nomenclature)}
                          </span>
                          {block.kind === "aisle" ? (
                            <Form.Control
                              size="sm"
                              className={`${COMPACT_FIELD} w-full min-w-0 text-left`}
                              value={block.code}
                              readOnly={readOnly}
                              placeholder="Código"
                              onChange={(event) => updateBlock(block.key, { code: event.target.value })}
                            />
                          ) : null}
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
                            </>
                          ) : null}
                          <Select
                            inputId={`cava-orientation-${block.key}`}
                            className="w-full min-w-0 justify-self-start text-left"
                            size="sm"
                            styles={COMPACT_SELECT_STYLES}
                            isDisabled={readOnly}
                            placeholder={block.kind === "aisle" ? "Orientación" : "Seleccionar…"}
                            options={ORIENTATION_OPTIONS}
                            value={block.orientation === "vertical" ? "vertical" : "horizontal"}
                            onChange={(event) => updateBlock(block.key, { orientation: event.target.value || "horizontal" })}
                          />
                          {block.kind === "rack" ? (
                            <Select
                              inputId={`cava-label-side-${block.key}`}
                              className="w-full min-w-0 justify-self-start text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              options={LABEL_SIDE_OPTIONS}
                              value={block.label_side === "above" ? "above" : "below"}
                              onChange={(event) => updateBlock(block.key, { label_side: event.target.value || "below" })}
                            />
                          ) : null}
                          {block.kind === "rack" ? (
                            <Select
                              inputId={`cava-aisle-${block.key}`}
                              className="w-full min-w-0 justify-self-start text-left"
                              size="sm"
                              styles={COMPACT_SELECT_STYLES}
                              isDisabled={readOnly}
                              placeholder="Pasillo"
                              options={aisleChoices}
                              value={String(block.aisle_code || "").trim() || suggestedAisleCode(formData.blocks, block)}
                              onChange={(event) => updateBlock(block.key, { aisle_code: event.target.value || "" })}
                            />
                          ) : null}
                          {!readOnly ? (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Trash2}
                              className="w-fit shrink-0 justify-self-end px-2"
                              onClick={() =>
                                setFormData((current) => ({
                                  ...current,
                                  blocks: current.blocks.filter((item) => item.key !== block.key),
                                }))
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
                  </div>
                ))}
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
              readOnly={readOnly}
              occupancyRevision={occupancyRevision}
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
    </Modal>
  );
}
