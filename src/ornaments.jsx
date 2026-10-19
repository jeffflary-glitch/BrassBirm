// Decorative building blocks: wax-seal tokens, rolling numbers and the page-wide styles.
import { useEffect, useId, useRef, useState } from "react";
import { BODY, BRASS_LIGHT, DISPLAY, INK } from "./theme.js";

/* ───────── Wax seal ───────── */

// A slightly irregular circle, like pressed wax. Same shape every time.
function sealPath(cx, cy, r) {
  const n = 28;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + 0.045 * Math.sin(a * 5) + 0.03 * Math.cos(a * 9 + 1.3);
    const x = cx + r * wobble * Math.cos(a);
    const y = cy + r * wobble * Math.sin(a);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + "Z";
}
const SEAL = sealPath(20, 20, 17.2);

export function WaxSeal({ color, initial = "", size = 40, dim = false, style }) {
  const gid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        display: "block",
        filter: dim ? "grayscale(0.6)" : "drop-shadow(0 2px 2px rgba(0,0,0,0.45))",
        opacity: dim ? 0.25 : 1,
        ...style,
      }}
    >
      <defs>
        <radialGradient id={`w${gid}`} cx="36%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.35" stopColor={color.seal} stopOpacity="1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <path d={SEAL} fill={color.seal} />
      <path d={SEAL} fill={`url(#w${gid})`} />
      <circle cx="20" cy="20" r="12.2" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="1.2" />
      <circle cx="20" cy="20.6" r="12.2" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="0.8" />
      {initial && (
        <text
          x="20"
          y="20.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={DISPLAY}
          fontWeight="700"
          fontSize="15"
          fill={color.sealText}
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.25)", strokeWidth: 0.6 }}
        >
          {initial.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

/* ───────── Rolling number ───────── */

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return undefined;
    }
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduce;
}

/** Counts up (or down) to a new value when it changes. */
export function RollingNumber({ value, duration = 450 }) {
  const reduce = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (reduce || from === value || typeof window.requestAnimationFrame !== "function") {
      setShown(value);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);

  return (
    <span style={{ fontVariantNumeric: "lining-nums tabular-nums" }} aria-label={String(value)}>
      {shown}
    </span>
  );
}

/* ───────── Page-wide styles ───────── */

export function GlobalStyles() {
  return (
    <style>{`
      html, body { background: #110c08; }
      body { -webkit-tap-highlight-color: transparent; font-variant-numeric: lining-nums; }
      button, input { font-variant-numeric: lining-nums; }
      button { -webkit-tap-highlight-color: transparent; }
      button:focus-visible, input:focus-visible {
        outline: 2px solid ${BRASS_LIGHT};
        outline-offset: 2px;
      }
      .ledger-input::placeholder { color: rgba(43, 29, 16, 0.42); font-style: italic; font-weight: 400; font-family: ${BODY}; }
      .ledger-input:focus { border-color: ${INK} !important; background: rgba(255, 251, 238, 0.85) !important; }
      .press:active { transform: translateY(1px); filter: brightness(0.95); }

      @keyframes stamp-in {
        0% { transform: scale(1.5) rotate(-6deg); opacity: 0; }
        60% { transform: scale(0.94) rotate(1deg); opacity: 1; }
        100% { transform: none; }
      }
      .stamp-in { animation: stamp-in 260ms ease-out both; }

      @keyframes plate-in {
        from { opacity: 0; transform: translateY(10px) scale(0.96); }
        to { opacity: 1; transform: none; }
      }
      .plate-in { animation: plate-in 520ms cubic-bezier(.2,.8,.2,1) both; }

      @keyframes shimmer {
        from { transform: translateX(-140%) skewX(-18deg); }
        to { transform: translateX(260%) skewX(-18deg); }
      }
      .shimmer { position: relative; overflow: hidden; }
      .shimmer::after {
        content: "";
        position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
        background: linear-gradient(90deg, transparent, rgba(255,248,220,0.75), transparent);
        animation: shimmer 1.3s 0.45s ease-in-out both;
        pointer-events: none;
      }

      @keyframes wreath-in {
        from { opacity: 0; transform: scale(0.6) rotate(-20deg); }
        to { opacity: 1; transform: none; }
      }
      .wreath-in { animation: wreath-in 600ms 0.15s cubic-bezier(.2,.9,.3,1.3) both; }

      @media (prefers-reduced-motion: reduce) {
        .stamp-in, .plate-in, .wreath-in { animation: none !important; }
        .shimmer::after { display: none; }
        * { transition: none !important; }
      }
    `}</style>
  );
}
