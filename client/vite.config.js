import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Prevent Vite from loading parent Next.js postcss.config.mjs
  css: {
    postcss: {
      plugins: [],
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/profile-images": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/payment-screenshots": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/payments": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
