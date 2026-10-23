import { useEffect, useMemo, useRef, useState } from "react";
import {
  BODY,
  BRASS,
  BRASS_DARK,
  BRASS_LIGHT,
  CREAM,
  DISPLAY,
  ERA_THEME,
  INK,
  PLAYER_COLORS,
  SOOT,
  SOOT_DEEP,
  brassPlate,
  colorOf,
  engraved,
  parchment,
} from "./theme.js";
import {
  BackIcon,
  BarrelIcon,
  CanalIcon,
  CloseIcon,
  CogIcon,
  FactoryIcon,
  LedgerIcon,
  PlusIcon,
  RailIcon,
  TopHatIcon,
  UndoIcon,
  WreathIcon,
} from "./icons.jsx";
import { GlobalStyles, RollingNumber, WaxSeal } from "./ornaments.jsx";

/* ─────────────────────────── Game data ─────────────────────────── */

const MERCHANT_BONUSES = [
  { id: "m3a", vp: 3 },
  { id: "m3b", vp: 3 },
  { id: "m4", vp: 4 },
];

const ERAS = ["canal", "rail"];
const PHASES = ["canal", "rail", "final"];
const PHASE_ICON = { canal: CanalIcon, rail: RailIcon, final: WreathIcon };
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const MAX_UNDO = 100;

const GAME_KEY = "brass.game.v1";
const HISTORY_KEY = "brass.history.v1";

/* ─────────────────────────── Helpers ─────────────────────────── */

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// links / tiles are lists of individual VP entries, e.g. tiles: [9, 4, 6]
const defaultEra = () => ({ links: [], tiles: [], merchantBonuses: [] });

const emptyGame = () => ({ started: false, players: [], phase: "canal", savedHistoryId: null });

const sum = (list) => list.reduce((s, n) => s + n, 0);

const merchantVP = (ids) => ids.reduce((s, id) => s + (MERCHANT_BONUSES.find((b) => b.id === id)?.vp ?? 0), 0);

const eraVP = (era) => sum(era.links) + sum(era.tiles) + merchantVP(era.merchantBonuses);

const totalVP = (p) => eraVP(p.canal) + eraVP(p.rail);

const hasAnyScore = (players) => players.some((p) => totalVP(p) > 0);

const initialOf = (name) => (name.trim()[0] ?? "").toUpperCase();

const nameKey = (name) => name.trim().toLowerCase();

function loadJSON(key, fallback, isValid, migrate = (x) => x) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? migrate(parsed) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode etc.) — app still works, just won't persist */
  }
}

function usePersistentState(key, fallback, isValid, migrate) {
  const [value, setValue] = useState(() => loadJSON(key, fallback, isValid, migrate));
  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);
  return [value, setValue];
}

// Accepts both the current list format and the older single-number format.
const isValidEntries = (v) => Number.isFinite(v) || (Array.isArray(v) && v.every(Number.isFinite));

const isValidEra = (e) => e && isValidEntries(e.links) && isValidEntries(e.tiles) && Array.isArray(e.merchantBonuses);

const isValidGame = (g) =>
  g &&
  typeof g === "object" &&
  Array.isArray(g.players) &&
  g.players.every((p) => p && p.id && typeof p.name === "string" && isValidEra(p.canal) && isValidEra(p.rail)) &&
  PHASES.includes(g.phase);

const isValidHistory = (h) => Array.isArray(h) && h.every((g) => g && g.id && Array.isArray(g.players));

// Older saves stored one running number per row; turn it into a single entry.
const toEntries = (v) => (Array.isArray(v) ? v : v > 0 ? [v] : []);

// Players saved with a color the game doesn't have get the next free game color.
function fixColors(players) {
  const used = new Set();
  const valid = (id) => PLAYER_COLORS.some((c) => c.id === id);
  const keep = players.map((p) => {
    if (valid(p.colorId) && !used.has(p.colorId)) {
      used.add(p.colorId);
      return p.colorId;
    }
    return null;
  });
  return players.map((p, i) => {
    if (keep[i]) return p;
    const free = PLAYER_COLORS.find((c) => !used.has(c.id))?.id ?? PLAYER_COLORS[0].id;
    used.add(free);
    return { ...p, colorId: free };
  });
}

const migrateGame = (g) => ({
  ...g,
  players: fixColors(
    g.players.map((p) => ({
      ...p,
      canal: { ...p.canal, links: toEntries(p.canal.links), tiles: toEntries(p.canal.tiles) },
      rail: { ...p.rail, links: toEntries(p.rail.links), tiles: toEntries(p.rail.tiles) },
    }))
  ),
});

/** Ranks players by total; tied players share a rank. */
function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => b.total - a.total);
  let rank = 0;
  return sorted.map((p, i) => {
    if (i === 0 || p.total !== sorted[i - 1].total) rank = i;
    const tied =
      (i > 0 && sorted[i - 1].total === p.total) || (i < sorted.length - 1 && sorted[i + 1].total === p.total);
    return { ...p, rank, tied };
  });
}

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
};

/* ─────────────────────────── Shared pieces ─────────────────────────── */

function SootButton({ children, onClick, disabled, style, ariaLabel, type = "button" }) {
  return (
    <button
      type={type}
      className="press"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "rgba(0,0,0,0.38)",
        border: "1px solid rgba(201,162,74,0.42)",
        borderRadius: 6,
        color: BRASS_LIGHT,
        fontFamily: BODY,
        fontSize: "16px",
        padding: "10px 12px",
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function BrassButton({ children, onClick, disabled, style }) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...brassPlate("10px"),
        ...engraved,
        width: "100%",
        border: `1px solid ${BRASS_DARK}`,
        borderRadius: 6,
        padding: "16px 28px",
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: "19px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Header({ compact }) {
  return (
    <header
      style={{
        textAlign: "center",
        // Clear the iOS status bar, which overlaps the page because of black-translucent + viewport-fit=cover
        padding: compact
          ? "calc(env(safe-area-inset-top) + 18px) 16px 8px"
          : "calc(env(safe-area-inset-top) + 40px) 16px 18px",
      }}
    >
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: compact ? "clamp(26px, 7.5vw, 36px)" : "clamp(30px, 8.4vw, 54px)",
          lineHeight: 1.05,
          margin: 0,
          background: "linear-gradient(180deg, #f6e2a6 0%, #d9b45c 45%, #a97f2e 70%, #e3c272 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.6))",
        }}
      >
        Brass: Birmingham
      </h1>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: compact ? 4 : 8 }}>
        <span style={{ width: 44, height: 1, background: `linear-gradient(to right, transparent, ${BRASS})` }} />
        <span style={{ fontFamily: BODY, fontStyle: "italic", fontSize: compact ? "15px" : "18px", color: `${BRASS}dd` }}>Scoring sheet</span>
        <span style={{ width: 44, height: 1, background: `linear-gradient(to left, transparent, ${BRASS})` }} />
      </div>
    </header>
  );
}

function Shell({ era = "final", compact, children }) {
  const theme = ERA_THEME[era];
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `${theme.pattern}, radial-gradient(ellipse 120% 60% at 50% -10%, ${theme.glow}, transparent 70%), linear-gradient(180deg, ${SOOT} 0%, ${SOOT_DEEP} 100%)`,
        fontFamily: BODY,
        color: CREAM,
      }}
    >
      <GlobalStyles />
      <Header compact={compact} />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "8px 14px 64px" }}>{children}</main>
    </div>
  );
}

/** Dotted-leader ledger line: "Canal era ........ 34" */
function LedgerLine({ label, value, strong, color = INK }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: strong ? "10px 0 4px" : "7px 0" }}>
      <span style={{ fontFamily: strong ? DISPLAY : BODY, fontWeight: strong ? 700 : 400, fontSize: strong ? "19px" : "18px" }}>{label}</span>
      <span style={{ flex: 1, borderBottom: `2px dotted rgba(43,29,16,0.3)`, transform: "translateY(-4px)" }} />
      <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: strong ? "28px" : "22px", color }}>
        <RollingNumber value={value} />
      </span>
    </div>
  );
}

/* ─────────────────────────── Setup screen ─────────────────────────── */

function SetupScreen({ initialPlayers, mode, recentNames, canCancel, onCancel, onDone, onOpenHistory, historyCount }) {
  const firstFreeColor = (rows) =>
    PLAYER_COLORS.find((c) => !rows.some((r) => r.colorId === c.id))?.id ?? PLAYER_COLORS[0].id;

  const [rows, setRows] = useState(() =>
    initialPlayers.length
      ? initialPlayers.map((p) => ({ id: p.id, name: p.name, colorId: p.colorId }))
      : [{ id: newId(), name: "", colorId: PLAYER_COLORS[0].id }]
  );
  const lastInputRef = useRef(null);
  const [focusNewest, setFocusNewest] = useState(false);

  useEffect(() => {
    if (focusNewest && lastInputRef.current) {
      lastInputRef.current.focus();
      setFocusNewest(false);
    }
  }, [focusNewest, rows.length]);

  const takenBy = Object.fromEntries(rows.map((r) => [r.colorId, r.id]));
  const update = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addPlayer = (name = "") => {
    if (rows.length >= MAX_PLAYERS) return;
    setRows((rs) => [...rs, { id: newId(), name, colorId: firstFreeColor(rs) }]);
    if (!name) setFocusNewest(true);
  };

  const removePlayer = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  const applyRecentName = (name) => {
    const emptyRow = rows.find((r) => !r.name.trim());
    if (emptyRow) update(emptyRow.id, { name });
    else addPlayer(name);
  };

  const usedNames = new Set(rows.map((r) => nameKey(r.name)).filter(Boolean));
  const suggestions = recentNames.filter((n) => !usedNames.has(nameKey(n)));
  const roomForName = rows.length < MAX_PLAYERS || rows.some((r) => !r.name.trim());
  const canStart = rows.length >= MIN_PLAYERS;

  const finish = () => {
    if (!canStart) return;
    onDone(rows.map((r, i) => ({ ...r, name: r.name.trim() || `Player ${i + 1}` })));
  };

  return (
    <Shell era="final" compact={false}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 16px", gap: 10 }}>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "26px", margin: 0, color: CREAM }}>
          {mode === "edit" ? "Edit players" : "Who's playing?"}
        </h2>
        {historyCount > 0 && (
          <SootButton onClick={onOpenHistory} style={{ padding: "8px 12px", fontSize: "15px" }}>
            <LedgerIcon size={18} /> History
          </SootButton>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((row, i) => {
          const c = colorOf(row.colorId);
          const isLast = i === rows.length - 1;
          return (
            <section key={row.id} style={{ ...parchment, borderRadius: 8, padding: "16px 16px 18px", borderTop: `5px solid ${c.seal}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <WaxSeal color={c} initial={initialOf(row.name) || String(i + 1)} size={50} />
                <input
                  ref={isLast ? lastInputRef : null}
                  className="ledger-input"
                  value={row.name}
                  placeholder={`Player ${i + 1}'s name`}
                  aria-label={`Player ${i + 1} name`}
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  onChange={(e) => update(row.id, { name: e.target.value.slice(0, 24) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 48,
                    background: "rgba(255,251,238,0.5)",
                    border: "1.5px solid rgba(43,29,16,0.3)",
                    borderRadius: 5,
                    color: INK,
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: "20px",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove player ${i + 1}`}
                    onClick={() => removePlayer(row.id)}
                    style={{ background: "none", border: "none", color: "rgba(43,29,16,0.55)", cursor: "pointer", padding: 6, margin: "-6px" }}
                  >
                    <CloseIcon size={22} />
                  </button>
                )}
              </div>
              <div style={{ fontFamily: BODY, fontStyle: "italic", fontSize: "15px", color: "rgba(43,29,16,0.7)", marginBottom: 8 }}>
                Seal color: {c.name.toLowerCase()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {PLAYER_COLORS.map((pc) => {
                  const selected = pc.id === row.colorId;
                  const taken = takenBy[pc.id] && !selected;
                  return (
                    <button
                      key={pc.id}
                      type="button"
                      aria-label={`${pc.name}${taken ? " (taken)" : ""}`}
                      aria-pressed={selected}
                      disabled={taken}
                      onClick={() => update(row.id, { colorId: pc.id })}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 2,
                        borderRadius: "50%",
                        cursor: taken ? "default" : "pointer",
                        outline: selected ? `2px solid ${INK}` : "none",
                        outlineOffset: 1,
                        transform: selected ? "scale(1.06)" : "none",
                        transition: "transform 120ms",
                      }}
                    >
                      <WaxSeal color={pc} size={44} dim={taken} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {rows.length < MAX_PLAYERS && (
        <SootButton
          onClick={() => addPlayer()}
          style={{ width: "100%", marginTop: 14, padding: "15px", fontSize: "18px", borderStyle: "dashed", background: "rgba(0,0,0,0.25)" }}
        >
          <PlusIcon size={20} /> Add player
        </SootButton>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: BODY, fontStyle: "italic", fontSize: "16px", color: `${CREAM}aa`, marginBottom: 8 }}>Played before</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.map((n) => (
              <SootButton
                key={n}
                disabled={!roomForName}
                onClick={() => applyRecentName(n)}
                style={{ padding: "7px 16px", borderRadius: 20, fontSize: "16px", color: CREAM }}
              >
                {n}
              </SootButton>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <BrassButton onClick={finish} disabled={!canStart}>
          {mode === "edit" ? "Back to game" : "Start game"}
        </BrassButton>
        {!canStart && (
          <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "16px", color: `${CREAM}99`, marginTop: 10 }}>
            Add at least one more player to start.
          </div>
        )}
        {canCancel && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: `${CREAM}88`, fontFamily: BODY, fontSize: "17px", cursor: "pointer", padding: 10 }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ─────────────────────────── Ledger rows ─────────────────────────── */

const rowShell = { padding: "14px 0", borderBottom: "1px solid rgba(43,29,16,0.16)" };

function RowHeading({ icon: IconC, label, sublabel, value, eraInk }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: eraInk }}>
        <IconC size={26} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "17px", lineHeight: 1.2 }}>{label}</div>
        {sublabel && <div style={{ fontStyle: "italic", fontSize: "14.5px", color: "rgba(43,29,16,0.68)", lineHeight: 1.3 }}>{sublabel}</div>}
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "26px", color: eraInk, minWidth: 34, textAlign: "right" }}>
        <RollingNumber value={value} />
      </div>
    </div>
  );
}

function AddRow({ icon, label, sublabel, entries, onAdd, onRemoveAt, color, eraInk }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const submit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    onAdd(n);
    setDraft("");
    inputRef.current?.focus(); // keep the number pad open for the next tile
  };

  return (
    <div style={rowShell}>
      <RowHeading icon={icon} label={label} sublabel={sublabel} value={sum(entries)} eraInk={eraInk} />

      {entries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 }}>
          {entries.map((n, i) => (
            <button
              key={i}
              type="button"
              className="stamp-in"
              aria-label={`Remove ${n} from ${label}`}
              onClick={() => onRemoveAt(i)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 6px 3px 9px",
                background: "rgba(255,250,235,0.35)",
                border: `1.5px solid ${color.ink}`,
                borderRadius: 3,
                color: color.ink,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
                rotate: `${((i * 7) % 5) - 2}deg`, // a little hand-stamped wobble
              }}
            >
              +{n}
              <CloseIcon size={12} strokeWidth={2} style={{ opacity: 0.55 }} />
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ display: "flex", gap: 8, marginTop: 11 }}
      >
        <input
          ref={inputRef}
          className="ledger-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="enter"
          autoComplete="off"
          aria-label={`Add to ${label}`}
          placeholder="Add points"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
          style={{
            flex: 1,
            minWidth: 0,
            height: 46,
            textAlign: "center",
            background: "rgba(255,251,238,0.5)",
            border: "1.5px solid rgba(43,29,16,0.3)",
            borderRadius: 5,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: "22px",
            color: INK,
            outline: "none",
            padding: 0,
          }}
        />
        <button
          type="submit"
          className="press"
          disabled={!draft}
          // Stop the tap from closing the keyboard before the number is added.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            width: 82,
            height: 46,
            background: "linear-gradient(180deg, #ecd189, #c39c45 55%, #a98232)",
            border: `1px solid ${BRASS_DARK}`,
            borderRadius: 5,
            boxShadow: "inset 0 1px 0 rgba(255,245,210,0.7), 0 1px 2px rgba(0,0,0,0.3)",
            ...engraved,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: "17px",
            cursor: draft ? "pointer" : "default",
            opacity: draft ? 1 : 0.45,
          }}
        >
          Add
        </button>
      </form>
    </div>
  );
}

function MerchantRow({ color, eraInk, playerId, claimed, claimedBy, playersById, onToggle }) {
  return (
    <div style={{ ...rowShell, borderBottom: "none" }}>
      <RowHeading icon={BarrelIcon} label="Merchant beer" sublabel="One player per barrel each era" value={merchantVP(claimed)} eraInk={eraInk} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 11 }}>
        {MERCHANT_BONUSES.map((b) => {
          const ownerId = claimedBy[b.id];
          const mine = ownerId === playerId;
          const owner = ownerId && !mine ? playersById[ownerId] : null;
          const ownerColor = owner ? colorOf(owner.colorId) : null;
          return (
            <button
              key={b.id}
              type="button"
              className="press"
              disabled={Boolean(owner)}
              aria-pressed={mine}
              aria-label={`${b.vp} VP${owner ? ` (taken by ${owner.name})` : ""}`}
              onClick={() => onToggle(b.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 44,
                padding: owner ? "4px 12px 4px 6px" : "4px 14px",
                borderRadius: 22,
                background: mine ? color.seal : owner ? "rgba(43,29,16,0.06)" : "rgba(255,250,235,0.35)",
                border: mine ? `1.5px solid ${color.ink}` : owner ? "1.5px solid rgba(43,29,16,0.15)" : `1.5px dashed ${eraInk}`,
                color: mine ? color.sealText : owner ? "rgba(43,29,16,0.45)" : INK,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "16px",
                cursor: owner ? "default" : "pointer",
                boxShadow: mine ? "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 3px rgba(0,0,0,0.25)" : "none",
              }}
            >
              {owner && <WaxSeal color={ownerColor} initial={initialOf(owner.name)} size={26} />}
              {mine && "✓ "}
              {b.vp} VP
              {owner && <span style={{ fontFamily: BODY, fontWeight: 400, fontStyle: "italic", fontSize: "14px", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Player card ─────────────────────────── */

function PlayerCard({ player, phase, claimedBy, playersById, onUpdateEra }) {
  const color = colorOf(player.colorId);
  const theme = ERA_THEME[phase];
  const total = totalVP(player);

  const eraData = phase === "final" ? null : player[phase];
  const update = (key, val) => onUpdateEra(phase, { ...eraData, [key]: val });
  const toggleMerchant = (id) => {
    const has = eraData.merchantBonuses.includes(id);
    update("merchantBonuses", has ? eraData.merchantBonuses.filter((x) => x !== id) : [...eraData.merchantBonuses, id]);
  };

  return (
    <article style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 22px rgba(0,0,0,0.55)", border: "1px solid rgba(201,162,74,0.3)" }}>
      {/* Brass nameplate */}
      <div style={{ ...brassPlate("9px"), display: "flex", alignItems: "center", gap: 12, padding: "12px 22px 12px 20px" }}>
        <WaxSeal color={color} initial={initialOf(player.name)} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...engraved, fontFamily: DISPLAY, fontWeight: 700, fontSize: "21px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player.name}
          </div>
          <div style={{ fontStyle: "italic", fontSize: "15px", color: "#5b4117" }}>
            {phase === "final" ? "Final total" : `${eraVP(eraData)} this era`}
          </div>
        </div>
        <div
          style={{
            ...engraved,
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: "32px",
            lineHeight: 1,
            padding: "6px 10px 7px",
            minWidth: 58,
            textAlign: "center",
            borderRadius: 5,
            background: "rgba(80,55,12,0.16)",
            boxShadow: "inset 0 2px 3px rgba(70,45,8,0.45), 0 1px 0 rgba(255,240,195,0.6)",
          }}
          aria-label={`${player.name} total ${total}`}
        >
          <RollingNumber value={total} />
        </div>
      </div>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color.seal}, ${color.seal}cc)` }} />

      {/* Ledger page */}
      <div style={{ ...parchment, padding: phase === "final" ? "10px 18px 14px" : "2px 16px 6px" }}>
        {phase === "final" ? (
          <>
            <LedgerLine label="Canal era" value={eraVP(player.canal)} />
            <LedgerLine label="Rail era" value={eraVP(player.rail)} />
            <div style={{ borderTop: `3px double rgba(43,29,16,0.45)`, marginTop: 4 }} />
            <LedgerLine label="Total" value={total} strong color={color.ink} />
          </>
        ) : (
          <>
            <AddRow
              icon={phase === "canal" ? CanalIcon : RailIcon}
              label={phase === "canal" ? "Canal links" : "Rail links"}
              sublabel="Add each link's points (link icons at both ends)"
              entries={eraData.links}
              onAdd={(n) => update("links", [...eraData.links, n])}
              onRemoveAt={(i) => update("links", eraData.links.filter((_, j) => j !== i))}
              color={color}
              eraInk={theme.ink}
            />
            <AddRow
              icon={FactoryIcon}
              label="Industry tiles"
              sublabel="Add the points on each flipped tile"
              entries={eraData.tiles}
              onAdd={(n) => update("tiles", [...eraData.tiles, n])}
              onRemoveAt={(i) => update("tiles", eraData.tiles.filter((_, j) => j !== i))}
              color={color}
              eraInk={theme.ink}
            />
            <MerchantRow
              color={color}
              eraInk={theme.ink}
              playerId={player.id}
              claimed={eraData.merchantBonuses}
              claimedBy={claimedBy}
              playersById={playersById}
              onToggle={toggleMerchant}
            />
          </>
        )}
      </div>
    </article>
  );
}

/* ─────────────────────────── Final-score pieces ─────────────────────────── */

function WinnerBanner({ players }) {
  const ranked = rankPlayers(players.map((p) => ({ ...p, total: totalVP(p) })));
  const leaders = ranked.filter((p) => p.rank === 0);
  const top = leaders[0];
  const runnerUp = ranked.find((p) => p.rank > 0);
  if (!top || top.total === 0) return null;

  const tie = leaders.length > 1;
  const color = colorOf(top.colorId);
  const names = leaders.map((p) => p.name);
  const headline = tie ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]} tie` : `${top.name} wins`;
  const margin = !tie && runnerUp ? top.total - runnerUp.total : 0;

  return (
    <section
      className="plate-in shimmer"
      aria-live="polite"
      style={{ ...brassPlate("13px"), borderRadius: 10, padding: "22px 26px 24px", textAlign: "center", marginBottom: 18, border: `1px solid ${BRASS_DARK}` }}
    >
      <div className="wreath-in" style={{ position: "relative", width: 104, height: 104, margin: "0 auto 4px" }}>
        <WreathIcon size={104} style={{ color: "#5a3f12", position: "absolute", inset: 0 }} />
        {tie ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 30, display: "flex", justifyContent: "center" }}>
            {leaders.slice(0, 4).map((p, i) => (
              <WaxSeal key={p.id} color={colorOf(p.colorId)} initial={initialOf(p.name)} size={36} style={{ marginLeft: i ? -12 : 0 }} />
            ))}
          </div>
        ) : (
          <WaxSeal color={color} initial={initialOf(top.name)} size={54} style={{ position: "absolute", left: 25, top: 22 }} />
        )}
      </div>
      <div style={{ ...engraved, fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(24px, 7vw, 32px)", lineHeight: 1.15 }}>{headline}</div>
      <div style={{ fontStyle: "italic", fontSize: "18px", color: "#4a3412", marginTop: 4 }}>
        {top.total} victory points{margin > 0 ? `, ${margin} ahead` : ""}
      </div>
    </section>
  );
}

function Standings({ players }) {
  const ranked = rankPlayers(players.map((p) => ({ ...p, total: totalVP(p) })));
  return (
    <section style={{ background: "rgba(0,0,0,0.42)", border: "1px solid rgba(201,162,74,0.28)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderBottom: "1px solid rgba(201,162,74,0.2)" }}>
        <WreathIcon size={22} style={{ color: BRASS }} />
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "20px", margin: 0, color: BRASS_LIGHT }}>Standings</h2>
      </div>
      {ranked.map((p) => {
        const c = colorOf(p.colorId);
        const first = p.rank === 0 && p.total > 0;
        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 18px",
              borderBottom: "1px solid rgba(201,162,74,0.1)",
              background: first ? "linear-gradient(90deg, rgba(201,162,74,0.16), transparent)" : "transparent",
            }}
          >
            <span style={{ width: 22, display: "flex", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: "17px", color: first ? BRASS_LIGHT : `${CREAM}66` }}>
              {first ? <WreathIcon size={22} style={{ color: BRASS_LIGHT }} /> : p.rank + 1}
            </span>
            <WaxSeal color={c} initial={initialOf(p.name)} size={30} />
            <span style={{ flex: 1, minWidth: 0, fontSize: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
              {p.tied && <span style={{ fontStyle: "italic", fontSize: "15px", color: `${BRASS}cc`, marginLeft: 8 }}>tied</span>}
            </span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "24px", color: first ? BRASS_LIGHT : `${CREAM}cc` }}>
              <RollingNumber value={p.total} />
            </span>
          </div>
        );
      })}
    </section>
  );
}

function SavePanel({ saved, onSave, onRematch, onNewGame }) {
  return (
    <section style={{ marginTop: 18, padding: 18, textAlign: "center", background: "rgba(0,0,0,0.42)", border: "1px solid rgba(201,162,74,0.28)", borderRadius: 8 }}>
      {saved ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: DISPLAY, fontWeight: 700, fontSize: "19px", color: BRASS_LIGHT }}>
            <LedgerIcon size={20} /> Saved to history
          </div>
          <p style={{ fontStyle: "italic", fontSize: "16px", color: `${CREAM}99`, margin: "6px 0 14px" }}>
            Changed a score since? Update the saved copy.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <SootButton onClick={onSave}>Update saved game</SootButton>
            <SootButton onClick={onRematch}>Rematch</SootButton>
            <SootButton onClick={onNewGame}>New players</SootButton>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontStyle: "italic", fontSize: "17px", color: `${CREAM}aa`, margin: "0 0 14px" }}>
            When the game's over, save it to the history and win tally.
          </p>
          <BrassButton onClick={onSave}>Finish &amp; save game</BrassButton>
        </>
      )}
    </section>
  );
}

/* ─────────────────────────── Game screen ─────────────────────────── */

function GameScreen({ game, setGame, commit, onUndo, canUndo, onEditPlayers, onNewGame, onOpenHistory, onSaveGame }) {
  const { players, phase } = game;
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  const claimedByEra = useMemo(() => {
    const out = { canal: {}, rail: {} };
    for (const era of ERAS) for (const p of players) for (const id of p[era].merchantBonuses) out[era][id] = p.id;
    return out;
  }, [players]);

  const setPhase = (ph) => setGame((g) => ({ ...g, phase: ph }));

  const updateEra = (playerId, era, eraData) =>
    commit((g) => ({ ...g, players: g.players.map((p) => (p.id === playerId ? { ...p, [era]: eraData } : p)) }));

  const resetScores = (g) => ({
    ...g,
    phase: "canal",
    savedHistoryId: null,
    players: g.players.map((p) => ({ ...p, canal: defaultEra(), rail: defaultEra() })),
  });

  const clearScores = () => {
    if (!window.confirm("Clear all scores for this game? Players stay the same.")) return;
    commit(resetScores);
  };

  return (
    <Shell era={phase} compact>
      {/* Top actions */}
      <nav style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <SootButton onClick={onEditPlayers} style={{ flex: 1, padding: "10px 6px", gap: 6 }}>
          <TopHatIcon size={20} /> Players
        </SootButton>
        <SootButton onClick={onOpenHistory} style={{ flex: 1, padding: "10px 6px", gap: 6 }}>
          <LedgerIcon size={19} /> History
        </SootButton>
        <SootButton onClick={onNewGame} style={{ flex: 1, padding: "10px 6px", gap: 6 }}>
          <CogIcon size={19} /> New game
        </SootButton>
      </nav>

      {/* Era tabs + undo, pinned while scrolling */}
      <div
        style={{
          display: "flex",
          gap: 8,
          position: "sticky",
          top: 0,
          zIndex: 5,
          padding: "8px 14px",
          margin: "0 -14px 12px",
          background: "rgba(17,12,8,0.82)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div role="tablist" style={{ flex: 1, display: "flex", minWidth: 0, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(201,162,74,0.32)", borderRadius: 8, overflow: "hidden" }}>
          {PHASES.map((ph, i) => {
            const active = phase === ph;
            const t = ERA_THEME[ph];
            const IconC = PHASE_ICON[ph];
            return (
              <button
                key={ph}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPhase(ph)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "8px 2px 7px",
                  background: active ? `linear-gradient(180deg, ${t.glow}, rgba(0,0,0,0.2))` : "transparent",
                  border: "none",
                  borderLeft: i ? "1px solid rgba(201,162,74,0.16)" : "none",
                  borderBottom: `3px solid ${active ? t.accent : "transparent"}`,
                  color: active ? t.accent : `${CREAM}80`,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "color 200ms, background 200ms",
                }}
              >
                <IconC size={22} />
                {t.label}
              </button>
            );
          })}
        </div>
        <SootButton
          onClick={onUndo}
          disabled={!canUndo}
          ariaLabel="Undo"
          style={{ flexDirection: "column", gap: 3, width: 62, padding: "8px 4px 7px", fontFamily: DISPLAY, fontWeight: 700, fontSize: "14px", borderRadius: 8 }}
        >
          <UndoIcon size={22} />
          Undo
        </SootButton>
      </div>

      {phase === "final" && <WinnerBanner players={players} />}

      {/* Player cards: one per row on phones, two per row on wider screens */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 16, marginBottom: 22 }}>
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            phase={phase}
            claimedBy={phase === "final" ? {} : claimedByEra[phase]}
            playersById={playersById}
            onUpdateEra={(era, data) => updateEra(player.id, era, data)}
          />
        ))}
      </div>

      <Standings players={players} />

      {phase === "final" && (
        <SavePanel saved={Boolean(game.savedHistoryId)} onSave={onSaveGame} onRematch={() => commit(resetScores)} onNewGame={onNewGame} />
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button
          type="button"
          onClick={clearScores}
          style={{ background: "none", border: "none", color: `${CREAM}70`, fontFamily: BODY, fontStyle: "italic", fontSize: "16px", cursor: "pointer", padding: 10, textDecoration: "underline", textUnderlineOffset: 4 }}
        >
          Clear all scores
        </button>
      </div>
    </Shell>
  );
}

/* ─────────────────────────── History screen ─────────────────────────── */

function HistoryScreen({ history, onBack, onDelete, onClear }) {
  const tally = useMemo(() => {
    const map = new Map();
    // history is newest-first, so the first spelling and color we meet are the most recent
    for (const g of history) {
      for (const p of rankPlayers(g.players)) {
        const key = nameKey(p.name);
        if (!map.has(key)) map.set(key, { name: p.name, colorId: p.colorId, games: 0, wins: 0, best: 0 });
        const t = map.get(key);
        t.games += 1;
        if (p.rank === 0) t.wins += 1;
        t.best = Math.max(t.best, p.total);
      }
    }
    return [...map.values()].sort((a, b) => b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name));
  }, [history]);

  const colHead = { fontStyle: "italic", fontSize: "14px", color: "rgba(43,29,16,0.6)", width: 44, textAlign: "right" };
  const colNum = { fontFamily: DISPLAY, fontWeight: 700, fontSize: "19px", width: 44, textAlign: "right" };

  return (
    <Shell era="final" compact>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 16px" }}>
        <SootButton onClick={onBack} ariaLabel="Back" style={{ padding: "8px 12px 8px 8px" }}>
          <BackIcon size={20} /> Back
        </SootButton>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "24px", margin: 0, color: CREAM }}>Game history</h2>
      </div>

      {history.length === 0 ? (
        <section style={{ ...parchment, borderRadius: 8, padding: "22px 20px", fontSize: "18px", lineHeight: 1.45 }}>
          No games saved yet. When a game ends, open the Final score tab and tap <strong style={{ fontFamily: DISPLAY }}>Finish &amp; save game</strong>.
        </section>
      ) : (
        <>
          <section style={{ ...parchment, borderRadius: 8, padding: "14px 18px 8px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingBottom: 6, borderBottom: "3px double rgba(43,29,16,0.4)" }}>
              <h3 style={{ flex: 1, fontFamily: DISPLAY, fontWeight: 700, fontSize: "21px", margin: 0 }}>Win tally</h3>
              <span style={colHead}>wins</span>
              <span style={colHead}>games</span>
              <span style={colHead}>best</span>
            </div>
            {tally.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: "1px solid rgba(43,29,16,0.14)" }}>
                <WaxSeal color={colorOf(t.colorId)} initial={initialOf(t.name)} size={28} />
                <span style={{ flex: 1, minWidth: 0, fontSize: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span style={{ ...colNum, fontWeight: 900, fontSize: "22px", color: "#6b4d14" }}>{t.wins}</span>
                <span style={colNum}>{t.games}</span>
                <span style={colNum}>{t.best}</span>
              </div>
            ))}
          </section>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {history.map((g) => (
              <section key={g.id} style={{ ...parchment, borderRadius: 8, padding: "10px 16px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", paddingBottom: 6, borderBottom: "1px solid rgba(43,29,16,0.25)" }}>
                  <span style={{ flex: 1, fontStyle: "italic", fontSize: "16px", color: "rgba(43,29,16,0.75)" }}>{formatDate(g.date)}</span>
                  <button
                    type="button"
                    aria-label="Delete this game"
                    onClick={() => {
                      if (window.confirm("Delete this game from history?")) onDelete(g.id);
                    }}
                    style={{ background: "none", border: "none", color: "rgba(43,29,16,0.5)", cursor: "pointer", padding: 6, margin: -6 }}
                  >
                    <CloseIcon size={20} />
                  </button>
                </div>
                {rankPlayers(g.players).map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                    <span style={{ width: 22, display: "flex", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 700, color: "rgba(43,29,16,0.55)" }}>
                      {p.rank === 0 ? <WreathIcon size={20} style={{ color: "#6b4d14" }} /> : p.rank + 1}
                    </span>
                    <WaxSeal color={colorOf(p.colorId)} initial={initialOf(p.name)} size={26} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: "17px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span style={{ fontStyle: "italic", fontSize: "14px", color: "rgba(43,29,16,0.55)" }}>
                      {p.canal} + {p.rail}
                    </span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "20px", minWidth: 34, textAlign: "right", color: p.rank === 0 ? "#6b4d14" : INK }}>{p.total}</span>
                  </div>
                ))}
              </section>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 26 }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete ALL saved games? This can't be undone.")) onClear();
              }}
              style={{ background: "none", border: "none", color: "#e0907c", fontFamily: BODY, fontStyle: "italic", fontSize: "16px", cursor: "pointer", padding: 10, textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              Clear history
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}

/* ─────────────────────────── App ─────────────────────────── */

export default function BrassBirminghamScorer() {
  const [game, setGame] = usePersistentState(GAME_KEY, emptyGame(), isValidGame, migrateGame);
  const [history, setHistory] = usePersistentState(HISTORY_KEY, [], isValidHistory);
  const [undoStack, setUndoStack] = useState([]); // snapshots of earlier scores, newest last
  const [screen, setScreen] = useState(() => (game.started && game.players.length >= MIN_PLAYERS ? "game" : "setup"));
  const [setupMode, setSetupMode] = useState("new");
  const [setupKey, setSetupKey] = useState(0); // remounts the setup form with fresh rows

  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [screen]);

  // Every score change goes through commit() so it can be undone.
  const commit = (updater) => {
    setUndoStack((st) => [...st.slice(-(MAX_UNDO - 1)), { players: game.players, savedHistoryId: game.savedHistoryId }]);
    setGame(updater);
  };

  const undo = () => {
    if (!undoStack.length) return;
    const snap = undoStack[undoStack.length - 1];
    setUndoStack((st) => st.slice(0, -1));
    setGame((g) => ({
      ...g,
      players: snap.players,
      // keep the link to a saved game even if the snapshot predates saving
      savedHistoryId: snap.savedHistoryId || g.savedHistoryId,
    }));
  };

  const recentNames = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const g of history) {
      for (const p of g.players) {
        const k = nameKey(p.name);
        if (k && !seen.has(k)) {
          seen.add(k);
          out.push(p.name);
        }
      }
    }
    return out.slice(0, 10);
  }, [history]);

  const openSetup = (mode) => {
    setSetupMode(mode);
    setSetupKey((k) => k + 1);
    setScreen("setup");
  };

  const handleNewGame = () => {
    if (game.started && hasAnyScore(game.players) && !game.savedHistoryId) {
      if (!window.confirm("Start a new game? The current scores haven't been saved and will be cleared.")) return;
    }
    openSetup("new");
  };

  const handleSetupDone = (rows) => {
    if (setupMode === "edit") {
      setGame((g) => {
        const existing = Object.fromEntries(g.players.map((p) => [p.id, p]));
        return {
          ...g,
          started: true,
          players: rows.map((r) => ({
            ...(existing[r.id] ?? { canal: defaultEra(), rail: defaultEra() }),
            id: r.id,
            name: r.name,
            colorId: r.colorId,
          })),
        };
      });
    } else {
      setGame({
        started: true,
        phase: "canal",
        savedHistoryId: null,
        players: rows.map((r) => ({ id: r.id, name: r.name, colorId: r.colorId, canal: defaultEra(), rail: defaultEra() })),
      });
    }
    setUndoStack([]);
    setScreen("game");
  };

  const handleSaveGame = () => {
    const snapshot = game.players.map((p) => ({
      name: p.name,
      colorId: p.colorId,
      canal: eraVP(p.canal),
      rail: eraVP(p.rail),
      total: totalVP(p),
    }));
    if (game.savedHistoryId && history.some((h) => h.id === game.savedHistoryId)) {
      setHistory((h) => h.map((entry) => (entry.id === game.savedHistoryId ? { ...entry, players: snapshot } : entry)));
    } else {
      const id = newId();
      setHistory((h) => [{ id, date: new Date().toISOString(), players: snapshot }, ...h]);
      setGame((g) => ({ ...g, savedHistoryId: id }));
    }
  };

  if (screen === "history") {
    return (
      <HistoryScreen
        history={history}
        onBack={() => setScreen(game.started ? "game" : "setup")}
        onDelete={(id) => setHistory((h) => h.filter((g) => g.id !== id))}
        onClear={() => setHistory([])}
      />
    );
  }

  if (screen === "setup") {
    const prefill = game.players.map(({ id, name, colorId }) => ({ id: setupMode === "edit" ? id : newId(), name, colorId }));
    return (
      <SetupScreen
        key={setupKey}
        initialPlayers={prefill}
        mode={setupMode}
        recentNames={recentNames}
        canCancel={game.started}
        onCancel={() => setScreen("game")}
        onDone={handleSetupDone}
        onOpenHistory={() => setScreen("history")}
        historyCount={history.length}
      />
    );
  }

  return (
    <GameScreen
      game={game}
      setGame={setGame}
      commit={commit}
      onUndo={undo}
      canUndo={undoStack.length > 0}
      onEditPlayers={() => openSetup("edit")}
      onNewGame={handleNewGame}
      onOpenHistory={() => setScreen("history")}
      onSaveGame={handleSaveGame}
    />
  );
}
