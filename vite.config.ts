import { defineConfig } from "vite";

// The web build is mounted at scofti.com/arcade/scofti500, so every asset URL resolves under that path.
export default defineConfig({
  base: "/arcade/scofti500/",
  server: { port: 5250, strictPort: true },
});
