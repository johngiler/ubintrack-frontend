/** Hidratación de bloques API → forma que consume CavaPlan (modal + dashboard). */

import {
  aisleDisplayName,
  floorAcrossOf,
  isNamedSection,
  isSectionBlock,
  normalizeSectionType,
  uniqueAisleToken,
} from "./cavaPlan";

function newKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextSectionName(blocks, sectionType = "pasillo") {
  const type = normalizeSectionType(sectionType);
  const label = type === "tunel" ? "Tunel" : type === "division" ? "Linea" : "Pasillo";
  const pattern = new RegExp(`^${label}\\s+(\\d+)$`, "i");
  const used = new Set();
  (blocks || []).forEach((block) => {
    if (!isSectionBlock(block)) return;
    if (normalizeSectionType(block.section_type) !== type) return;
    const match = pattern.exec(String(block.name || "").trim());
    if (match) used.add(Number(match[1]));
  });
  let next = 1;
  while (used.has(next)) next += 1;
  return `${label} ${next}`;
}

/** Misma forma que en edición de cámara: piso/sección/rack con todos los campos. */
export function blocksFromApi(blocks) {
  const mapped = (blocks || []).map((block, index) => {
    const kind =
      block.kind === "aisle" ? "section" : block.kind === "floor" ? "floor" : block.kind;
    const code = block.code || "";
    const section_type =
      kind === "section"
        ? normalizeSectionType(block.section_type || "pasillo")
        : "";
    const name =
      kind === "section"
        ? String(block.name || "").trim() || aisleDisplayName({ code, section_type })
        : "";
    return {
      key: block.id ? `id-${block.id}` : newKey(),
      id: block.id,
      sort_order: block.sort_order ?? index,
      kind,
      section_type,
      name,
      code,
      rack_count:
        kind === "section"
          ? 0
          : kind === "floor"
            ? Math.max(0, Number(block.rack_count) || 0)
            : block.rack_count || 1,
      levels: block.levels || "",
      depth: kind === "floor" ? floorAcrossOf(block) : block.depth || "",
      overlap: kind === "floor" ? block.overlap === true : false,
      always_visible: kind === "floor" ? block.always_visible === true : false,
      stretch_full:
        kind === "section"
          ? block.stretch_full !== undefined && block.stretch_full !== null
            ? Boolean(block.stretch_full)
            : section_type === "pasillo"
          : false,
      orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      label_side: block.label_side === "above" ? "above" : "below",
      aisle_code: block.aisle_code || "",
    };
  });
  const used = [];
  mapped.forEach((block) => {
    if (!isSectionBlock(block)) return;
    if (!String(block.name || "").trim()) {
      block.name = nextSectionName(mapped, block.section_type);
    }
    if (!String(block.code || "").trim()) {
      block.code = uniqueAisleToken(block.name, used);
    }
    used.push(block.code);
  });
  return mapped;
}

export { newKey, nextSectionName };
