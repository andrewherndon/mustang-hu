import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` listens on all interfaces so the Surface can load the dev
// server from the Mac over Tailscale (hot reload on the real screen).
// Pages: the shell (index.html) and offline apps that open in the app slot
// like the other apps: chess (chess/) and five in a row (gomoku/).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        chess: resolve(__dirname, "chess/index.html"),
        gomoku: resolve(__dirname, "gomoku/index.html"),
      },
    },
  },
});
