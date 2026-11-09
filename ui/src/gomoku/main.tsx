import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "../chess/chess.css";        // shared look with the chess app (buttons, panel)
import "./gomoku.css";
import { GomokuApp } from "./GomokuApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GomokuApp />
  </StrictMode>,
);
