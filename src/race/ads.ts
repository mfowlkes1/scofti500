// Ads on the big video boards (Michael, 2026-10-12: "every now and then an ad to one of our own
// properties"): the other Scofti games, ScofTV and Michael's studio, the same spots as offroad's and
// winter games' billboards. He plans to sell the studio spot later, so the words, colors and pictures
// all live here. Art in public/img/promo/ (copied from winter games).
// The boards show the running order most of the time and cut to an ad for a few seconds now and then.

export const AD_EVERY = 35; // seconds of leaderboard between ads
export const AD_FOR = 8; // seconds each ad stays up

type Ad =
  | { kind: "game"; title: string; line: string; image: string; accent: string }
  | { kind: "scoftv"; tease: string; line: string; handle: string; faces: string[] }
  | { kind: "studio"; headline: string; site: string; colors: string[] };

export const ADS: Ad[] = [
  { kind: "game", title: "SCOFTI OFFROAD", line: "PLAY FREE · scofti.com/arcade", image: "offroad.jpg", accent: "#a6ff1f" },
  { kind: "scoftv", tease: "WANT MORE OF US?", line: "watch us on ScofTV", handle: "youtube.com/@scoftvhq", faces: ["sloth", "tela", "deekdeek"] },
  { kind: "game", title: "SCOFTI WINTER GAMES", line: "PLAY FREE · scofti.com/arcade", image: "winter-games.jpg", accent: "#8fe3ff" },
  // the studio's colors: teal, magenta, blue (its Apps / Sites / Games tiles)
  { kind: "studio", headline: "YOUR AD HERE", site: "iameasytouse.com", colors: ["#1fdcb4", "#c412e0", "#4f8bff"] },
  { kind: "game", title: "SLOTH SPLASH", line: "PLAY FREE · scofti.com/arcade", image: "sloth-splash.jpg", accent: "#ffd23f" },
  { kind: "game", title: "VOID SIGNAL", line: "PLAY FREE · scofti.com/arcade", image: "void-signal.jpg", accent: "#c08bff" },
];

const pics = new Map<string, HTMLImageElement>();
function pic(file: string): HTMLImageElement | null {
  let img = pics.get(file);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}img/promo/${file}`;
    pics.set(file, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
/** start loading every ad's art, so it's there when its turn comes */
export function warmAds(): void {
  for (const a of ADS) {
    if (a.kind === "game") pic(a.image);
    if (a.kind === "scoftv") for (const f of a.faces) pic(`${f}-face.webp`);
  }
}

function words(g: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, fill: string, max: number): void {
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const w = g.measureText(text).width;
  g.save();
  g.translate(x, y);
  if (w > max) g.scale(max / w, 1);
  g.lineWidth = 14;
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.strokeText(text, 0, 0);
  g.fillStyle = fill;
  g.fillText(text, 0, 0);
  g.restore();
}

/** draw ad number n (it wraps) on a board canvas; t (seconds into the ad) moves the picture slowly */
export function drawAd(g: CanvasRenderingContext2D, W: number, H: number, n: number, t: number): void {
  const ad = ADS[n % ADS.length];
  g.fillStyle = "#05060a";
  g.fillRect(0, 0, W, H);
  if (ad.kind === "game") {
    const img = pic(ad.image);
    if (img) {
      // fill the board, drifting in slowly
      const zoom = 1.04 + t * 0.012;
      const s = Math.max(W / img.width, H / img.height) * zoom;
      g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    }
    const shade = g.createLinearGradient(0, H * 0.45, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.9)");
    g.fillStyle = shade;
    g.fillRect(0, 0, W, H);
    words(g, ad.title, W / 2, H * 0.74, "italic 96px 'Lilita One'", "#fff", W - 60);
    words(g, ad.line, W / 2, H * 0.89, "52px 'Lilita One'", ad.accent, W - 80);
  } else if (ad.kind === "scoftv") {
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#150b2e");
    bg.addColorStop(0.6, "#2a0f4f");
    bg.addColorStop(1, "#0b1f55");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // the crew, in a row, bobbing
    const size = 210;
    ad.faces.forEach((f, i) => {
      const img = pic(`${f}-face.webp`);
      const x = W / 2 + (i - 1) * (size + 24);
      const y = 170 + Math.sin(t * 3 + i * 1.7) * 8;
      g.save();
      g.beginPath();
      g.arc(x, y, size / 2, 0, Math.PI * 2);
      g.fillStyle = "#ff3d9a";
      g.fill();
      g.clip();
      if (img) g.drawImage(img, x - size / 2 + 6, y - size / 2 + 6, size - 12, size - 12);
      g.restore();
    });
    words(g, ad.tease, W / 2, 360, "italic 100px 'Lilita One'", "#ff6fb5", W - 60);
    words(g, ad.line, W / 2, 470, "64px 'Lilita One'", "#fff", W - 80);
    words(g, ad.handle, W / 2, 560, "48px 'Lilita One'", "#ffd400", W - 80);
  } else {
    const bg = g.createLinearGradient(0, 0, W, H);
    ad.colors.forEach((c, i) => bg.addColorStop(i / (ad.colors.length - 1), c));
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // a light sweep across
    const sx = ((t / AD_FOR) * 1.6 - 0.3) * W;
    const sweep = g.createLinearGradient(sx - 140, 0, sx + 140, H);
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.5, "rgba(255,255,255,0.3)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sweep;
    g.fillRect(0, 0, W, H);
    const pulse = 1 + 0.03 * Math.sin(t * 3);
    g.save();
    g.translate(W / 2, H * 0.42);
    g.scale(pulse, pulse);
    words(g, ad.headline, 0, 0, "italic 150px 'Lilita One'", "#fff", W - 60);
    g.restore();
    words(g, ad.site, W / 2, H * 0.74, "72px 'Lilita One'", "#fff", W - 80);
  }
}
