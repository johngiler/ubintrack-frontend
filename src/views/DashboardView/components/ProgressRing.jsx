"use client";

import { getColorByPercent } from "../dashboardUtils";

export default function ProgressRing({ value, size = 64, strokeWidth = 3, className = "" }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const color = getColorByPercent(pct);
  const radius = 16;
  const circumference = radius * 2 * Math.PI;
  const dash = (pct / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 18 18)"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums" style={{ color }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}
