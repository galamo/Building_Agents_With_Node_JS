import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      "/api": { target: "http://localhost:3003", changeOrigin: true },
      "/uploads": { target: "http://localhost:3003", changeOrigin: true },
      "/health": { target: "http://localhost:3003", changeOrigin: true },
    },
  },
});
