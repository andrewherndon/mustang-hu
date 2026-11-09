import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./chess.css";
import { ChessApp } from "./ChessApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChessApp />
  </StrictMode>,
);
