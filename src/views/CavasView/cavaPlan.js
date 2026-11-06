export function slotKey(hall, rack, place) {
  return `${hall || ""}\t${rack}\t${place}`;
}

export function cavaTitleOf(name, code) {
  const token = String(code || "").trim();
  const given = String(name || "").trim();
  if (given) {
    return token && !given.endsWith(token) ? `${given} ${token}` : given;
  }
  return token ? `Cava ${token}` : "Cava";
}

export function depthCodesOf(block) {
  const total = Number(block.depth) || (block.kind === "rack" ? 1 : 0);
  if (!total) return [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return Array.from({ length: total }, (_, index) => alphabet[index] || String(index + 1));
}

export function rackTokensOf(block) {
  if (block.kind !== "rack") return [];
  const count = Number(block.rack_count) || 1;
  const raw = String(block.code || "").trim();
  if (/^\d+$/.test(raw)) {
    const start = Number(raw);
    return Array.from({ length: count }, (_, index) => String(start + index));
  }
  if (count === 1 && raw) return [raw];
  return [];
}

export function countSlots(blocks) {
  return (blocks || []).reduce((total, block) => {
    if (block.kind !== "rack") return total;
    const levels = Number(block.levels) || 0;
    const racks = rackTokensOf(block).length;
    const depth = depthCodesOf(block).length;
    if (levels < 1 || racks < 1 || depth < 1) return total;
    return total + racks * levels * depth;
  }, 0);
}

export function planRows(blocks) {
  const rows = [];
  let side = [];
  const flush = () => {
    if (!side.length) return;
    rows.push(side);
    side = [];
  };
  for (const block of blocks || []) {
    if (block.orientation === "vertical") {
      side.push(block);
      continue;
    }
    flush();
    rows.push([block]);
  }
  flush();
  return rows;
}

export function suggestedAisleCode(blocks, block) {
  const list = blocks || [];
  const index = list.indexOf(block);
  if (index < 0 || block?.kind !== "rack") return "";
  const chosen = String(block.aisle_code || "").trim();
  if (chosen) return chosen;
  for (let cursor = index + 1; cursor < list.length; cursor += 1) {
    if (list[cursor].kind === "rack") break;
    if (list[cursor].kind !== "aisle") continue;
    const code = String(list[cursor].code || "").trim();
    if (code) return code;
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (list[cursor].kind === "rack") break;
    if (list[cursor].kind !== "aisle") continue;
    const code = String(list[cursor].code || "").trim();
    if (code) return code;
  }
  return "";
}

export function blocksPayload(blocks) {
  return (blocks || []).map((block) => {
    if (block.kind === "aisle") {
      return {
        kind: "aisle",
        code: String(block.code || "").trim(),
        orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      };
    }
    return {
      kind: "rack",
      code: String(block.code || "").trim(),
      rack_count: Number(block.rack_count) || 1,
      levels: Number(block.levels) || 0,
      depth: Number(block.depth) || 0,
      orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
      label_side: block.label_side === "above" ? "above" : "below",
      aisle_code: String(block.aisle_code || "").trim(),
    };
  });
}
