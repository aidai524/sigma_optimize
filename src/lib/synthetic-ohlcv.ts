/**
 * Deterministic stand-in for a real OHLCV series.
 *
 * The free GeckoTerminal tier cannot serve one OHLCV request per row: 20 rows in a
 * burst get refused, and the refusals arrive as bare network errors (see the
 * scheduler notes in `lib/gt.ts`). Rather than leave most of the trend column
 * permanently empty, rows past `REAL_SPARKLINE_ROWS` draw a synthetic series.
 *
 * Two properties make it usable as a stand-in:
 *   * **deterministic** — seeded by the pool address, so a row keeps the same shape
 *     across re-renders and reloads instead of flickering;
 *   * **consistent with the table** — the net move is forced to match the row's real
 *     window change, so a row showing +8.9% cannot draw a falling line.
 *
 * This is presentation data. It is documented in the README, and
 * `VITE_SIMULATE_SPARKLINES=false` makes every row use the API instead.
 */
import type { OhlcvCandle } from "@/lib/types";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random walk whose first→last ratio equals `changePct`.
 *
 * The walk supplies the shape; a geometric correction `k^(i/(n-1))` is applied on
 * top so the endpoints land exactly on the real change without flattening the line.
 */
export function syntheticCandles(seed: string, changePct: number, count = 60): OhlcvCandle[] {
  const rand = mulberry32(hashSeed(seed));
  const wiggle = 0.012; // per-step volatility, tuned to look like a 1h series

  const walk: number[] = [100];
  for (let i = 1; i < count; i += 1) {
    walk.push(walk[i - 1] * (1 + (rand() - 0.5) * 2 * wiggle));
  }

  const target = 1 + Math.max(-0.95, changePct) / 100;
  const actual = walk[count - 1] / walk[0];
  const k = actual > 0 ? target / actual : 1;

  const now = Math.floor(Date.now() / 1000);
  return walk.map((value, i) => {
    const c = value * Math.pow(k, i / (count - 1));
    const spread = c * wiggle * (0.4 + rand());
    return {
      t: now - (count - 1 - i) * 60,
      // Only `c` is plotted today, but a complete candle keeps this
      // interchangeable with a real series.
      o: c - spread * 0.3,
      h: c + spread,
      l: c - spread,
      c,
      v: 1000 + rand() * 9000,
    };
  });
}
