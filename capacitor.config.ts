import type { CapacitorConfig } from "@capacitor/cli";

// The phone app (Michael, 2026-10-13: "get this ready for money on the store"): the game's files
// packed inside the app itself, so it plays offline from the first launch and doesn't depend on
// scofti.com. Built with `npm run build:app` (Vite's `--mode app`, into dist-app/), then copied into
// the Android project with `npx cap sync android`. See docs/store/README.md.
const config: CapacitorConfig = {
  appId: "com.scofti.scofti500",
  appName: "SCOFTI 500",
  webDir: "dist-app",
  backgroundColor: "#0b0716",
};

export default config;
