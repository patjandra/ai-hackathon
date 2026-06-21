import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Read the single root .env. Only VITE_-prefixed vars are exposed to the
  // client bundle; secrets like ANTHROPIC_API_KEY are NOT shipped to the browser.
  envDir: "..",
});
