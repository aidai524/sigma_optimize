import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fetchSparkline, type WindowKey } from "@/lib/gt";
import { REAL_SPARKLINE_ROWS, SIMULATE_SPARKLINES } from "@/lib/env";
import { syntheticCandles } from "@/lib/synthetic-ohlcv";
import type { OhlcvCandle } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  network: string;
  poolAddress: string;
  window: WindowKey;
  /** Row index — the cut-off between real and synthetic series is by row. */
  index: number;
  /** The row's real window change, so a synthetic line agrees with the table. */
  change: number;
  width?: number;
  height?: number;
};

/**
 * Trend cell.
 *
 * The free GeckoTerminal tier refuses a burst of one OHLCV request per row, so by
 * default the first `REAL_SPARKLINE_ROWS` rows fetch real candles and the rest draw
 * a deterministic synthetic series (see `lib/synthetic-ohlcv.ts`). With
 * `VITE_SIMULATE_SPARKLINES=false` every row uses the API.
 *
 * Real rows fetch lazily — only once actually visible — and are paced by the
 * request scheduler in `lib/gt.ts`, which keeps the queue under the API's rate and
 * backs off when pushed. A real row that keeps failing shows "n/a" rather than a
 * skeleton forever.
 */
export function Sparkline({
  network,
  poolAddress,
  window,
  index,
  change,
  width = 120,
  height = 36,
}: Props) {
  const simulate = SIMULATE_SPARKLINES && index >= REAL_SPARKLINE_ROWS;

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [candles, setCandles] = useState<OhlcvCandle[] | null>(null);
  const [failed, setFailed] = useState(false);

  const synthetic = useMemo(
    () => (simulate ? syntheticCandles(poolAddress, change, 60) : null),
    [simulate, poolAddress, change],
  );

  useEffect(() => {
    if (simulate) return;
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      // No margin: queueing a request per off-screen row is what pushed the API
      // over its burst limit. Rows load as they scroll in.
      { rootMargin: "0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, simulate]);

  useEffect(() => {
    if (!visible || simulate) return;
    let alive = true;
    let timer: number | undefined;
    setCandles(null);
    setFailed(false);

    const attempt = (n: number) => {
      fetchSparkline(network, poolAddress, window)
        .then((c) => {
          if (alive) setCandles(c);
        })
        .catch(() => {
          if (!alive) return;
          // Retry a couple of times — the scheduler is already pacing requests, so
          // a failure here means the API pushed back and the queue is cooling
          // down. After that show "n/a" instead of an endless skeleton.
          const delays = [3_000, 8_000, 20_000];
          if (n < delays.length) {
            timer = globalThis.setTimeout(() => attempt(n + 1), delays[n]);
          } else {
            setFailed(true);
          }
        });
    };
    attempt(0);

    return () => {
      alive = false;
      if (timer) globalThis.clearTimeout(timer);
    };
  }, [visible, simulate, network, poolAddress, window]);

  const series = synthetic ?? candles;
  const closes = series?.map((c) => c.c) ?? [];
  const up = closes.length > 1 ? closes[closes.length - 1] >= closes[0] : true;
  const stroke = up ? "#33ffb8" : "#ff3d7b";
  const gid = useId();

  return (
    <div ref={ref} className="flex items-center justify-center" style={{ width, height }}>
      {!series && !failed && <Skeleton className="h-full w-full rounded-sm bg-muted/60 opacity-70" />}
      {failed && <span className="text-[10px] text-muted-foreground">n/a</span>}
      {series && closes.length > 1 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{ filter: `drop-shadow(0 0 5px ${stroke}40)` }}
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={toArea(closes, width, height)} fill={`url(#${gid})`} />
          <polyline
            points={toPoints(closes, width, height)}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
      {series && closes.length <= 1 && (
        <span className="text-[10px] text-muted-foreground">flat</span>
      )}
    </div>
  );
}

function toArea(values: number[], width: number, height: number): string {
  const pad = 3;
  return `${toPoints(values, width, height)} ${width - pad},${height} ${pad},${height}`;
}

function toPoints(values: number[], width: number, height: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * step;
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
