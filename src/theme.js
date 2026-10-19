// Colors, fonts and era themes shared across the app.

export const SOOT = "#1b140e"; // foundry background
export const SOOT_DEEP = "#110c08";
export const BRASS = "#c9a24a";
export const BRASS_LIGHT = "#ecd08a";
export const BRASS_DARK = "#7a5a1c";
export const PARCHMENT = "#ead9b4";
export const INK = "#2b1d10"; // writing on parchment and brass
export const CREAM = "#f3e6c8"; // writing on dark backgrounds

export const DISPLAY = "'Playfair Display', Georgia, serif";
export const BODY = "'EB Garamond', Georgia, serif";

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// Each era tints the background and its tab, with a faint pattern behind everything.
export const ERA_THEME = {
  canal: {
    label: "Canal era",
    accent: "#6fb8a8", // verdigris
    ink: "#1d5b51",
    glow: "rgba(70, 150, 135, 0.28)",
    band: "linear-gradient(90deg, #1d5b51, #2f7a6d)",
    pattern: svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='28'><path d='M0 14c10 0 10-8 20-8s10 8 20 8 10-8 20-8 10 8 20 8' fill='none' stroke='#6fb8a8' stroke-opacity='0.07' stroke-width='1.5'/></svg>`
    ),
  },
  rail: {
    label: "Rail era",
    accent: "#df7556", // red-lead primer
    ink: "#80301d",
    glow: "rgba(170, 70, 45, 0.26)",
    band: "linear-gradient(90deg, #6e2a1a, #3f4348)",
    pattern: svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='36'><g stroke='#8f6a52' stroke-opacity='0.11' stroke-width='5'><path d='M44 9h52M44 27h52'/></g><g stroke='#b9bfc6' stroke-opacity='0.09' stroke-width='2'><path d='M54 0v36M86 0v36'/></g></svg>`
    ),
  },
  final: {
    label: "Final score",
    accent: BRASS_LIGHT,
    ink: "#6b4d14",
    glow: "rgba(201, 162, 74, 0.26)",
    band: "linear-gradient(90deg, #7a5a1c, #a9822f)",
    pattern: svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><circle cx='24' cy='24' r='1.6' fill='#c9a24a' fill-opacity='0.08'/></svg>`
    ),
  },
};

// The four player colors from the game: red, yellow, purple and white.
// seal  = wax token fill        sealText = initial on the token
// accent = color on dark areas  ink      = color written on parchment
export const PLAYER_COLORS = [
  { id: "red",    name: "Red",    seal: "#a8321f", sealText: "#f6dcd2", accent: "#e0644d", ink: "#8e2a1a" },
  { id: "yellow", name: "Yellow", seal: "#d4ab2f", sealText: "#3a2a05", accent: "#e8c547", ink: "#76590a" },
  { id: "purple", name: "Purple", seal: "#6b3f97", sealText: "#ece0f7", accent: "#a77ad9", ink: "#57317d" },
  { id: "white",  name: "White",  seal: "#e6dfd0", sealText: "#4a443a", accent: "#ece6d8", ink: "#5d574b" },
];

export const colorOf = (colorId) => PLAYER_COLORS.find((c) => c.id === colorId) ?? PLAYER_COLORS[0];

// Riveted brass plate background (rivets in the corners, polished gradient underneath).
const rivet = (x, y) =>
  `radial-gradient(circle at ${x} ${y}, #fbecbd 0, #e3c57a 1.4px, #6d5018 2.6px, transparent 3.4px)`;

export const brassPlate = (inset = "11px") => ({
  background: [
    rivet(inset, inset),
    rivet(`calc(100% - ${inset})`, inset),
    rivet(inset, `calc(100% - ${inset})`),
    rivet(`calc(100% - ${inset})`, `calc(100% - ${inset})`),
    "linear-gradient(178deg, #f1d891 0%, #d2ad55 30%, #b38b36 58%, #c9a24a 78%, #e2c271 100%)",
  ].join(","),
  boxShadow: "inset 0 1px 0 rgba(255,246,214,0.75), inset 0 -2px 0 rgba(90,62,16,0.55), 0 3px 10px rgba(0,0,0,0.55)",
  color: INK,
});

// Engraved lettering on brass.
export const engraved = {
  color: "#3a2810",
  textShadow: "0 1px 0 rgba(255,241,198,0.6)",
};

// Ledger paper with darkened, stained edges.
export const parchment = {
  background: [
    "radial-gradient(ellipse at 20% 15%, rgba(255,250,232,0.55), transparent 55%)",
    "radial-gradient(ellipse at 85% 90%, rgba(150,105,45,0.18), transparent 50%)",
    `linear-gradient(180deg, #efe0bd, ${PARCHMENT} 45%, #e0c99b)`,
  ].join(","),
  boxShadow: "inset 0 0 22px rgba(120,80,30,0.32)",
  color: INK,
};
