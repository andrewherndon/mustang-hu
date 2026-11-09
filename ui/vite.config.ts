import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` listens on all interfaces so the Surface can load the dev
// server from the Mac over Tailscale (hot reload on the real screen).
// Two pages: the shell (index.html) and the offline chess app (chess/), which
// opens in the app slot like the other apps.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        chess: resolve(__dirname, "chess/index.html"),
      },
    },
  },
});
