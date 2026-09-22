import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/SuggestionPOC/'
,
  // .env files live in frontend/ (not the workspace root where this config
  // lives), so Vite must be told to read them from there — otherwise
  // VITE_* vars (e.g. VITE_AZURE_TRANSLATOR_KEY) silently resolve to undefined.
  envDir: path.resolve(__dirname, "./frontend"),
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend"),
    },
  },
  
}));
