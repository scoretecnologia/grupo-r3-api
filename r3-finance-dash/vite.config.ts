import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import wasm from "vite-plugin-wasm";

export default defineConfig(() => ({
  plugins: [
    tanstackStart(),
    nitro({
      preset: "vercel",
      output: {
        dir: ".vercel/output",
        serverDir: ".vercel/output/functions/__server.func",
        publicDir: ".vercel/output/static",
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    wasm(),
  ],
  build: {
    target: "esnext",
  },
  server: {
    host: "::",
    port: 8080,
  },
}));
