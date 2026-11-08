import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` listens on all interfaces so the Surface can load the dev
// server from the Mac over Tailscale (hot reload on the real screen).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
