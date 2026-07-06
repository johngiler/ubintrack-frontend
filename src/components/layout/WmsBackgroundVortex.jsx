"use client";

import { cn } from "@/lib/cn";

const SPINE_A = [
  { x: 662, y: 64 },
  { x: 328, y: 480 },
  { x: 662, y: 896 },
];

const SPINE_B = [
  { x: 662, y: 896 },
  { x: 328, y: 480 },
  { x: 662, y: 64 },
];

const RIBBON_STEPS = 72;

function quadPoint(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function quadTangent(p0, p1, p2, t) {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

/** Punta fina en extremos exteriores y en el cruce del entrelazado. */
function halfWidthAt(t) {
  const outerEdge = Math.min(t, 1 - t);
  const outerTip = Math.min(1, Math.pow(outerEdge / 0.16, 1.2));

  const crossEdge = Math.abs(t - 0.5);
  const crossTip = Math.min(1, Math.pow(crossEdge / 0.2, 1.08));

  const taper = Math.min(outerTip, crossTip);
  return 3 + 78 * taper;
}

/** Convierte puntos muestreados en curva cúbica suave (sin segmentos rectos). */
function smoothPathFromPoints(pts) {
  if (pts.length === 0) return "";
  if (pts.length === 1) {
    return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  }
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

function fmt(p) {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

function sampleRibbon(spine) {
  const outer = [];
  const inner = [];

  for (let i = 0; i <= RIBBON_STEPS; i += 1) {
    const t = i / RIBBON_STEPS;
    const p = quadPoint(spine[0], spine[1], spine[2], t);
    const tan = quadTangent(spine[0], spine[1], spine[2], t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const nx = -tan.y / len;
    const ny = tan.x / len;
    const hw = halfWidthAt(t);

    outer.push({ x: p.x + nx * hw, y: p.y + ny * hw, t });
    inner.push({ x: p.x - nx * hw, y: p.y - ny * hw, t });
  }

  return { outer, inner };
}

function ribbonHalfPath(outer, inner, t0, t1) {
  const o = outer.filter((p) => p.t >= t0 && p.t <= t1);
  const i = inner.filter((p) => p.t >= t0 && p.t <= t1).reverse();
  if (o.length < 2 || i.length < 2) return "";

  const outerCurve = smoothPathFromPoints(o);
  const innerBody = smoothPathFromPoints(i).replace(/^M\s*[\d.-]+,[\d.-]+\s*/, "");

  return `${outerCurve} L ${fmt(i[0])} ${innerBody} L ${fmt(o[0])} Z`;
}

function buildRibbonHalves(spine) {
  const { outer, inner } = sampleRibbon(spine);
  return {
    near: ribbonHalfPath(outer, inner, 0, 0.5),
    far: ribbonHalfPath(outer, inner, 0.5, 1),
  };
}

function buildFibers(spine) {
  const fibers = [];
  const count = 14;

  for (let f = 0; f <= count; f += 1) {
    const offsetFrac = -1 + (f / count) * 2;
    const pts = [];

    for (let i = 0; i <= 48; i += 1) {
      const t = i / 48;
      const p = quadPoint(spine[0], spine[1], spine[2], t);
      const tan = quadTangent(spine[0], spine[1], spine[2], t);
      const len = Math.hypot(tan.x, tan.y) || 1;
      const nx = -tan.y / len;
      const ny = tan.x / len;
      const hw = halfWidthAt(t) * 0.9;
      pts.push({
        x: p.x + nx * hw * offsetFrac,
        y: p.y + ny * hw * offsetFrac,
      });
    }

    fibers.push(smoothPathFromPoints(pts));
  }

  return fibers;
}

const RIBBON_A = buildRibbonHalves(SPINE_A);
const RIBBON_B = buildRibbonHalves(SPINE_B);
const FIBERS_A = buildFibers(SPINE_A);
const FIBERS_B = buildFibers(SPINE_B);

function RibbonHalf({ path, gradientId, edgeId, className }) {
  if (!path) return null;
  return (
    <g className={className}>
      <path fill={`url(#${gradientId})`} d={path} />
      <path fill={`url(#${edgeId})`} d={path} />
    </g>
  );
}

function RibbonFibers({ fibers, clipPath, clipId, stroke }) {
  return (
    <g clipPath={clipPath}>
      <g
        className="wms-vortex-lines"
        opacity="0.2"
        stroke={stroke}
        strokeWidth="0.55"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {fibers.map((d, i) => (
          <path key={`${clipId}-fiber-${i}`} d={d} />
        ))}
      </g>
    </g>
  );
}

/**
 * Dos franjas entrelazadas: se abren hacia afuera (derecha) y se cruzan al centro.
 */
export function WmsBackgroundVortex({ className }) {
  const clipA = "url(#wms-ribbon-clip-a)";
  const clipB = "url(#wms-ribbon-clip-b)";

  return (
    <div className={cn("wms-vortex-wrap", className)} aria-hidden="true">
      <svg
        className="wms-vortex-svg"
        viewBox="0 0 640 960"
        preserveAspectRatio="xMaxYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="wms-ribbon-clip-a">
            <path d={RIBBON_A.near} />
            <path d={RIBBON_A.far} />
          </clipPath>
          <clipPath id="wms-ribbon-clip-b">
            <path d={RIBBON_B.near} />
            <path d={RIBBON_B.far} />
          </clipPath>

          <linearGradient
            id="wms-sweep-gradient-a"
            gradientUnits="userSpaceOnUse"
            x1="640"
            y1="80"
            x2="300"
            y2="480"
          >
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.74" />
            <stop
              offset="50%"
              stopColor="var(--brand-secondary)"
              stopOpacity="0.82"
            />
            <stop
              offset="100%"
              stopColor="var(--brand-primary)"
              stopOpacity="0.7"
            />
          </linearGradient>

          <linearGradient
            id="wms-sweep-gradient-b"
            gradientUnits="userSpaceOnUse"
            x1="640"
            y1="880"
            x2="300"
            y2="480"
          >
            <stop
              offset="0%"
              stopColor="var(--brand-secondary)"
              stopOpacity="0.7"
            />
            <stop
              offset="50%"
              stopColor="var(--brand-primary)"
              stopOpacity="0.8"
            />
            <stop
              offset="100%"
              stopColor="var(--brand-secondary)"
              stopOpacity="0.66"
            />
          </linearGradient>

          <linearGradient id="wms-sweep-edge-a" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.22" />
            <stop offset="45%" stopColor="var(--brand-primary)" stopOpacity="0" />
            <stop
              offset="100%"
              stopColor="var(--brand-secondary)"
              stopOpacity="0.08"
            />
          </linearGradient>

          <linearGradient id="wms-sweep-edge-b" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop
              offset="0%"
              stopColor="var(--brand-secondary)"
              stopOpacity="0.2"
            />
            <stop
              offset="45%"
              stopColor="var(--brand-secondary)"
              stopOpacity="0"
            />
            <stop
              offset="100%"
              stopColor="var(--brand-primary)"
              stopOpacity="0.07"
            />
          </linearGradient>
        </defs>

        {/* Entrelazado: B-near → A-near → A-far → B-far */}
        <RibbonHalf
          path={RIBBON_B.near}
          gradientId="wms-sweep-gradient-b"
          edgeId="wms-sweep-edge-b"
          className="wms-vortex-ribbon wms-vortex-ribbon-cross"
        />
        <RibbonHalf
          path={RIBBON_A.near}
          gradientId="wms-sweep-gradient-a"
          edgeId="wms-sweep-edge-a"
          className="wms-vortex-ribbon"
        />
        <RibbonHalf
          path={RIBBON_A.far}
          gradientId="wms-sweep-gradient-a"
          edgeId="wms-sweep-edge-a"
          className="wms-vortex-ribbon"
        />
        <RibbonHalf
          path={RIBBON_B.far}
          gradientId="wms-sweep-gradient-b"
          edgeId="wms-sweep-edge-b"
          className="wms-vortex-ribbon wms-vortex-ribbon-cross"
        />

        <RibbonFibers
          fibers={FIBERS_B}
          clipPath={clipB}
          clipId="b"
          stroke="var(--brand-secondary)"
        />
        <RibbonFibers
          fibers={FIBERS_A}
          clipPath={clipA}
          clipId="a"
          stroke="var(--brand-primary)"
        />
      </svg>
    </div>
  );
}
