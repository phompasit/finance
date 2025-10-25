import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://a93e81e5545a.ngrok-free.app",
        changeOrigin: true,
      },
    },
 allowedHosts: ["*"]
  },
});
