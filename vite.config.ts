import { defineConfig } from "vite";
import type { AtRule, Container, Plugin, Rule } from "postcss";

// The web build is mounted at scofti.com/arcade/scofti500, so every asset URL resolves under that path.
// The phone app build (`npm run build:app`, for Capacitor) is served from inside the app, so it uses
// relative paths and goes into dist-app/.
const BASES: Record<string, string> = { app: "./" };
const OUT: Record<string, string> = { app: "dist-app" };

// A phone held upright draws the game a quarter turn round (src/turn.ts): html.turned, the body sized
// sideways and named the "game" container. Media queries and vw/vh still read the upright screen, so
// every rule that sizes by the screen gets a turned copy reading the body instead:
//  - @media by width/height/orientation: the original only when not turned, plus an @container game copy
//  - vw/vh/vmin/vmax: a turned copy of the rule in cqw/cqh/cqmin/cqmax
//  - env(safe-area-inset-*): the turned copy reads html.turned's --sa-* (the notch is on a side now)
const SIZED = /width|height|aspect-ratio|orientation/;
const UNITS = /(\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw|vmin|vmax)\b/g;
const SAFE = /env\(\s*safe-area-inset-(top|right|bottom|left)\s*(,[^)]*)?\)/g;
const CQ: Record<string, string> = { vmin: "cqmin", vmax: "cqmax" };
const toTurned = (v: string) =>
  v.replace(UNITS, (_, n, u) => n + (CQ[u] ?? (u.endsWith("w") ? "cqw" : "cqh"))).replace(SAFE, "var(--sa-$1)");
const prefix = (sel: string, on: boolean) => {
  const s = sel.trim();
  const root = /^(html|:root)/.exec(s);
  if (root) return `html:where(${on ? ".turned" : ":not(.turned)"})${s.slice(root[0].length)}`;
  return `:where(html${on ? ".turned" : ":not(.turned)"}) ${s}`;
};
const inKeyframes = (n: Rule) => {
  for (let p: Container | undefined = n.parent as Container; p; p = p.parent as Container | undefined)
    if (p.type === "atrule" && /keyframes/.test((p as AtRule).name)) return true;
  return false;
};

function turnedCss(): Plugin {
  return {
    postcssPlugin: "scofti-turned",
    Once(root, { AtRule }) {
      const done = new Set<Rule>();
      root.walkAtRules("media", (m) => {
        if (!SIZED.test(m.params)) return;
        const q = m.params.replace(/\(\s*(pointer|hover)\s*:\s*[a-z]+\s*\)\s*and\s*|\s*and\s*\(\s*(pointer|hover)\s*:\s*[a-z]+\s*\)/g, "");
        const c = new AtRule({ name: "container", params: `game ${q}` });
        for (const n of m.nodes ?? []) c.append(n.clone());
        c.walkRules((r) => {
          if (inKeyframes(r)) return;
          r.selectors = r.selectors.map((s) => prefix(s, true));
          r.walkDecls((d) => void (d.value = toTurned(d.value)));
          done.add(r);
        });
        m.walkRules((r) => {
          if (inKeyframes(r)) return;
          r.selectors = r.selectors.map((s) => prefix(s, false));
          done.add(r);
        });
        m.after(c);
      });
      const todo: Rule[] = [];
      root.walkRules((r) => {
        if (!done.has(r) && !inKeyframes(r) && r.some((n) => n.type === "decl" && !n.prop.startsWith("--sa-") && (UNITS.test(n.value) || SAFE.test(n.value))))
          todo.push(r);
        UNITS.lastIndex = SAFE.lastIndex = 0;
      });
      for (const r of todo) {
        const t = r.clone({ selectors: r.selectors.map((s) => prefix(s, true)) });
        t.each((n) => {
          if (n.type !== "decl" || n.prop.startsWith("--sa-")) return void n.remove();
          const v = toTurned(n.value);
          if (v === n.value) n.remove();
          else n.value = v;
        });
        r.after(t);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: BASES[mode] ?? "/arcade/scofti500/",
  build: { outDir: OUT[mode] ?? "dist" },
  css: { postcss: { plugins: [turnedCss()] } },
  server: {
    port: 5250,
    strictPort: true,
    // the Android build writes copies of the game into android/; don't reload the page for those
    watch: { ignored: ["**/android/**", "**/dist-app/**"] },
  },
}));
