import { useEffect, useId, useRef, useState } from "react";
import { fetchSparkline, type WindowKey } from "@/lib/gt";
import type { OhlcvCandle } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  network: string;
  poolAddress: string;
  window: WindowKey;
  width?: number;
  height?: number;
};

/**
 * Real OHLCV sparkline. Data is fetched lazily — only once the row is visible —
 * and a skeleton is shown while it loads. This is the concrete fix for the
 * "Trend column renders as an empty grey box for seconds" issue.
 */
export function Sparkline({ network, poolAddress, window, width = 120, height = 36 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [candles, setCandles] = useState<OhlcvCandle[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
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
          // The free API rate-limits bursts; back off patiently.
          const delays = [5_000, 15_000, 30_000, 60_000];
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
  }, [visible, network, poolAddress, window]);

  const closes = candles?.map((c) => c.c) ?? [];
  const up = closes.length > 1 ? closes[closes.length - 1] >= closes[0] : true;
  const stroke = up ? "#33ffb8" : "#ff3d7b";
  const gid = useId();

  return (
    <div ref={ref} className="flex items-center justify-center" style={{ width, height }}>
      {!candles && !failed && <Skeleton className="h-full w-full rounded-sm bg-muted/60 opacity-70" />}
      {failed && <span className="text-[10px] text-muted-foreground">n/a</span>}
      {candles && closes.length > 1 && (
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
      {candles && closes.length <= 1 && (
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
