// SCOFTI's I is always a capital I with bars top and bottom, never a plain stroke (Michael,
// 2026-10-12). Permanent Marker draws I as a single line, so this writes the text as usual and then
// adds the bars to every I, in the same color, using the canvas's current font, alignment and baseline.
export function writeWithBars(g: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  g.fillText(text, x, y);
  if (!text.includes("I")) return;
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(g.font)?.[1] ?? 32);
  const width = g.measureText(text).width;
  const align = g.textAlign;
  const left = align === "center" ? x - width / 2 : align === "right" || align === "end" ? x - width : x;
  const I = g.measureText("I");
  const top = y - I.actualBoundingBoxAscent;
  const bottom = y + I.actualBoundingBoxDescent;
  const bar = size * 0.085;
  const half = size * 0.17;
  for (let k = 0; k < text.length; k++) {
    if (text[k] !== "I") continue;
    const mid = left + g.measureText(text.slice(0, k)).width + I.width / 2;
    // the marker's I leans a little: shift the top bar right and the bottom one left
    const lean = (bottom - top) * 0.06;
    g.fillRect(mid - half + lean, top, half * 2, bar);
    g.fillRect(mid - half - lean, bottom - bar, half * 2, bar);
  }
}
