import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      // ⭐ สำคัญมาก สำหรับ localhost
      devOptions: {
        enabled: true,
      },

      manifest: {
        name: "Finance System",
        short_name: "Finance",
        start_url: "/",
        display: "standalone",
        theme_color: "#0d9488",
        background_color: "#ffffff",
        // icons: [
        //   {
        //     src: "./public/Purple and Blue Modern Finance Logo.png",
        //     sizes: "192x192",
        //     type: "image/png",
        //   },
        //   {
        //     src: "./public/Purple and Blue Modern Finance Logo.png",
        //     sizes: "512x512",
        //     type: "image/png",
        //   },
        // ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  base: "/",

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
