import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import ssr from 'vite-plugin-ssr/plugin'
export default defineConfig({
  plugins: [react(), ssr()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ✅ ใช้ port ปกติสำหรับ dev
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
   base: '/',

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
