"use client";

// Realistic-style SVG illustrations of residential HVAC equipment.
// Each one supports arrow callouts that point from a label to the physical component.
// Style: muted dark steel, schematic but recognizable — not a cartoon icon.

import { cn } from "@/lib/utils";

export interface Callout {
  id: string;
  /** text label shown in the box */
  label: string;
  /** SVG coordinates for the arrow tip (where it points on the equipment) */
  target: { x: number; y: number };
  /** SVG coordinates for the label start (where the line begins) */
  labelPos: { x: number; y: number };
  /** Optional accent color override; defaults to amber */
  color?: string;
}

interface EquipmentIllustrationProps {
  callouts?: Callout[];
  /** highlight a specific callout id (e.g., when tapped) */
  highlightId?: string;
  className?: string;
  /** hide the labels (just show the equipment) */
  hideLabels?: boolean;
}

const DEFAULT_VIEWBOX_W = 600;
const DEFAULT_VIEWBOX_H = 420;

function ArrowLine({
  from,
  to,
  color = "#f5a524",
  highlight = false,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  highlight?: boolean;
}) {
  // Compute arrowhead rotation
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Pull the tip back slightly so the arrowhead doesn't overlap the equipment
  const len = Math.sqrt(dx * dx + dy * dy);
  const pullback = 6;
  const tip = {
    x: to.x - (dx / len) * pullback,
    y: to.y - (dy / len) * pullback,
  };
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={tip.x}
        y2={tip.y}
        stroke={color}
        strokeWidth={highlight ? 3 : 2}
        strokeLinecap="round"
        opacity={highlight ? 1 : 0.85}
      />
      <polygon
        points="0,-5 10,0 0,5"
        fill={color}
        transform={`translate(${tip.x}, ${tip.y}) rotate(${angle})`}
      />
    </g>
  );
}

function LabelBox({
  x,
  y,
  text,
  color = "#f5a524",
  highlight = false,
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  highlight?: boolean;
}) {
  // Estimate width — ~7px per char
  const padding = 8;
  const charW = 7;
  // Coerce text to string defensively (in case data shape ever drifts)
  const safeText = typeof text === "string" ? text : (text == null ? "" : String(text));
  const w = safeText.length * charW + padding * 2;
  const h = 28;
  // Anchor: label sits to the left/right based on x position
  const safeX = typeof x === "number" && !Number.isNaN(x) ? x : 0;
  const safeY = typeof y === "number" && !Number.isNaN(y) ? y : 0;
  const leftAnchored = safeX < DEFAULT_VIEWBOX_W / 2;
  const bx = leftAnchored ? safeX : safeX - w;
  const by = safeY - h / 2;
  return (
    <g>
      <rect
        x={bx}
        y={by}
        width={w}
        height={h}
        rx={6}
        fill="#11141a"
        stroke={color}
        strokeWidth={highlight ? 2.5 : 1.5}
        opacity={0.96}
      />
      <text
        x={bx + w / 2}
        y={safeY + 5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fill={color}
        letterSpacing="0.5"
      >
        {safeText}
      </text>
    </g>
  );
}

export function CalloutLayer({
  callouts,
  highlightId,
  hideLabels,
}: {
  callouts?: Callout[];
  highlightId?: string;
  hideLabels?: boolean;
}) {
  if (!callouts || hideLabels) return null;
  return (
    <g>
      {callouts.map((c) => {
        const isHi = highlightId === c.id;
        const color = c.color || "#f5a524";
        return (
          <g key={c.id}>
            {!hideLabels && (
              <LabelBox
                x={c.labelPos.x}
                y={c.labelPos.y}
                text={c.label}
                color={color}
                highlight={isHi}
              />
            )}
            <ArrowLine
              from={c.labelPos}
              to={c.target}
              color={color}
              highlight={isHi}
            />
            <circle
              cx={c.target.x}
              cy={c.target.y}
              r={isHi ? 7 : 5}
              fill={color}
              stroke="#11141a"
              strokeWidth={2}
            />
          </g>
        );
      })}
    </g>
  );
}

// ----------------------------------------------------------------------------
// Outdoor condenser — panel open showing capacitor + contactor visible
// ----------------------------------------------------------------------------
export function OutdoorCondenserOpen({
  callouts,
  highlightId,
  hideLabels,
  className,
}: EquipmentIllustrationProps) {
  return (
    <svg
      viewBox={`0 0 ${DEFAULT_VIEWBOX_W} ${DEFAULT_VIEWBOX_H}`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label="Outdoor condenser with panel open, showing capacitor and contactor"
    >
      <defs>
        <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b424d" />
          <stop offset="1" stopColor="#22262d" />
        </linearGradient>
        <linearGradient id="steelLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#525a66" />
          <stop offset="1" stopColor="#2a2f37" />
        </linearGradient>
        <pattern id="fins" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="#2a2f37" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#1a1d24" strokeWidth="1.2" />
        </pattern>
      </defs>
      {/* Ground shadow */}
      <ellipse cx="300" cy="395" rx="220" ry="14" fill="#000" opacity="0.45" />

      {/* Condenser cabinet */}
      <rect x="120" y="80" width="360" height="300" rx="10" fill="url(#steel)" stroke="#0d0f12" strokeWidth="2" />
      {/* Top grille */}
      <rect x="120" y="80" width="360" height="40" rx="10" fill="url(#fins)" stroke="#0d0f12" strokeWidth="2" />
      {/* Fan grille ring */}
      <circle cx="300" cy="100" r="22" fill="#1a1d24" stroke="#4a5260" strokeWidth="2" />
      <g stroke="#4a5260" strokeWidth="2">
        <line x1="280" y1="100" x2="320" y2="100" />
        <line x1="300" y1="80" x2="300" y2="120" />
      </g>

      {/* Side coils (louvered) */}
      <rect x="120" y="120" width="22" height="260" fill="url(#fins)" stroke="#0d0f12" strokeWidth="1.5" />
      <rect x="458" y="120" width="22" height="260" fill="url(#fins)" stroke="#0d0f12" strokeWidth="1.5" />

      {/* Open service panel — hinged on left, swung out */}
      <g>
        <rect x="160" y="130" width="280" height="240" rx="6" fill="url(#steelLight)" stroke="#0d0f12" strokeWidth="2" />
        {/* Inner equipment visible */}
        {/* Compressor — cylindrical at bottom */}
        <g>
          <ellipse cx="290" cy="320" rx="60" ry="22" fill="#1a1d24" stroke="#4a5260" strokeWidth="2" />
          <rect x="230" y="270" width="120" height="55" rx="8" fill="#2a2f37" stroke="#4a5260" strokeWidth="2" />
          <ellipse cx="290" cy="270" rx="60" ry="20" fill="#3b424d" stroke="#4a5260" strokeWidth="2" />
          {/* pipe fittings */}
          <rect x="270" y="252" width="12" height="20" fill="#5a6470" stroke="#0d0f12" strokeWidth="1" />
          <rect x="298" y="252" width="12" height="20" fill="#5a6470" stroke="#0d0f12" strokeWidth="1" />
        </g>

        {/* Dual-run capacitor — round can top */}
        <g>
          <ellipse cx="395" cy="220" rx="32" ry="10" fill="#d4a042" stroke="#0d0f12" strokeWidth="2" />
          <rect x="363" y="220" width="64" height="48" rx="4" fill="#caa14a" stroke="#0d0f12" strokeWidth="2" />
          <rect x="363" y="220" width="64" height="3" fill="#0d0f12" opacity="0.3" />
          {/* Terminals */}
          <circle cx="378" cy="216" r="4" fill="#1a1d24" />
          <circle cx="395" cy="216" r="4" fill="#1a1d24" />
          <circle cx="412" cy="216" r="4" fill="#1a1d24" />
        </g>

        {/* Contactor — rectangle */}
        <g>
          <rect x="190" y="200" width="80" height="48" rx="4" fill="#1a1d24" stroke="#4a5260" strokeWidth="2" />
          <rect x="190" y="200" width="80" height="14" fill="#2a2f37" stroke="#4a5260" strokeWidth="1.5" />
          {/* terminals */}
          {[0,1,2,3].map(i => (
            <g key={i}>
              <circle cx={202 + (i % 2) * 56} cy={225} r="3.5" fill="#9aa3ad" />
              <circle cx={202 + (i % 2) * 56} cy={240} r="3.5" fill="#9aa3ad" />
            </g>
          ))}
        </g>
      </g>

      {/* Panel hinge hint */}
      <line x1="160" y1="130" x2="160" y2="370" stroke="#0d0f12" strokeWidth="3" />

      {/* Service valve stubs */}
      <g>
        <rect x="486" y="200" width="14" height="6" fill="#9aa3ad" />
        <rect x="486" y="240" width="14" height="6" fill="#9aa3ad" />
      </g>

      <CalloutLayer callouts={callouts} highlightId={highlightId} hideLabels={hideLabels} />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Indoor unit — furnace / air handler with evaporator coil
// ----------------------------------------------------------------------------
export function IndoorUnitDiagram({
  callouts,
  highlightId,
  hideLabels,
  className,
}: EquipmentIllustrationProps) {
  return (
    <svg
      viewBox={`0 0 ${DEFAULT_VIEWBOX_W} ${DEFAULT_VIEWBOX_H}`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label="Indoor furnace and evaporator coil"
    >
      <defs>
        <linearGradient id="steel2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b424d" />
          <stop offset="1" stopColor="#22262d" />
        </linearGradient>
        <linearGradient id="steel2Light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#525a66" />
          <stop offset="1" stopColor="#2a2f37" />
        </linearGradient>
        <pattern id="fins2" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="#2a2f37" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#1a1d24" strokeWidth="1.2" />
        </pattern>
      </defs>
      <ellipse cx="300" cy="395" rx="220" ry="12" fill="#000" opacity="0.45" />

      {/* Upflow furnace body */}
      <rect x="170" y="120" width="260" height="260" rx="8" fill="url(#steel2)" stroke="#0d0f12" strokeWidth="2" />
      {/* Evaporator coil section (top) */}
      <rect x="170" y="60" width="260" height="80" rx="8" fill="url(#steel2Light)" stroke="#0d0f12" strokeWidth="2" />
      {/* Coil interior visible (A-frame) */}
      <g>
        <path d="M 200 130 L 300 70 L 400 130 Z" fill="url(#fins2)" stroke="#4a5260" strokeWidth="1.5" />
        <path d="M 220 130 L 300 90 L 380 130 Z" fill="none" stroke="#5a6470" strokeWidth="1" />
        <path d="M 240 130 L 300 110 L 360 130 Z" fill="none" stroke="#5a6470" strokeWidth="1" />
      </g>
      {/* Supply plenum */}
      <rect x="200" y="36" width="200" height="32" rx="4" fill="url(#steel2)" stroke="#0d0f12" strokeWidth="2" />

      {/* Blower section */}
      <rect x="180" y="240" width="240" height="120" rx="6" fill="#2a2f37" stroke="#0d0f12" strokeWidth="2" />
      {/* Blower wheel (circle) */}
      <circle cx="245" cy="300" r="36" fill="#1a1d24" stroke="#5a6470" strokeWidth="2" />
      <g stroke="#5a6470" strokeWidth="1.5">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={245 + Math.cos(a) * 8}
              y1={300 + Math.sin(a) * 8}
              x2={245 + Math.cos(a) * 32}
              y2={300 + Math.sin(a) * 32}
            />
          );
        })}
      </g>
      <circle cx="245" cy="300" r="6" fill="#5a6470" />

      {/* Control board area */}
      <rect x="340" y="250" width="80" height="100" rx="4" fill="#1a1d24" stroke="#4a5260" strokeWidth="1.5" />
      <rect x="350" y="260" width="60" height="40" rx="2" fill="#0d0f12" stroke="#4a5260" strokeWidth="1" />
      <g fill="#3b424d">
        <circle cx="360" cy="320" r="3" />
        <circle cx="380" cy="320" r="3" />
        <circle cx="400" cy="320" r="3" />
      </g>

      {/* Filter slot — slide-out at the side */}
      <rect x="156" y="200" width="14" height="48" fill="#3b424d" stroke="#0d0f12" strokeWidth="1.5" />
      <line x1="148" y1="208" x2="156" y2="208" stroke="#5a6470" strokeWidth="2" />
      <line x1="148" y1="220" x2="156" y2="220" stroke="#5a6470" strokeWidth="2" />
      <line x1="148" y1="232" x2="156" y2="232" stroke="#5a6470" strokeWidth="2" />
      <line x1="148" y1="244" x2="156" y2="244" stroke="#5a6470" strokeWidth="2" />

      {/* Condensate drain stub */}
      <rect x="426" y="200" width="22" height="10" fill="#9aa3ad" />
      <circle cx="455" cy="205" r="6" fill="#1a1d24" stroke="#5a6470" strokeWidth="1.5" />

      {/* Gas line / flue stub at top of furnace (for gas furnace) */}
      <rect x="190" y="156" width="14" height="34" fill="#3b424d" stroke="#0d0f12" strokeWidth="1" />
      <circle cx="197" cy="190" r="6" fill="#9aa3ad" />

      <CalloutLayer callouts={callouts} highlightId={highlightId} hideLabels={hideLabels} />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Capacitor close-up — round dual-run capacitor with C / FAN / HERM terminals
// ----------------------------------------------------------------------------
export function CapacitorCloseUp({
  callouts,
  highlightId,
  hideLabels,
  className,
}: EquipmentIllustrationProps) {
  return (
    <svg
      viewBox={`0 0 ${DEFAULT_VIEWBOX_W} ${DEFAULT_VIEWBOX_H}`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label="Dual-run capacitor close-up with C FAN HERM terminals"
    >
      <defs>
        <radialGradient id="capTop" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#e8c068" />
          <stop offset="0.7" stopColor="#caa14a" />
          <stop offset="1" stopColor="#8e6f30" />
        </radialGradient>
        <linearGradient id="capBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#caa14a" />
          <stop offset="1" stopColor="#705a28" />
        </linearGradient>
      </defs>
      <ellipse cx="300" cy="395" rx="180" ry="12" fill="#000" opacity="0.4" />

      {/* Body */}
      <rect x="200" y="200" width="200" height="160" rx="8" fill="url(#capBody)" stroke="#0d0f12" strokeWidth="2" />
      {/* Top plate */}
      <ellipse cx="300" cy="200" rx="100" ry="22" fill="url(#capTop)" stroke="#0d0f12" strokeWidth="2" />

      {/* Three terminals */}
      {[
        { x: 240, label: "C", sub: "COMMON" },
        { x: 300, label: "FAN", sub: "" },
        { x: 360, label: "HERM", sub: "COMPRESSOR" },
      ].map((t) => (
        <g key={t.label}>
          <rect x={t.x - 14} y={188} width={28} height={20} rx="2" fill="#1a1d24" stroke="#0d0f12" strokeWidth="1.5" />
          <circle cx={t.x} cy={198} r={4} fill="#9aa3ad" />
          <text x={t.x} y={182} textAnchor="middle" fontSize="14" fontWeight="800" fill="#f5a524" fontFamily="ui-sans-serif, system-ui">{t.label}</text>
          {t.sub && (
            <text x={t.x} y={170} textAnchor="middle" fontSize="9" fill="#9aa3ad" fontFamily="ui-sans-serif, system-ui" letterSpacing="0.5">{t.sub}</text>
          )}
        </g>
      ))}

      {/* Rating plate */}
      <rect x="230" y="260" width="140" height="60" rx="4" fill="#1a1d24" stroke="#0d0f12" strokeWidth="1" />
      <text x="300" y="280" textAnchor="middle" fontSize="13" fontWeight="700" fill="#9aa3ad" fontFamily="ui-monospace, monospace">DUAL RUN CAP</text>
      <text x="300" y="298" textAnchor="middle" fontSize="11" fill="#7a828c" fontFamily="ui-monospace, monospace">+/- 6% TOLERANCE</text>
      <text x="300" y="314" textAnchor="middle" fontSize="10" fill="#7a828c" fontFamily="ui-monospace, monospace">VERIFY LABEL</text>

      <CalloutLayer callouts={callouts} highlightId={highlightId} hideLabels={hideLabels} />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Contactor close-up — square contactor with line/load terminals
// ----------------------------------------------------------------------------
export function ContactorCloseUp({
  callouts,
  highlightId,
  hideLabels,
  className,
}: EquipmentIllustrationProps) {
  return (
    <svg
      viewBox={`0 0 ${DEFAULT_VIEWBOX_W} ${DEFAULT_VIEWBOX_H}`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label="Single-pole contactor with line side and load side terminals"
    >
      <defs>
        <linearGradient id="contBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f37" />
          <stop offset="1" stopColor="#1a1d24" />
        </linearGradient>
      </defs>
      <ellipse cx="300" cy="395" rx="200" ry="12" fill="#000" opacity="0.4" />

      {/* Base block */}
      <rect x="160" y="160" width="280" height="180" rx="6" fill="url(#contBody)" stroke="#0d0f12" strokeWidth="2" />

      {/* Top — line side */}
      <rect x="160" y="160" width="280" height="50" rx="6" fill="#2a2f37" stroke="#0d0f12" strokeWidth="2" />
      <text x="180" y="190" fontSize="13" fontWeight="800" fill="#f5a524" fontFamily="ui-sans-serif, system-ui">LINE</text>
      {/* Line terminals (incoming wires from disconnect) */}
      {[230, 290, 350, 410].map((x, i) => (
        <g key={`l${i}`}>
          <rect x={x - 10} y={195} width={20} height={12} fill="#9aa3ad" stroke="#0d0f12" strokeWidth="1" />
          <rect x={x - 3} y={207} width={6} height={18} fill="#5a6470" stroke="#0d0f12" strokeWidth="1" />
        </g>
      ))}

      {/* Bottom — load side */}
      <rect x="160" y="290" width="280" height="50" rx="6" fill="#2a2f37" stroke="#0d0f12" strokeWidth="2" />
      <text x="180" y="320" fontSize="13" fontWeight="800" fill="#f5a524" fontFamily="ui-sans-serif, system-ui">LOAD</text>
      {/* Load terminals (outgoing to compressor/fan) */}
      {[230, 290, 350, 410].map((x, i) => (
        <g key={`ld${i}`}>
          <rect x={x - 10} y={282} width={20} height={12} fill="#9aa3ad" stroke="#0d0f12" strokeWidth="1" />
          <rect x={x - 3} y={258} width={6} height={26} fill="#5a6470" stroke="#0d0f12" strokeWidth="1" />
        </g>
      ))}

      {/* Coil / low-voltage side */}
      <rect x="440" y="200" width="50" height="100" rx="4" fill="#2a2f37" stroke="#0d0f12" strokeWidth="2" />
      <text x="465" y="252" textAnchor="middle" fontSize="10" fill="#9aa3ad" fontFamily="ui-sans-serif, system-ui" transform="rotate(90 465 252)">24V COIL</text>
      <circle cx="450" cy="210" r="4" fill="#9aa3ad" />
      <circle cx="480" cy="210" r="4" fill="#9aa3ad" />
      <circle cx="450" cy="290" r="4" fill="#9aa3ad" />
      <circle cx="480" cy="290" r="4" fill="#9aa3ad" />

      <CalloutLayer callouts={callouts} highlightId={highlightId} hideLabels={hideLabels} />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Thermostat / low-voltage wiring — 3-box flow: thermostat -> indoor unit -> outdoor condenser
// ----------------------------------------------------------------------------
export function ThermostatWiringDiagram({ className }: { className?: string }) {
  // Boxes positioned horizontally; wires colored by standard convention
  const wires = [
    { y: 110, color: "#e23b3b", label: "R — 24V" },
    { y: 145, color: "#3b6ee2", label: "C — Common" },
    { y: 180, color: "#e2c93b", label: "Y — Cool" },
    { y: 215, color: "#3be25e", label: "G — Fan" },
    { y: 250, color: "#e8e8e8", label: "W — Heat" },
    { y: 285, color: "#e28a3b", label: "O/B — Rev Valve" },
  ];

  return (
    <svg
      viewBox={`0 0 ${DEFAULT_VIEWBOX_W} 360`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label="Thermostat, indoor unit, and outdoor condenser wiring diagram"
    >
      {/* Three boxes */}
      {[
        { x: 30, label: "THERMOSTAT" },
        { x: 220, label: "INDOOR UNIT" },
        { x: 410, label: "OUTDOOR CONDENSER" },
      ].map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={70} width={160} height={230} rx={8} fill="#1a1d24" stroke="#4a5260" strokeWidth={2} />
          <text x={b.x + 80} y={50} textAnchor="middle" fontSize={12} fontWeight={800} fill="#f5a524" fontFamily="ui-sans-serif, system-ui" letterSpacing="1">
            {b.label}
          </text>
          {/* Terminal strip */}
          <rect x={b.x + 10} y={90} width={140} height={200} rx={4} fill="#0d0f12" stroke="#4a5260" strokeWidth={1} />
          {/* Terminal screws */}
          {wires.map((w, i) => (
            <g key={i}>
              <circle cx={b.x + 30} cy={w.y} r={5} fill="#9aa3ad" stroke="#0d0f12" strokeWidth={1} />
              <text x={b.x + 50} y={w.y + 4} fontSize={11} fill="#9aa3ad" fontFamily="ui-monospace, monospace">{w.label.split(" — ")[0]}</text>
            </g>
          ))}
        </g>
      ))}

      {/* Wires connecting the boxes */}
      {wires.map((w, i) => (
        <g key={i}>
          <line x1={190} y1={w.y} x2={220} y2={w.y} stroke={w.color} strokeWidth={3} />
          <line x1={380} y1={w.y} x2={410} y2={w.y} stroke={w.color} strokeWidth={3} />
          {/* label */}
          <text x={300} y={w.y - 4} textAnchor="middle" fontSize={10} fill={w.color} fontWeight={700} fontFamily="ui-sans-serif, system-ui">
            {w.label}
          </text>
        </g>
      ))}

      {/* Warning text at bottom */}
      <rect x="30" y="315" width="540" height="32" rx={4} fill="#2a1d12" stroke="#e28a3b" strokeWidth={1.5} />
      <text x="300" y="335" textAnchor="middle" fontSize={11} fontWeight={700} fill="#e28a3b" fontFamily="ui-sans-serif, system-ui" letterSpacing="0.5">
        WIRE COLOR IS A CONVENTION — VERIFY THE TERMINAL AT BOTH ENDS
      </text>
    </svg>
  );
}
