export function compactUsd(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const trim = (n: number) => String(parseFloat(n.toFixed(2)));
  if (abs >= 1_000_000_000) return `$${trim(v / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `$${trim(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${trim(v / 1_000)}K`;
  if (abs >= 1) return `$${trim(v)}`;
  if (abs === 0) return "$0";
  return `$${v.toPrecision(4)}`;
}

export function price(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "—";
  if (v >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(3)}`;
  if (v >= 0.01) return `$${v.toFixed(5)}`;
  return `$${v.toPrecision(4)}`;
}

export function pct(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function ageFrom(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

export function shortAddr(addr: string): string {
  if (!addr) return "—";
  return addr.length > 10 ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : addr;
}

export function mcapOf(pool: { marketCapUsd: number; fdvUsd: number }): number {
  return pool.marketCapUsd > 0 ? pool.marketCapUsd : pool.fdvUsd;
}

export function changeTextColor(v: number): string {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-muted-foreground";
}
