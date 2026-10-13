import { defineConfig } from "vite";

// The web build is mounted at scofti.com/arcade/scofti500, so every asset URL resolves under that path.
// The phone app build (`npm run build:app`, for Capacitor) is served from inside the app, so it uses
// relative paths and goes into dist-app/.
const BASES: Record<string, string> = { app: "./" };
const OUT: Record<string, string> = { app: "dist-app" };

export default defineConfig(({ mode }) => ({
  base: BASES[mode] ?? "/arcade/scofti500/",
  build: { outDir: OUT[mode] ?? "dist" },
  server: {
    port: 5250,
    strictPort: true,
    // the Android build writes copies of the game into android/; don't reload the page for those
    watch: { ignored: ["**/android/**", "**/dist-app/**"] },
  },
}));
