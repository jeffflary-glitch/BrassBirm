import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BrassBirminghamScorer from "./BrassBirminghamScorer.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrassBirminghamScorer />
  </StrictMode>
);
