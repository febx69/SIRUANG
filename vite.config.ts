import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSingleFile } from "vite-plugin-singlefile"; // Wajib buat GAS

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Tambahkan viteSingleFile() disini
  plugins: [react(), viteSingleFile()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    emptyOutDir: true,
  }
}));