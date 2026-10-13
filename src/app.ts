import { App } from "@capacitor/app";

// Only in the phone app (Capacitor, `--mode app`), like Sloth Splash's. Two things a browser does for
// us that an app has to do itself:
//
// Leaving the app (home button, a call, another app): Android keeps the app running in the background,
// so without this the music and the engines would carry on. `away(true)` quiets them and pauses a race;
// `away(false)` brings the music back (a paused race waits for you to tap RESUME).
//
// The back button steps back a screen, pauses a race, and closes the app from the title. `back` does
// the stepping and says false when there's nowhere left to go.
export function setupApp(back: () => boolean, away: (gone: boolean) => void): void {
  void App.addListener("appStateChange", ({ isActive }) => away(!isActive));
  void App.addListener("backButton", () => {
    if (!back()) void App.exitApp();
  });
}

/** the title's ✕: in the app it closes the app */
export function exitApp(): void {
  void App.exitApp();
}
