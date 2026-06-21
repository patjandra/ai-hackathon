import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so phones on the LAN (and tunnels) can reach it
    proxy: {
      // Same-origin API + websocket: forwarded to the backend in dev so the
      // browser only ever talks to the Vite origin (works over LAN / HTTPS tunnel).
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:3001", ws: true, changeOrigin: true },
    },
  },
  // Read the single root .env. Only VITE_-prefixed vars are exposed to the
  // client bundle; secrets like ANTHROPIC_API_KEY are NOT shipped to the browser.
  envDir: "..",
});
