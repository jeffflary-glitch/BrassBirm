// Engraved-style line icons. All use currentColor, so they take the color of the text around them.

function Icon({ size = 22, children, strokeWidth = 1.6, title, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={{ flexShrink: 0, display: "block", ...style }}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** Narrowboat on the water — canal links. */
export const CanalIcon = (p) => (
  <Icon {...p}>
    <path d="M2.5 13.5h19l-1.6 3.2a1.5 1.5 0 0 1-1.3.8H5.4a1.5 1.5 0 0 1-1.3-.8z" />
    <path d="M6 13.5V10h8.5v3.5" />
    <path d="M8.5 11.7h1.2M11.3 11.7h1.2" />
    <path d="M17 13.5V9.2" />
    <path d="M2 20.6c1.7 0 1.7-1 3.3-1s1.7 1 3.4 1 1.7-1 3.3-1 1.7 1 3.3 1 1.7-1 3.4-1 1.6 1 3.3 1" />
  </Icon>
);

/** Rails and sleepers running into the distance — rail links. */
export const RailIcon = (p) => (
  <Icon {...p}>
    <path d="M9.4 3 5 21M14.6 3 19 21" />
    <path d="M8.4 6.5h7.2M7.4 10.6h9.2M6.4 15h11.2M5.3 19.4h13.4" />
  </Icon>
);

/** Sawtooth mill with a chimney — industry tiles. */
export const FactoryIcon = (p) => (
  <Icon {...p}>
    <path d="M3 21v-8.5l5 3v-3l5 3V9h2.4V3.5h3.2V21" />
    <path d="M2 21h20" />
    <path d="M6 18.2h1.6M10.2 18.2h1.6M14.4 18.2H16" />
    <path d="M20.2 3.2c.9-.3 1.4-1 1.2-1.9" strokeWidth="1.2" />
  </Icon>
);

/** Beer barrel — merchant beer bonus. */
export const BarrelIcon = (p) => (
  <Icon {...p}>
    <path d="M7 3.5h10c1.2 2.4 1.8 5.3 1.8 8.5s-.6 6.1-1.8 8.5H7c-1.2-2.4-1.8-5.3-1.8-8.5S5.8 5.9 7 3.5z" />
    <path d="M5.6 8h12.8M5.6 16h12.8" />
    <path d="M10 3.5c-.6 2.6-.9 5.4-.9 8.5s.3 5.9.9 8.5M14 3.5c.6 2.6.9 5.4.9 8.5s-.3 5.9-.9 8.5" strokeWidth="1.1" />
  </Icon>
);

/** Ledger book — game history. */
export const LedgerIcon = (p) => (
  <Icon {...p}>
    <path d="M4.5 5A2 2 0 0 1 6.5 3H19v14.5H6.5a2 2 0 0 0-2 2z" />
    <path d="M4.5 19.5a2 2 0 0 0 2 2H19v-4" />
    <path d="M8.5 7.5h7M8.5 10.5h7M8.5 13.5h4" />
  </Icon>
);

/** Top hat — players. */
export const TopHatIcon = (p) => (
  <Icon {...p}>
    <path d="M7 16.2V6.5c0-.9.7-1.6 1.6-1.6h6.8c.9 0 1.6.7 1.6 1.6v9.7" />
    <path d="M7 13.2h10" />
    <path d="M3.2 16.6c2.4 1.9 15.2 1.9 17.6 0" />
  </Icon>
);

// Builds a toothed gear outline.
function gearPath(cx, cy, rOuter, rInner, teeth) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const w = step * 0.22;
    pts.push([a - step / 2 + w, rInner], [a - w, rOuter], [a + w, rOuter], [a + step / 2 - w, rInner]);
  }
  return (
    pts
      .map(([a, r], i) => `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`)
      .join(" ") + "Z"
  );
}
const GEAR = gearPath(12, 12, 9.6, 7.4, 10);

/** Cog — new game. */
export const CogIcon = (p) => (
  <Icon {...p}>
    <path d={GEAR} />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

/** Curved arrow — undo. */
export const UndoIcon = (p) => (
  <Icon {...p}>
    <path d="M9 6.5 4.5 11 9 15.5" />
    <path d="M4.5 11h10a5 5 0 0 1 0 10H12" />
  </Icon>
);

export const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const BackIcon = (p) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
);

/** Laurel wreath — winner. Leaves are filled, stems are lines. */
export function WreathIcon({ size = 22, style, className }) {
  const leaves = [
    // [x, y, rotation] for the left branch; the right branch mirrors it
    [6.0, 6.0, -60],
    [4.4, 10.0, -36],
    [4.6, 14.4, -8],
    [6.6, 18.2, 26],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} style={{ flexShrink: 0, display: "block", ...style }}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9.6 20.8C5.4 18.6 3.6 14 5.4 5.2" />
        <path d="M14.4 20.8c4.2-2.2 6-6.8 4.2-15.6" />
        <path d="M9.4 20.8 12 19.6l2.6 1.2" />
      </g>
      <g fill="currentColor">
        {leaves.map(([x, y, r], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="2.5" ry="1.25" transform={`rotate(${r} ${x} ${y})`} />
            <ellipse cx={24 - x} cy={y} rx="2.5" ry="1.25" transform={`rotate(${-r} ${24 - x} ${y})`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
