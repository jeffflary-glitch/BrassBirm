import { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────── Constants ─────────────────────────── */

const GOLD = "#c9a84c";
const CREAM = "#f5e6c8";
const FONT = "'Georgia', 'Times New Roman', serif";

const PLAYER_COLORS = [
  { id: "red",    name: "Red",    bg: "#4a1a1a", accent: "#d94f3a" },
  { id: "blue",   name: "Blue",   bg: "#1a2a4a", accent: "#5b9bd5" },
  { id: "green",  name: "Green",  bg: "#1a3a2a", accent: "#4aad6f" },
  { id: "yellow", name: "Yellow", bg: "#3a3212", accent: "#e8c547" },
  { id: "purple", name: "Purple", bg: "#2e1a46", accent: "#a77ad9" },
  { id: "teal",   name: "Teal",   bg: "#123838", accent: "#3fb8b0" },
  { id: "white",  name: "White",  bg: "#2b2a27", accent: "#e6e0d2" },
  { id: "black",  name: "Black",  bg: "#141414", accent: "#9a9a9a" },
];

const colorOf = (colorId) =>
  PLAYER_COLORS.find((c) => c.id === colorId) ?? PLAYER_COLORS[0];

const MERCHANT_BONUSES = [
  { id: "m3a", label: "3 VP", vp: 3 },
  { id: "m3b", label: "3 VP", vp: 3 },
  { id: "m4",  label: "4 VP", vp: 4 },
];

const PHASE_LABELS = { canal: "Canal Era", rail: "Rail Era", final: "Final Score" };
const ERAS = ["canal", "rail"];
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const GAME_KEY = "brass.game.v1";
const HISTORY_KEY = "brass.history.v1";

/* ─────────────────────────── Helpers ─────────────────────────── */

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// links / tiles are lists of individual VP entries, e.g. tiles: [9, 4, 6]
const defaultEra = () => ({ links: [], tiles: [], merchantBonuses: [] });

const MAX_UNDO = 100;

const emptyGame = () => ({
  started: false,
  players: [],
  phase: "canal",
  savedHistoryId: null,
});

const sum = (list) => list.reduce((s, n) => s + n, 0);

const eraVP = (era) =>
  sum(era.links) +
  sum(era.tiles) +
  era.merchantBonuses.reduce(
    (s, id) => s + (MERCHANT_BONUSES.find((b) => b.id === id)?.vp ?? 0),
    0
  );

const totalVP = (p) => eraVP(p.canal) + eraVP(p.rail);

const hasAnyScore = (players) =>
  players.some((p) => totalVP(p) > 0);

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

const isValidEra = (e) =>
  e && isValidEntries(e.links) && isValidEntries(e.tiles) && Array.isArray(e.merchantBonuses);

// Older saves stored one running number per row; turn it into a single entry.
const toEntries = (v) => (Array.isArray(v) ? v : v > 0 ? [v] : []);

const migrateGame = (g) => ({
  ...g,
  players: g.players.map((p) => ({
    ...p,
    canal: { ...p.canal, links: toEntries(p.canal.links), tiles: toEntries(p.canal.tiles) },
    rail: { ...p.rail, links: toEntries(p.rail.links), tiles: toEntries(p.rail.tiles) },
  })),
});

const isValidGame = (g) =>
  g &&
  typeof g === "object" &&
  Array.isArray(g.players) &&
  g.players.every((p) => p && p.id && typeof p.name === "string" && isValidEra(p.canal) && isValidEra(p.rail)) &&
  ["canal", "rail", "final"].includes(g.phase);

const isValidHistory = (h) => Array.isArray(h) && h.every((g) => g && g.id && Array.isArray(g.players));

/** Ranks players by total; tied players share a rank. */
function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => b.total - a.total);
  let rank = 0;
  return sorted.map((p, i) => {
    if (i === 0 || p.total !== sorted[i - 1].total) rank = i;
    const tied =
      (i > 0 && sorted[i - 1].total === p.total) ||
      (i < sorted.length - 1 && sorted[i + 1].total === p.total);
    return { ...p, rank, tied };
  });
}

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const nameKey = (name) => name.trim().toLowerCase();

/* ─────────────────────────── Shared styles ─────────────────────────── */

const ghostButton = (extra = {}) => ({
  background: "transparent",
  border: "1px solid rgba(201,168,76,0.45)",
  color: GOLD,
  padding: "9px 14px",
  fontSize: "11px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: FONT,
  borderRadius: 3,
  ...extra,
});

const solidButton = (extra = {}) => ({
  background: "linear-gradient(135deg, #c9a84c, #a8862f)",
  border: "1px solid #e0c370",
  color: "#1a1208",
  padding: "14px 20px",
  fontSize: "13px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  fontWeight: "bold",
  cursor: "pointer",
  fontFamily: FONT,
  borderRadius: 4,
  width: "100%",
  ...extra,
});

const panel = {
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6,
  overflow: "hidden",
};

const sectionLabel = {
  fontSize: "11px",
  letterSpacing: "3px",
  color: GOLD,
  textTransform: "uppercase",
};

/* ─────────────────────────── Layout pieces ─────────────────────────── */

function Header({ compact }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: compact ? "18px 20px 12px" : "30px 20px 16px",
        borderBottom: "1px solid rgba(201,168,76,0.3)",
        background: "rgba(0,0,0,0.45)",
      }}
    >
      {!compact && (
        <div style={{ fontSize: "10px", letterSpacing: "6px", color: GOLD, opacity: 0.75, marginBottom: 6, textTransform: "uppercase" }}>
          The Industrial Age
        </div>
      )}
      <h1
        style={{
          fontSize: compact ? "clamp(20px, 5vw, 32px)" : "clamp(24px, 6vw, 44px)",
          fontWeight: "normal",
          margin: "0 0 4px",
          letterSpacing: "3px",
          background: "linear-gradient(135deg, #f5e6c8, #c9a84c, #f5e6c8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        BRASS: BIRMINGHAM
      </h1>
      <div style={{ fontSize: "11px", letterSpacing: "4px", color: GOLD, opacity: 0.65, textTransform: "uppercase" }}>
        Scoring Sheet
      </div>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, maxWidth: 90, height: 1, background: "linear-gradient(to right, transparent, #c9a84c)" }} />
          <div style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)" }} />
          <div style={{ flex: 1, maxWidth: 90, height: 1, background: "linear-gradient(to left, transparent, #c9a84c)" }} />
        </div>
      )}
    </div>
  );
}

function Shell({ compactHeader, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0d0a06 0%, #1a1208 40%, #0d0a06 100%)",
        fontFamily: FONT,
        color: CREAM,
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(201,168,76,0.015) 40px, rgba(201,168,76,0.015) 41px),
            repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(201,168,76,0.015) 40px, rgba(201,168,76,0.015) 41px)
          `,
        }}
      />
      <div style={{ position: "relative" }}>
        <Header compact={compactHeader} />
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 60px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Setup screen ─────────────────────────── */

function ColorPicker({ value, takenBy, onPick }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {PLAYER_COLORS.map((c) => {
        const selected = c.id === value;
        const taken = takenBy[c.id] && !selected;
        return (
          <button
            key={c.id}
            type="button"
            aria-label={`${c.name}${taken ? " (taken)" : ""}`}
            aria-pressed={selected}
            disabled={taken}
            onClick={() => onPick(c.id)}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${c.accent}, ${c.bg})`,
              border: selected ? `3px solid ${CREAM}` : `2px solid ${c.accent}66`,
              boxShadow: selected ? `0 0 12px ${c.accent}` : "none",
              opacity: taken ? 0.18 : 1,
              cursor: taken ? "default" : "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

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
  const canStart = rows.length >= MIN_PLAYERS;

  const finish = () => {
    if (!canStart) return;
    onDone(rows.map((r, i) => ({ ...r, name: r.name.trim() || `Player ${i + 1}` })));
  };

  return (
    <Shell compactHeader={false}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <span style={sectionLabel}>{mode === "edit" ? "Edit Players" : "Who's Playing?"}</span>
        {historyCount > 0 && (
          <button type="button" onClick={onOpenHistory} style={ghostButton({ padding: "7px 12px" })}>
            📜 History
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((row, i) => {
          const c = colorOf(row.colorId);
          const isLast = i === rows.length - 1;
          return (
            <div
              key={row.id}
              style={{
                background: `linear-gradient(145deg, ${c.bg}f0, ${c.bg}bb)`,
                border: `1px solid ${c.accent}44`,
                borderLeft: `4px solid ${c.accent}`,
                borderRadius: 6,
                padding: "14px 14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: "11px", letterSpacing: "2px", color: `${c.accent}`, textTransform: "uppercase", flexShrink: 0 }}>
                  Player {i + 1}
                </span>
                <div style={{ flex: 1 }} />
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove player ${i + 1}`}
                    onClick={() => removePlayer(row.id)}
                    style={{ background: "none", border: "none", color: "#ff8a7a99", cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: "0 4px" }}
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                ref={isLast ? lastInputRef : null}
                value={row.name}
                placeholder="Enter name"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
                onChange={(e) => update(row.id, { name: e.target.value.slice(0, 24) })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.35)",
                  border: `1px solid ${c.accent}55`,
                  borderRadius: 4,
                  color: CREAM,
                  fontFamily: FONT,
                  fontSize: "18px",
                  padding: "10px 12px",
                  outline: "none",
                  marginBottom: 12,
                }}
              />
              <ColorPicker value={row.colorId} takenBy={takenBy} onPick={(colorId) => update(row.id, { colorId })} />
            </div>
          );
        })}
      </div>

      {rows.length < MAX_PLAYERS && (
        <button
          type="button"
          onClick={() => addPlayer()}
          style={ghostButton({
            width: "100%",
            marginTop: 12,
            padding: "14px",
            fontSize: "13px",
            border: "1px dashed rgba(201,168,76,0.45)",
          })}
        >
          + Add Player
        </button>
      )}

      {suggestions.length > 0 && rows.length <= MAX_PLAYERS && (
        <div style={{ marginTop: 18 }}>
          <div style={{ ...sectionLabel, fontSize: "10px", opacity: 0.8, marginBottom: 8 }}>Recent players</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.map((n) => (
              <button
                key={n}
                type="button"
                disabled={rows.length >= MAX_PLAYERS && !rows.some((r) => !r.name.trim())}
                onClick={() => applyRecentName(n)}
                style={ghostButton({ textTransform: "none", letterSpacing: "0.5px", fontSize: "14px", padding: "7px 14px", borderRadius: 20 })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button type="button" onClick={finish} disabled={!canStart} style={solidButton({ opacity: canStart ? 1 : 0.4, cursor: canStart ? "pointer" : "default" })}>
          {mode === "edit" ? "Back to Game" : "Start Game"}
        </button>
        {!canStart && (
          <div style={{ textAlign: "center", fontSize: "12px", color: `${CREAM}88`, marginTop: 10 }}>
            Add at least one more player to start.
          </div>
        )}
        {canCancel && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button type="button" onClick={onCancel} style={ghostButton({ border: "none", color: `${CREAM}77` })}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ─────────────────────────── Score inputs ─────────────────────────── */

function AddRow({ label, sublabel, entries, onAdd, onRemoveAt, color }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const rowTotal = sum(entries);

  const submit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    onAdd(n);
    setDraft("");
    inputRef.current?.focus(); // keep the number pad open for the next tile
  };

  return (
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${color.accent}18` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", color: CREAM }}>{label}</div>
          {sublabel && <div style={{ fontSize: "11px", color: `${CREAM}66`, marginTop: 2 }}>{sublabel}</div>}
        </div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: color.accent, whiteSpace: "nowrap" }}>
          {rowTotal}
          <span style={{ fontSize: "11px", fontWeight: "normal", marginLeft: 3, opacity: 0.7 }}>VP</span>
        </div>
      </div>

      {entries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {entries.map((n, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Remove ${n} from ${label}`}
              onClick={() => onRemoveAt(i)}
              style={{
                padding: "4px 8px",
                background: `${color.accent}1a`,
                border: `1px solid ${color.accent}44`,
                borderRadius: 12,
                color: color.accent,
                fontFamily: FONT,
                fontSize: "13px",
                cursor: "pointer",
                lineHeight: 1.2,
              }}
            >
              +{n}
              <span style={{ marginLeft: 5, opacity: 0.5, fontSize: "11px" }}>×</span>
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ display: "flex", gap: 8, marginTop: 10 }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="enter"
          autoComplete="off"
          aria-label={`Add to ${label}`}
          placeholder="Add VP"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
          style={{
            flex: 1,
            minWidth: 0,
            height: 44,
            textAlign: "center",
            background: "rgba(0,0,0,0.35)",
            border: `1px solid ${color.accent}55`,
            borderRadius: 4,
            fontSize: "20px",
            fontWeight: "bold",
            color: color.accent,
            fontFamily: FONT,
            outline: "none",
            padding: 0,
          }}
        />
        <button
          type="submit"
          disabled={!draft}
          // Stop the tap from closing the keyboard before the number is added.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            width: 76,
            height: 44,
            background: draft ? `${color.accent}33` : "transparent",
            border: `1px solid ${color.accent}${draft ? "88" : "33"}`,
            borderRadius: 4,
            color: draft ? color.accent : `${color.accent}55`,
            fontFamily: FONT,
            fontSize: "13px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            fontWeight: "bold",
            cursor: draft ? "pointer" : "default",
          }}
        >
          Add
        </button>
      </form>
    </div>
  );
}

function MerchantBonuses({ color, playerId, claimed, claimedBy, playersById, onToggle }) {
  const bonusVP = claimed.reduce((s, id) => s + (MERCHANT_BONUSES.find((b) => b.id === id)?.vp ?? 0), 0);
  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: "14px", color: CREAM }}>🎩 Merchant Beer Bonus</span>
        <span style={{ fontSize: "11px", color: `${CREAM}55` }}>tap to claim</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MERCHANT_BONUSES.map((b) => {
          const ownerId = claimedBy[b.id];
          const active = ownerId === playerId;
          const takenByOther = ownerId && !active;
          const owner = takenByOther ? playersById[ownerId] : null;
          return (
            <button
              key={b.id}
              type="button"
              disabled={takenByOther}
              onClick={() => onToggle(b.id)}
              style={{
                padding: "8px 14px",
                minHeight: 40,
                background: active ? `${color.accent}44` : "transparent",
                border: takenByOther ? `1px dashed ${CREAM}22` : `1px solid ${color.accent}${active ? "99" : "44"}`,
                borderRadius: 4,
                color: takenByOther ? `${CREAM}44` : active ? color.accent : `${CREAM}99`,
                fontFamily: FONT,
                fontSize: "14px",
                fontWeight: active ? "bold" : "normal",
                cursor: takenByOther ? "default" : "pointer",
                textDecoration: takenByOther ? "line-through" : "none",
              }}
            >
              {active ? "✓ " : ""}
              {b.label}
              {owner && <span style={{ fontSize: "11px", marginLeft: 6, textDecoration: "none", display: "inline-block" }}>· {owner.name}</span>}
            </button>
          );
        })}
      </div>
      {bonusVP > 0 && <div style={{ marginTop: 8, fontSize: "12px", color: `${color.accent}bb` }}>+{bonusVP} VP from merchant bonuses</div>}
    </div>
  );
}

function EraScoreCard({ player, era, color, claimedBy, playersById, onUpdateEra }) {
  const eraData = player[era];
  const update = (key, val) => onUpdateEra(era, { ...eraData, [key]: val });

  const toggleMerchant = (id) => {
    const already = eraData.merchantBonuses.includes(id);
    update("merchantBonuses", already ? eraData.merchantBonuses.filter((x) => x !== id) : [...eraData.merchantBonuses, id]);
  };

  return (
    <div style={{ background: `${color.accent}08`, border: `1px solid ${color.accent}22`, borderRadius: 5, overflow: "hidden" }}>
      <div
        style={{
          padding: "8px 14px",
          background: `${color.accent}14`,
          borderBottom: `1px solid ${color.accent}22`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: `${color.accent}cc` }}>{PHASE_LABELS[era]}</span>
        <span style={{ fontSize: "16px", fontWeight: "bold", color: color.accent }}>{eraVP(eraData)} VP</span>
      </div>
      <AddRow
        label={era === "canal" ? "⛓ Canal Links" : "⛓ Rail Links"}
        sublabel="Add each link's VP (connection symbols at both ends)"
        entries={eraData.links}
        onAdd={(n) => update("links", [...eraData.links, n])}
        onRemoveAt={(i) => update("links", eraData.links.filter((_, j) => j !== i))}
        color={color}
      />
      <AddRow
        label="🏭 Industry Tiles"
        sublabel="Add the VP shown on each flipped tile"
        entries={eraData.tiles}
        onAdd={(n) => update("tiles", [...eraData.tiles, n])}
        onRemoveAt={(i) => update("tiles", eraData.tiles.filter((_, j) => j !== i))}
        color={color}
      />
      <MerchantBonuses
        color={color}
        playerId={player.id}
        claimed={eraData.merchantBonuses}
        claimedBy={claimedBy}
        playersById={playersById}
        onToggle={toggleMerchant}
      />
    </div>
  );
}

/* ─────────────────────────── Game screen ─────────────────────────── */

function FinalBreakdown({ player, color }) {
  const total = totalVP(player);
  return (
    <div>
      {ERAS.map((era) => (
        <div
          key={era}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            marginBottom: 8,
            background: `${color.accent}0d`,
            border: `1px solid ${color.accent}22`,
            borderRadius: 4,
          }}
        >
          <span style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: `${CREAM}88` }}>{PHASE_LABELS[era]}</span>
          <span style={{ fontSize: "20px", fontWeight: "bold", color: color.accent }}>{eraVP(player[era])} VP</span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          marginTop: 4,
          background: `${color.accent}1a`,
          border: `1px solid ${color.accent}55`,
          borderRadius: 4,
        }}
      >
        <span style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: color.accent }}>Total</span>
        <span style={{ fontSize: "28px", fontWeight: "bold", color: color.accent, letterSpacing: "-1px" }}>{total} VP</span>
      </div>
    </div>
  );
}

function Standings({ players }) {
  const ranked = rankPlayers(players.map((p) => ({ ...p, total: totalVP(p) })));
  return (
    <div style={panel}>
      <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.06)" }}>
        <span style={{ ...sectionLabel, letterSpacing: "4px" }}>🏆 Standings</span>
      </div>
      {ranked.map((p) => {
        const color = colorOf(p.colorId);
        const first = p.rank === 0;
        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "11px 18px",
              gap: 12,
              borderBottom: "1px solid rgba(201,168,76,0.08)",
              background: first ? "rgba(201,168,76,0.07)" : "transparent",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: first ? "17px" : "13px",
                background: first ? "#c9a84c22" : "transparent",
                border: first ? "1px solid #c9a84c44" : "1px solid rgba(255,255,255,0.1)",
                color: first ? GOLD : `${CREAM}66`,
              }}
            >
              {first ? "👑" : p.rank + 1}
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: color.accent, boxShadow: `0 0 6px ${color.accent}88` }} />
            <span style={{ flex: 1, fontSize: "15px", color: CREAM, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
              {p.tied && <span style={{ fontSize: "10px", color: `${GOLD}aa`, marginLeft: 8, letterSpacing: 2 }}>TIED</span>}
            </span>
            <span style={{ fontSize: "22px", fontWeight: "bold", color: first ? GOLD : `${CREAM}bb`, letterSpacing: "-1px" }}>{p.total}</span>
            <span style={{ fontSize: "10px", color: `${CREAM}44` }}>VP</span>
          </div>
        );
      })}
    </div>
  );
}

function SavePanel({ saved, onSave, onRematch, onNewGame }) {
  return (
    <div style={{ ...panel, padding: 16, marginTop: 18, textAlign: "center" }}>
      {saved ? (
        <>
          <div style={{ fontSize: "15px", color: GOLD, marginBottom: 4 }}>✓ Saved to history</div>
          <div style={{ fontSize: "12px", color: `${CREAM}77`, marginBottom: 14 }}>Changed a score? Tap update to fix the saved copy.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" onClick={onSave} style={ghostButton()}>
              Update Saved Game
            </button>
            <button type="button" onClick={onRematch} style={ghostButton()}>
              🔁 Rematch
            </button>
            <button type="button" onClick={onNewGame} style={ghostButton()}>
              New Players
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "12px", color: `${CREAM}88`, marginBottom: 12 }}>Game over? Save it to keep the result and tally wins.</div>
          <button type="button" onClick={onSave} style={solidButton()}>
            🏁 Finish & Save Game
          </button>
        </>
      )}
    </div>
  );
}

function GameScreen({ game, setGame, commit, onUndo, canUndo, onEditPlayers, onNewGame, onOpenHistory, onSaveGame, historyCount }) {
  const { players, phase } = game;
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  const claimedByEra = useMemo(() => {
    const out = { canal: {}, rail: {} };
    for (const era of ERAS) {
      for (const p of players) {
        for (const id of p[era].merchantBonuses) out[era][id] = p.id;
      }
    }
    return out;
  }, [players]);

  const setPhase = (ph) => setGame((g) => ({ ...g, phase: ph }));

  const updateEra = (playerId, era, eraData) =>
    commit((g) => ({ ...g, players: g.players.map((p) => (p.id === playerId ? { ...p, [era]: eraData } : p)) }));

  const clearScores = () => {
    if (!window.confirm("Clear all scores for this game? Players stay the same.")) return;
    commit((g) => ({
      ...g,
      phase: "canal",
      savedHistoryId: null,
      players: g.players.map((p) => ({ ...p, canal: defaultEra(), rail: defaultEra() })),
    }));
  };

  const rematch = () =>
    commit((g) => ({
      ...g,
      phase: "canal",
      savedHistoryId: null,
      players: g.players.map((p) => ({ ...p, canal: defaultEra(), rail: defaultEra() })),
    }));

  return (
    <Shell compactHeader>
      {/* Top actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={onEditPlayers} style={ghostButton({ flex: 1, padding: "9px 6px" })}>
          👥 Players
        </button>
        <button type="button" onClick={onOpenHistory} style={ghostButton({ flex: 1, padding: "9px 6px" })}>
          📜 History{historyCount ? ` (${historyCount})` : ""}
        </button>
        <button type="button" onClick={onNewGame} style={ghostButton({ flex: 1, padding: "9px 6px" })}>
          ✦ New Game
        </button>
      </div>

      {/* Phase tabs + undo, pinned while scrolling */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 18,
          position: "sticky",
          top: 0,
          zIndex: 5,
          padding: "6px 0",
          background: "rgba(13,10,6,0.92)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
      <div
        style={{
          flex: 1,
          display: "flex",
          minWidth: 0,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(201,168,76,0.3)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {["canal", "rail", "final"].map((ph) => (
          <button
            key={ph}
            type="button"
            onClick={() => setPhase(ph)}
            style={{
              flex: 1,
              padding: "13px 4px",
              background: phase === ph ? "linear-gradient(135deg, #c9a84c22, #c9a84c44)" : "rgba(13,10,6,0.85)",
              border: "none",
              borderRight: ph !== "final" ? "1px solid rgba(201,168,76,0.2)" : "none",
              borderBottom: phase === ph ? "2px solid #c9a84c" : "2px solid transparent",
              color: phase === ph ? GOLD : `${CREAM}88`,
              fontFamily: FONT,
              fontSize: "10px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {PHASE_LABELS[ph]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        style={ghostButton({
          padding: "0 10px",
          minWidth: 64,
          fontSize: "11px",
          letterSpacing: "1px",
          opacity: canUndo ? 1 : 0.35,
          cursor: canUndo ? "pointer" : "default",
        })}
      >
        ↶ Undo
      </button>
      </div>

      {/* Player cards: one per row on phones, two per row on wider screens */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {players.map((player) => {
          const color = colorOf(player.colorId);
          return (
            <div
              key={player.id}
              style={{
                background: `linear-gradient(145deg, ${color.bg}f0, ${color.bg}bb)`,
                border: `1px solid ${color.accent}44`,
                borderTop: `3px solid ${color.accent}`,
                borderRadius: 6,
                overflow: "hidden",
                boxShadow: `0 4px 28px ${color.accent}0d`,
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: `linear-gradient(135deg, ${color.accent}1a, transparent)`,
                  borderBottom: `1px solid ${color.accent}33`,
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: color.accent, flexShrink: 0, boxShadow: `0 0 8px ${color.accent}88` }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: "17px", letterSpacing: "0.5px", color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {player.name}
                </div>
                <div style={{ fontSize: "26px", fontWeight: "bold", color: color.accent, letterSpacing: "-1px" }}>{totalVP(player)}</div>
              </div>
              <div style={{ padding: 12 }}>
                {phase === "final" ? (
                  <FinalBreakdown player={player} color={color} />
                ) : (
                  <EraScoreCard
                    player={player}
                    era={phase}
                    color={color}
                    claimedBy={claimedByEra[phase]}
                    playersById={playersById}
                    onUpdateEra={(era, data) => updateEra(player.id, era, data)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Standings players={players} />

      {phase === "final" && (
        <SavePanel saved={Boolean(game.savedHistoryId)} onSave={onSaveGame} onRematch={rematch} onNewGame={onNewGame} />
      )}

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <button type="button" onClick={clearScores} style={ghostButton({ border: "1px solid rgba(201,168,76,0.2)", color: `${CREAM}66`, fontSize: "10px", letterSpacing: "3px", padding: "8px 24px" })}>
          Clear All Scores
        </button>
      </div>
    </Shell>
  );
}

/* ─────────────────────────── History screen ─────────────────────────── */

function HistoryScreen({ history, onBack, onDelete, onClear }) {
  const tally = useMemo(() => {
    const map = new Map();
    // history is newest-first, so the first spelling we meet is the most recent one
    for (const g of history) {
      const ranked = rankPlayers(g.players);
      for (const p of ranked) {
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

  return (
    <Shell compactHeader>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={ghostButton()}>
          ← Back
        </button>
        <span style={{ ...sectionLabel, flex: 1, textAlign: "right" }}>Game History</span>
      </div>

      {history.length === 0 ? (
        <div style={{ ...panel, padding: 24, textAlign: "center", color: `${CREAM}88`, fontSize: "14px" }}>
          No saved games yet. Finish a game and tap <span style={{ color: GOLD }}>Finish &amp; Save Game</span> on the Final Score tab.
        </div>
      ) : (
        <>
          {/* Win tally */}
          <div style={{ ...panel, marginBottom: 18 }}>
            <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.06)", display: "flex" }}>
              <span style={{ ...sectionLabel, flex: 1 }}>👑 Win Tally</span>
              <span style={{ fontSize: "10px", letterSpacing: "2px", color: `${CREAM}55`, textTransform: "uppercase" }}>Wins · Games · Best</span>
            </div>
            {tally.map((t) => {
              const c = colorOf(t.colorId);
              return (
                <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.accent, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "15px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <span style={{ fontSize: "20px", fontWeight: "bold", color: GOLD, minWidth: 26, textAlign: "right" }}>{t.wins}</span>
                  <span style={{ fontSize: "13px", color: `${CREAM}77`, minWidth: 26, textAlign: "right" }}>{t.games}</span>
                  <span style={{ fontSize: "13px", color: `${CREAM}77`, minWidth: 34, textAlign: "right" }}>{t.best}</span>
                </div>
              );
            })}
          </div>

          {/* Game list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((g) => {
              const ranked = rankPlayers(g.players);
              return (
                <div key={g.id} style={panel}>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "rgba(201,168,76,0.06)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
                    <span style={{ flex: 1, fontSize: "12px", letterSpacing: "1px", color: `${CREAM}aa` }}>{formatDate(g.date)}</span>
                    <button
                      type="button"
                      aria-label="Delete this game"
                      onClick={() => {
                        if (window.confirm("Delete this game from history?")) onDelete(g.id);
                      }}
                      style={{ background: "none", border: "none", color: "#ff8a7a88", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
                    >
                      ×
                    </button>
                  </div>
                  {ranked.map((p, i) => {
                    const c = colorOf(p.colorId);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px" }}>
                        <span style={{ width: 22, textAlign: "center", fontSize: p.rank === 0 ? "15px" : "12px", color: `${CREAM}66` }}>{p.rank === 0 ? "👑" : p.rank + 1}</span>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.accent, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: "14px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{ fontSize: "11px", color: `${CREAM}55` }}>
                          {p.canal} + {p.rail} =
                        </span>
                        <span style={{ fontSize: "17px", fontWeight: "bold", color: p.rank === 0 ? GOLD : `${CREAM}cc`, minWidth: 30, textAlign: "right" }}>{p.total}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete ALL saved games? This can't be undone.")) onClear();
              }}
              style={ghostButton({ border: "1px solid rgba(255,138,122,0.3)", color: "#ff8a7a99", fontSize: "10px", letterSpacing: "3px" })}
            >
              Clear History
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
  const [undoStack, setUndoStack] = useState([]); // snapshots of earlier scores, newest last

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
  const [history, setHistory] = usePersistentState(HISTORY_KEY, [], isValidHistory);
  const [screen, setScreen] = useState(() => (game.started && game.players.length >= MIN_PLAYERS ? "game" : "setup"));
  const [setupMode, setSetupMode] = useState("new");
  const [setupKey, setSetupKey] = useState(0); // remounts the setup form with fresh rows

  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [screen]);

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
    const prefill =
      game.players.length > 0 ? game.players.map(({ id, name, colorId }) => ({ id: setupMode === "edit" ? id : newId(), name, colorId })) : [];
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
      historyCount={history.length}
    />
  );
}
