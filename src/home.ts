// The game lives at scofti.com/arcade/scofti500. Anyone landing on the raw vercel.app address is
// sent there in browser code (a server redirect would loop through scofti's proxy). Skipped in dev.
export function sendHome(): void {
  // the dev server and the phone app stay where they are
  if (import.meta.env.DEV || import.meta.env.MODE === "app") return;
  if (!location.hostname.endsWith(".vercel.app")) return;
  location.replace("https://scofti.com/arcade/scofti500" + location.search + location.hash);
}
