"use client";

import { useState } from "react";
import { getStatusColor, formatPrice, calculateUnitPrice } from "@/lib/utils";

interface UnitData {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  svgPathId: string | null;
}

interface Props {
  units: UnitData[];
  basePricePerM2: number | null;
  onUnitClick: (unit: UnitData) => void;
}

// Layout: 3 units on left, corridor, 3 units on right
const unitPositions = [
  { x: 20, y: 20, w: 180, h: 130 },   // position 0 - top left (1-room)
  { x: 20, y: 160, w: 180, h: 130 },  // position 1 - mid left (2-room)
  { x: 20, y: 300, w: 180, h: 150 },  // position 2 - bot left (3-room)
  { x: 400, y: 20, w: 180, h: 130 },  // position 3 - top right (2-room)
  { x: 400, y: 160, w: 180, h: 150 }, // position 4 - mid right (3-room)
  { x: 400, y: 320, w: 180, h: 130 }, // position 5 - bot right (1-room)
];

export default function FloorPlanSVG({ units, basePricePerM2, onUnitClick }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Match units to positions
  const sortedUnits = units.slice().sort((a, b) => {
    const posA = parseInt(a.svgPathId?.split("-").pop() || "0");
    const posB = parseInt(b.svgPathId?.split("-").pop() || "0");
    return posA - posB;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 overflow-auto">
      <svg viewBox="0 0 600 470" className="w-full max-w-2xl mx-auto" style={{ minWidth: 400 }}>
        {/* Building outline */}
        <rect x="10" y="10" width="580" height="450" fill="none" stroke="#334155" strokeWidth="3" rx="4" />

        {/* Central corridor */}
        <rect x="210" y="10" width="180" height="450" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
        <text x="300" y="240" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="500">
          CORRIDOR
        </text>

        {/* Elevator / Stairs */}
        <rect x="250" y="180" width="100" height="50" fill="#e2e8f0" stroke="#cbd5e1" rx="4" />
        <text x="300" y="210" textAnchor="middle" fontSize="10" fill="#64748b">
          Elevator
        </text>
        <rect x="250" y="250" width="100" height="40" fill="#e2e8f0" stroke="#cbd5e1" rx="4" />
        <text x="300" y="275" textAnchor="middle" fontSize="10" fill="#64748b">
          Stairs
        </text>

        {/* Units */}
        {sortedUnits.map((unit, i) => {
          const pos = unitPositions[i];
          if (!pos) return null;

          const color = getStatusColor(unit.status);
          const isHovered = hoveredId === unit.id;
          const total = calculateUnitPrice(unit.area, unit.pricePerM2, basePricePerM2, unit.totalPrice);
          const shortPrice = (total / 1_000_000).toFixed(0) + "M";

          return (
            <g
              key={unit.id}
              className="cursor-pointer"
              onClick={() => onUnitClick(unit)}
              onMouseEnter={() => {
                setHoveredId(unit.id);
                setTooltip({
                  x: pos.x + pos.w / 2,
                  y: pos.y - 10,
                  text: `${unit.unitNumber} — ${formatPrice(total)}`,
                });
              }}
              onMouseLeave={() => {
                setHoveredId(null);
                setTooltip(null);
              }}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                fill={color}
                fillOpacity={unit.status === "sold" ? 0.35 : 0.55}
                stroke={isHovered ? "#1e293b" : "#475569"}
                strokeWidth={isHovered ? 2.5 : 1.5}
                rx="3"
              />

              {/* Unit number */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + 24}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#1e293b"
              >
                {unit.unitNumber}
              </text>

              {/* Room info */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + 44}
                textAnchor="middle"
                fontSize="11"
                fill="#334155"
              >
                {unit.rooms}-room &bull; {unit.area}m&sup2;
              </text>

              {/* Price */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + pos.h - 16}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#1e293b"
              >
                {shortPrice} so&apos;m
              </text>

              {/* Status label */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + pos.h - 36}
                textAnchor="middle"
                fontSize="9"
                fill="#475569"
                style={{ textTransform: "uppercase" }}
              >
                {unit.status}
              </text>

              {/* Room divider lines for visual effect */}
              <line
                x1={pos.x + 10}
                y1={pos.y + 55}
                x2={pos.x + pos.w - 10}
                y2={pos.y + 55}
                stroke="#475569"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 90}
              y={tooltip.y - 24}
              width="180"
              height="22"
              fill="#1e293b"
              rx="4"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 9}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="500"
            >
              {tooltip.text}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
