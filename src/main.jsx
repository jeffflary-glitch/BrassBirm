import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled with the app so it looks right even offline.
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import BrassBirminghamScorer from "./BrassBirminghamScorer.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrassBirminghamScorer />
  </StrictMode>
);
