import { cavaTitleOf, countSlots, depthCodesOf, planRows, rackTokensOf, slotKey, suggestedAisleCode } from "./cavaPlan";

const CELL = 48;
const RACK_GAP = 8;
const STACK_GAP = 16;
const LABEL_H = 18;
const LABEL_GAP = 6;
const AISLE = 64;
const ROW_GAP = 24;
const DIVIDER = 2;
const DIVIDER_GAP = 6;
const PAD = 28;
const HEADER = 58;
const MIN_WIDTH = 420;

const INK = "#0f172a";
const LINE = "#94a3b8";
const AISLE_FILL = "#f8fafc";
const LABEL = "#475569";
const TITLE = "#1e293b";
const FREE = "#10b981";
const ASSIGNED = "#f97316";
const BUSY = "#ef4444";
const IDLE = "#94a3b8";

const LEGEND = [
  [FREE, "Libre"],
  [ASSIGNED, "Asignado"],
  [BUSY, "Ocupado"],
  [IDLE, "Inactivo"],
];

function markFill(item) {
  if (!item?.is_active) return IDLE;
  if (item.status === "ocupado") return BUSY;
  if (item.status === "asignado") return ASSIGNED;
  return FREE;
}

function markName(item) {
  if (!item?.is_active) return "Inactivo";
  if (item.status === "ocupado") return "Ocupado";
  if (item.status === "asignado") return "Asignado";
  return "Libre";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileNameOf(title) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "plano"}.png`;
}

function measureRack(block, blocks, rackPrefix) {
  const horizontal = block.orientation !== "vertical";
  const tokens = rackTokensOf(block);
  const places = depthCodesOf(block);
  const hall = suggestedAisleCode(blocks, block);
  const depth = places.length;
  const levels = Number(block.levels) || 0;
  if (!tokens.length || levels < 1 || depth < 1) {
    return { kind: "note", w: 160, h: 22, text: "Rack incompleto" };
  }
  const cols = horizontal ? 1 : depth;
  const rows = horizontal ? depth : 1;
  const gridW = cols * CELL;
  const gridH = rows * CELL;
  const unitH = gridH + LABEL_GAP + LABEL_H;
  const labelSide = block.label_side === "above" ? "above" : "below";
  if (horizontal) {
    const gaps = Math.max(tokens.length - 1, 0) * RACK_GAP;
    return { kind: "rack", horizontal, w: tokens.length * gridW + gaps, h: unitH, tokens, places, hall, depth, gridW, gridH, labelSide, prefix: rackPrefix };
  }
  const gaps = Math.max(tokens.length - 1, 0) * STACK_GAP;
  return { kind: "rack", horizontal, w: gridW, h: tokens.length * unitH + gaps, tokens, places, hall, depth, gridW, gridH, labelSide, prefix: rackPrefix };
}

function measureRow(row, blocks, rackPrefix, aislePrefix) {
  const items = row.map((block) => {
    if (block.kind === "aisle") {
      const code = String(block.code || "").trim();
      const label = code ? `Pasillo ${aislePrefix}${code}` : "Pasillo";
      const vertical = block.orientation === "vertical";
      return vertical
        ? { kind: "aisle", vertical: true, w: AISLE, h: AISLE, label }
        : { kind: "aisle", vertical: false, w: 0, h: AISLE, label };
    }
    return measureRack(block, blocks, rackPrefix);
  });

  let w = 0;
  let h = 0;
  items.forEach((item, index) => {
    const previous = items[index - 1];
    if (previous && previous.kind === "rack" && item.kind === "rack") w += DIVIDER;
    if (item.kind !== "aisle" || item.vertical) w += item.w;
    h = Math.max(h, item.h);
  });
  items.forEach((item) => {
    if (item.kind === "aisle" && item.vertical) item.h = h;
  });
  return { items, w, h };
}

function text(x, y, value, { size = 13, weight = "600" } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" fill="${LABEL}" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
}

function drawMarks(parts, x, y, width, height, marks) {
  if (!marks.length) return;
  const columns = Math.min(3, marks.length);
  const markRows = Math.ceil(marks.length / columns);
  const gap = 2;
  const room = Math.min(width, height) - 8;
  const dot = Math.max(6, Math.min(12, (room - (columns - 1) * gap) / columns, (room - (markRows - 1) * gap) / markRows));
  const gridW = columns * dot + (columns - 1) * gap;
  const gridH = markRows * dot + (markRows - 1) * gap;
  const originX = x + (width - gridW) / 2;
  const originY = y + (height - gridH) / 2;
  marks.forEach((mark, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const mx = originX + column * (dot + gap);
    const my = originY + row * (dot + gap);
    parts.push(
      `<rect x="${mx}" y="${my}" width="${dot}" height="${dot}" fill="${markFill(mark)}"><title>Nivel ${mark.level} · ${escapeXml(markName(mark))}</title></rect>`,
    );
  });
}

function drawRackUnit(parts, x, y, item, token, occupancy) {
  const above = item.labelSide === "above";
  const gridY = above ? y + LABEL_H + LABEL_GAP : y;
  const labelY = above ? y + LABEL_H / 2 : gridY + item.gridH + LABEL_GAP + LABEL_H / 2;
  const cols = item.horizontal ? 1 : item.depth;
  const rows = item.horizontal ? item.depth : 1;
  const cellW = item.gridW / cols;
  const cellH = item.gridH / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const place = item.places[item.horizontal ? row : column];
      const marks = occupancy[slotKey(item.hall, token, place)] || [];
      const cellX = x + column * cellW;
      const cellY = gridY + row * cellH;
      parts.push(
        `<rect x="${cellX}" y="${cellY}" width="${cellW}" height="${cellH}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>`,
      );
      drawMarks(parts, cellX, cellY, cellW, cellH, marks);
    }
  }
  parts.push(text(x + item.gridW / 2, labelY, `${item.prefix || ""}${token}`));
}

function drawItem(parts, item, x, y, occupancy) {
  if (item.kind === "note") {
    parts.push(text(x + item.w / 2, y + item.h / 2, item.text));
    return;
  }
  if (item.kind === "aisle") {
    parts.push(`<rect x="${x}" y="${y}" width="${item.w}" height="${item.h}" fill="${AISLE_FILL}"/>`);
    if (item.vertical) {
      parts.push(`<line x1="${x + 1}" y1="${y}" x2="${x + 1}" y2="${y + item.h}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
      parts.push(`<line x1="${x + item.w - 1}" y1="${y}" x2="${x + item.w - 1}" y2="${y + item.h}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
      const cx = x + item.w / 2;
      const cy = y + item.h / 2;
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600" fill="${LABEL}" transform="rotate(90 ${cx} ${cy})">${escapeXml(item.label)}</text>`,
      );
      return;
    }
    parts.push(`<line x1="${x}" y1="${y + 1}" x2="${x + item.w}" y2="${y + 1}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
    parts.push(`<line x1="${x}" y1="${y + item.h - 1}" x2="${x + item.w}" y2="${y + item.h - 1}" stroke="${LINE}" stroke-width="2" stroke-dasharray="8 6"/>`);
    parts.push(text(x + item.w / 2, y + item.h / 2, item.label, { size: 15 }));
    return;
  }

  if (item.horizontal) {
    let cursor = x;
    item.tokens.forEach((token, index) => {
      if (index > 0) cursor += RACK_GAP;
      drawRackUnit(parts, cursor, y, item, token, occupancy);
      cursor += item.gridW;
    });
    return;
  }

  let cursor = y;
  const unitH = item.gridH + LABEL_GAP + LABEL_H;
  item.tokens.forEach((token, index) => {
    if (index > 0) cursor += STACK_GAP;
    drawRackUnit(parts, x, cursor, item, token, occupancy);
    cursor += unitH;
  });
}

export function buildCavaPlanSvg({ name, code, blocks, nomenclature, occupancy = {} }) {
  const rows = planRows(blocks).map((row) =>
    measureRow(row, blocks, nomenclature?.rack_prefix || "", nomenclature?.aisle_prefix || ""),
  );
  if (!rows.length) return null;

  const contentWidth = Math.max(MIN_WIDTH, ...rows.map((row) => row.w));
  rows.forEach((row) => {
    row.items.forEach((item) => {
      if (item.kind === "rack" && item.horizontal) {
        const gaps = Math.max(item.tokens.length - 1, 0) * RACK_GAP;
        const cell = (contentWidth - gaps) / item.tokens.length;
        item.gridW = cell;
        item.gridH = cell * item.depth;
        item.w = contentWidth;
        item.h = item.gridH + LABEL_GAP + LABEL_H;
      }
      if (item.kind === "aisle" && !item.vertical) item.w = contentWidth;
    });
    row.h = Math.max(...row.items.map((item) => item.h));
    row.items.forEach((item) => {
      if (item.kind === "aisle" && item.vertical) item.h = row.h;
    });
    row.w = Math.max(row.w, ...row.items.map((item) => (item.kind === "aisle" && !item.vertical ? item.w : 0)));
  });

  const title = cavaTitleOf(name, code);
  const total = countSlots(blocks);
  const parts = [];
  let y = PAD + HEADER;

  rows.forEach((row, rowIndex) => {
    const previous = rows[rowIndex - 1];
    const contiguous = previous && previous.items.some((item) => item.kind === "rack") && row.items.some((item) => item.kind === "rack")
      && previous.items.every((item) => item.kind !== "aisle")
      && row.items.every((item) => item.kind !== "aisle");
    if (rowIndex > 0) {
      if (contiguous) {
        y += DIVIDER_GAP;
        parts.push(`<rect x="${PAD}" y="${y}" width="${contentWidth}" height="${DIVIDER}" fill="${LINE}"/>`);
        y += DIVIDER + DIVIDER_GAP;
      } else {
        y += ROW_GAP;
      }
    }

    let x = PAD;
    row.items.forEach((item, index) => {
      const previousItem = row.items[index - 1];
      if (previousItem && previousItem.kind === "rack" && item.kind === "rack") {
        parts.push(`<rect x="${x}" y="${y}" width="${DIVIDER}" height="${row.h}" fill="${LINE}"/>`);
        x += DIVIDER;
      }
      drawItem(parts, item, x, y, occupancy);
      if (item.kind !== "aisle" || item.vertical) x += item.w;
    });
    y += row.h;
  });

  const width = contentWidth + PAD * 2;
  const height = y + PAD;
  const body = parts.join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${PAD}" y="${PAD + 8}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="${TITLE}">${escapeXml(title)}</text>
  <text x="${width - PAD}" y="${PAD + 8}" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" fill="${LABEL}">${total} ubicaciones</text>
  ${LEGEND.map(([color, label], index) => {
    const legendX = PAD + index * 92;
    return `<rect x="${legendX}" y="${PAD + 24}" width="8" height="8" fill="${color}"/><text x="${legendX + 14}" y="${PAD + 32}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="${LABEL}">${label}</text>`;
  }).join("")}
  ${body}
</svg>`;

  return { svg, width, height, title, filename: fileNameOf(title) };
}

function loadSvgImage(plan) {
  const blob = new Blob([plan.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

export async function downloadCavaPlan(plan) {
  const { image, url } = await loadSvgImage(plan);
  try {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = plan.width * scale;
    canvas.height = plan.height * scale;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("png");
    const fileUrl = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = plan.filename;
    link.click();
    URL.revokeObjectURL(fileUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function openCavaPlanTab(plan) {
  const payload = JSON.stringify(plan).replace(/</g, "\\u003c");
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeXml(plan.title)}</title>
  <style>
    body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; }
    header { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; }
    button { height: 32px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #334155; font: inherit; font-size: 13px; cursor: pointer; }
    button:hover { background: #f8fafc; }
    #level { min-width: 3.5rem; font-size: 13px; color: #64748b; }
    main { padding: 24px; overflow: auto; }
    #stage { transform-origin: top left; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
  </style>
</head>
<body>
  <header>
    <button type="button" id="out">Alejar</button>
    <button type="button" id="in">Acercar</button>
    <button type="button" id="fit">Ajustar</button>
    <span id="level">100%</span>
    <button type="button" id="dl">Descargar</button>
  </header>
  <main><div id="stage"></div></main>
  <script id="plan" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("plan").textContent);
    const stage = document.getElementById("stage");
    stage.innerHTML = data.svg.replace(/^<\\?xml[^>]*>\\s*/, "");
    const drawing = stage.querySelector("svg");
    let zoom = 1;
    function apply() {
      drawing.style.width = Math.round(data.width * zoom) + "px";
      drawing.style.height = Math.round(data.height * zoom) + "px";
      document.getElementById("level").textContent = Math.round(zoom * 100) + "%";
    }
    function fit() {
      const available = Math.max(window.innerWidth - 48, 240);
      zoom = data.width > available ? available / data.width : 1;
      apply();
    }
    document.getElementById("in").onclick = () => { zoom = Math.min(zoom * 1.25, 6); apply(); };
    document.getElementById("out").onclick = () => { zoom = Math.max(zoom / 1.25, 0.25); apply(); };
    document.getElementById("fit").onclick = fit;
    document.getElementById("dl").onclick = () => {
      const blob = new Blob([data.svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = data.width * scale;
        canvas.height = data.height * scale;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          const fileUrl = URL.createObjectURL(png);
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = data.filename;
          link.click();
          URL.revokeObjectURL(fileUrl);
          URL.revokeObjectURL(url);
        }, "image/png");
      };
      image.src = url;
    };
    fit();
  </script>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }
  opened.opener = null;
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
