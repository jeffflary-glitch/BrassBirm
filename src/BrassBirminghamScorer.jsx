import { useState } from "react";

const PLAYER_COLORS = [
  { name: "Black", bg: "#1a1a1a", text: "#f5e6c8", accent: "#c9a84c" },
  { name: "Blue",  bg: "#1a2a4a", text: "#f5e6c8", accent: "#5b9bd5" },
  { name: "Red",   bg: "#4a1a1a", text: "#f5e6c8", accent: "#d94f3a" },
  { name: "Green", bg: "#1a3a2a", text: "#f5e6c8", accent: "#4aad6f" },
];

const MERCHANT_BONUSES = [
  { id: "m3a", label: "3 VP", vp: 3 },
  { id: "m3b", label: "3 VP", vp: 3 },
  { id: "m4",  label: "4 VP", vp: 4 },
];

const PHASE_LABELS = { canal: "Canal Era", rail: "Rail Era", final: "Final Score" };

const defaultEra = () => ({ links: 0, tiles: 0, merchantBonuses: [] });

const defaultPlayer = (name, colorIdx) => ({
  name,
  colorIdx,
  canal: defaultEra(),
  rail: defaultEra(),
});

function Stepper({ label, sublabel, value, onInc, onDec, color }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${color.accent}18` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", color: color.text }}>{label}</div>
          {sublabel && <div style={{ fontSize: "10px", color: `${color.text}55`, marginTop: 2 }}>{sublabel}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onDec} disabled={value <= 0} style={{
            width: 36, height: 36,
            background: value <= 0 ? "transparent" : `${color.accent}22`,
            border: `1px solid ${color.accent}${value <= 0 ? "22" : "55"}`,
            borderRadius: "4px 0 0 4px",
            color: value <= 0 ? `${color.text}22` : color.accent,
            fontSize: "20px", lineHeight: 1,
            cursor: value <= 0 ? "default" : "pointer",
            fontFamily: "inherit",
          }}>−</button>
          <div style={{
            width: 48, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `${color.accent}11`,
            border: `1px solid ${color.accent}33`,
            borderLeft: "none", borderRight: "none",
            fontSize: "20px", fontWeight: "bold", color: color.accent, letterSpacing: "-1px",
          }}>{value}</div>
          <button onClick={onInc} style={{
            width: 36, height: 36,
            background: `${color.accent}22`,
            border: `1px solid ${color.accent}55`,
            borderRadius: "0 4px 4px 0",
            color: color.accent,
            fontSize: "20px", lineHeight: 1, cursor: "pointer",
            fontFamily: "inherit",
          }}>+</button>
        </div>
      </div>
    </div>
  );
}

function MerchantBonuses({ color, claimed, onToggle }) {
  const bonusVP = claimed.reduce((s, id) => s + (MERCHANT_BONUSES.find(b => b.id === id)?.vp ?? 0), 0);
  return (
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${color.accent}18` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "13px", color: color.text }}>🎩 Merchant Beer Bonus</span>
        <span style={{ fontSize: "10px", color: `${color.text}55` }}>tap to claim</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MERCHANT_BONUSES.map((b) => {
          const active = claimed.includes(b.id);
          return (
            <button key={b.id} onClick={() => onToggle(b.id)} style={{
              padding: "7px 16px",
              background: active ? `${color.accent}44` : "transparent",
              border: `1px solid ${color.accent}${active ? "99" : "33"}`,
              borderRadius: 4,
              color: active ? color.accent : `${color.text}66`,
              fontFamily: "inherit", fontSize: "14px",
              fontWeight: active ? "bold" : "normal",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {active ? "✓ " : ""}{b.label}
            </button>
          );
        })}
      </div>
      {bonusVP > 0 && (
        <div style={{ marginTop: 8, fontSize: "11px", color: `${color.accent}99` }}>
          +{bonusVP} VP from merchant bonuses
        </div>
      )}
    </div>
  );
}

function EraScoreCard({ player, era, color, onUpdateEra }) {
  const eraData = player[era];

  const merchantVP = eraData.merchantBonuses.reduce(
    (s, id) => s + (MERCHANT_BONUSES.find(b => b.id === id)?.vp ?? 0), 0
  );

  const update = (key, val) => onUpdateEra(era, { ...eraData, [key]: val });

  const toggleMerchant = (id) => {
    const already = eraData.merchantBonuses.includes(id);
    update("merchantBonuses", already
      ? eraData.merchantBonuses.filter(x => x !== id)
      : [...eraData.merchantBonuses, id]
    );
  };

  const eraTotal = eraData.links + eraData.tiles + merchantVP;

  return (
    <div style={{
      background: `${color.accent}08`,
      border: `1px solid ${color.accent}22`,
      borderRadius: 5, overflow: "hidden", marginBottom: 0,
    }}>
      {/* Era sub-header */}
      <div style={{
        padding: "8px 16px",
        background: `${color.accent}14`,
        borderBottom: `1px solid ${color.accent}22`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: `${color.accent}cc` }}>
          {PHASE_LABELS[era]}
        </span>
        <span style={{ fontSize: "16px", fontWeight: "bold", color: color.accent }}>
          {eraTotal} VP
        </span>
      </div>

      <Stepper
        label="⛓ Canal/Rail Links"
        sublabel="1 VP per connection symbol on adjacent hexes"
        value={eraData.links}
        onInc={() => update("links", eraData.links + 1)}
        onDec={() => update("links", Math.max(0, eraData.links - 1))}
        color={color}
      />
      <Stepper
        label="🏭 Industry Tiles"
        sublabel="VP shown on each flipped tile"
        value={eraData.tiles}
        onInc={() => update("tiles", eraData.tiles + 1)}
        onDec={() => update("tiles", Math.max(0, eraData.tiles - 1))}
        color={color}
      />
      <MerchantBonuses
        color={color}
        claimed={eraData.merchantBonuses}
        onToggle={toggleMerchant}
      />
    </div>
  );
}

export default function BrassBirminghamScorer() {
  const [players, setPlayers] = useState([
    defaultPlayer("Player 1", 0),
    defaultPlayer("Player 2", 1),
  ]);
  const [gamePhase, setGamePhase] = useState("canal");

  const addPlayer = () => {
    if (players.length >= 4) return;
    setPlayers([...players, defaultPlayer(`Player ${players.length + 1}`, players.length)]);
  };

  const removePlayer = (i) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, idx) => idx !== i));
  };

  const updateName = (i, name) =>
    setPlayers(players.map((p, idx) => idx === i ? { ...p, name } : p));

  const updateEra = (pi, era, eraData) =>
    setPlayers(players.map((p, idx) => idx === pi ? { ...p, [era]: eraData } : p));

  const eraVP = (eraData) => {
    const merchantVP = eraData.merchantBonuses.reduce(
      (s, id) => s + (MERCHANT_BONUSES.find(b => b.id === id)?.vp ?? 0), 0
    );
    return eraData.links + eraData.tiles + merchantVP;
  };

  const total = (p) => eraVP(p.canal) + eraVP(p.rail);

  const ranked = [...players]
    .map((p, i) => ({ ...p, originalIdx: i, total: total(p) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d0a06 0%, #1a1208 40%, #0d0a06 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#f5e6c8",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(201,168,76,0.015) 40px, rgba(201,168,76,0.015) 41px),
          repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(201,168,76,0.015) 40px, rgba(201,168,76,0.015) 41px)
        `,
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", padding: "30px 20px 16px", borderBottom: "1px solid rgba(201,168,76,0.3)", background: "rgba(0,0,0,0.45)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "6px", color: "#c9a84c", opacity: 0.75, marginBottom: 6, textTransform: "uppercase" }}>The Industrial Age</div>
        <h1 style={{
          fontSize: "clamp(24px, 5vw, 44px)", fontWeight: "normal", margin: "0 0 4px", letterSpacing: "3px",
          background: "linear-gradient(135deg, #f5e6c8, #c9a84c, #f5e6c8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>BRASS: BIRMINGHAM</h1>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#c9a84c", opacity: 0.65, textTransform: "uppercase" }}>Scoring Sheet</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, maxWidth: 90, height: 1, background: "linear-gradient(to right, transparent, #c9a84c)" }} />
          <div style={{ width: 6, height: 6, background: "#c9a84c", transform: "rotate(45deg)" }} />
          <div style={{ flex: 1, maxWidth: 90, height: 1, background: "linear-gradient(to left, transparent, #c9a84c)" }} />
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 14px 60px" }}>

        {/* Phase tabs */}
        <div style={{
          display: "flex", background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(201,168,76,0.3)", borderRadius: 4,
          overflow: "hidden", marginBottom: 22,
        }}>
          {["canal", "rail", "final"].map((ph) => (
            <button key={ph} onClick={() => setGamePhase(ph)} style={{
              flex: 1, padding: "11px 8px",
              background: gamePhase === ph ? "linear-gradient(135deg, #c9a84c22, #c9a84c44)" : "transparent",
              border: "none", borderRight: "1px solid rgba(201,168,76,0.2)",
              borderBottom: gamePhase === ph ? "2px solid #c9a84c" : "2px solid transparent",
              color: gamePhase === ph ? "#c9a84c" : "#f5e6c877",
              fontFamily: "inherit", fontSize: "11px", letterSpacing: "2px",
              textTransform: "uppercase", cursor: "pointer",
            }}>{PHASE_LABELS[ph]}</button>
          ))}
        </div>

        {/* Player bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: "11px", letterSpacing: "3px", color: "#c9a84c", textTransform: "uppercase" }}>Players ({players.length}/4)</span>
          {players.length < 4 && (
            <button onClick={addPlayer} style={{
              background: "transparent", border: "1px solid rgba(201,168,76,0.5)",
              color: "#c9a84c", padding: "6px 16px", fontSize: "11px",
              letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer",
              fontFamily: "inherit", borderRadius: 2,
            }}>+ Add Player</button>
          )}
        </div>

        {/* Player cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(players.length, 2)}, 1fr)`,
          gap: 14, marginBottom: 26,
        }}>
          {players.map((player, pi) => {
            const color = PLAYER_COLORS[player.colorIdx];
            const playerTotal = total(player);
            const canalTotal = eraVP(player.canal);
            const railTotal = eraVP(player.rail);

            return (
              <div key={pi} style={{
                background: `linear-gradient(145deg, ${color.bg}f0, ${color.bg}bb)`,
                border: `1px solid ${color.accent}44`,
                borderTop: `3px solid ${color.accent}`,
                borderRadius: 6, overflow: "hidden",
                boxShadow: `0 4px 28px ${color.accent}0d`,
              }}>
                {/* Player name header */}
                <div style={{
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
                  background: `linear-gradient(135deg, ${color.accent}1a, transparent)`,
                  borderBottom: `1px solid ${color.accent}33`,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color.accent, flexShrink: 0, boxShadow: `0 0 8px ${color.accent}88` }} />
                  <input
                    value={player.name}
                    onChange={(e) => updateName(pi, e.target.value)}
                    style={{
                      background: "transparent", border: "none", color: color.text,
                      fontFamily: "inherit", fontSize: "15px", letterSpacing: "1px",
                      outline: "none", flex: 1, minWidth: 0,
                    }}
                  />
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: color.accent, letterSpacing: "-1px" }}>{playerTotal}</div>
                  {players.length > 2 && (
                    <button onClick={() => removePlayer(pi)} style={{ background: "none", border: "none", color: "#ff6b6b77", cursor: "pointer", fontSize: "18px", padding: "0 0 0 4px", lineHeight: 1 }}>×</button>
                  )}
                </div>

                {/* Active era scoring OR final summary */}
                <div style={{ padding: "14px" }}>
                  {gamePhase === "final" ? (
                    // Final: show both era totals and grand total
                    <div>
                      {[["canal", canalTotal], ["rail", railTotal]].map(([era, eraTot]) => (
                        <div key={era} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 14px", marginBottom: 8,
                          background: `${color.accent}0d`,
                          border: `1px solid ${color.accent}22`,
                          borderRadius: 4,
                        }}>
                          <span style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: `${color.text}88` }}>
                            {PHASE_LABELS[era]}
                          </span>
                          <span style={{ fontSize: "20px", fontWeight: "bold", color: color.accent }}>{eraTot} VP</span>
                        </div>
                      ))}
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 14px", marginTop: 4,
                        background: `${color.accent}1a`,
                        border: `1px solid ${color.accent}55`,
                        borderRadius: 4,
                      }}>
                        <span style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase", color: color.accent }}>Total</span>
                        <span style={{ fontSize: "28px", fontWeight: "bold", color: color.accent, letterSpacing: "-1px" }}>{playerTotal} VP</span>
                      </div>
                    </div>
                  ) : (
                    // Canal or Rail era: show that era's inputs
                    <EraScoreCard
                      player={player}
                      era={gamePhase}
                      color={color}
                      onUpdateEra={(era, data) => updateEra(pi, era, data)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        <div style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "13px 20px", borderBottom: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.06)" }}>
            <span style={{ fontSize: "11px", letterSpacing: "4px", color: "#c9a84c", textTransform: "uppercase" }}>🏆 Standings</span>
          </div>
          <div>
            {ranked.map((p, rank) => {
              const color = PLAYER_COLORS[p.colorIdx];
              const isTied = rank > 0 && ranked[rank - 1].total === p.total;
              return (
                <div key={p.originalIdx} style={{
                  display: "flex", alignItems: "center", padding: "11px 20px", gap: 14,
                  borderBottom: "1px solid rgba(201,168,76,0.08)",
                  background: rank === 0 ? "rgba(201,168,76,0.07)" : "transparent",
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: rank === 0 ? "17px" : "13px",
                    background: rank === 0 ? "#c9a84c22" : "transparent",
                    border: rank === 0 ? "1px solid #c9a84c44" : "1px solid rgba(255,255,255,0.1)",
                    color: rank === 0 ? "#c9a84c" : "#f5e6c866",
                  }}>{rank === 0 ? "👑" : rank + 1}</div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: color.accent, boxShadow: `0 0 6px ${color.accent}88` }} />
                  <span style={{ flex: 1, fontSize: "14px", color: "#f5e6c8" }}>
                    {p.name}
                    {isTied && <span style={{ fontSize: "10px", color: "#c9a84c88", marginLeft: 8, letterSpacing: 2 }}>TIED</span>}
                  </span>
                  <span style={{ fontSize: "22px", fontWeight: "bold", color: rank === 0 ? "#c9a84c" : "#f5e6c8bb", letterSpacing: "-1px" }}>{p.total}</span>
                  <span style={{ fontSize: "10px", color: "#f5e6c844" }}>VP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reset */}
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button
            onClick={() => setPlayers(players.map(p => ({ ...p, canal: defaultEra(), rail: defaultEra() })))}
            style={{
              background: "transparent", border: "1px solid rgba(201,168,76,0.2)",
              color: "#f5e6c855", padding: "8px 28px", fontSize: "10px",
              letterSpacing: "3px", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit", borderRadius: 2,
            }}
          >Clear All Scores</button>
        </div>
      </div>
    </div>
  );
}
