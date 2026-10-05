import { BadgeCheck, Search, Send, SquarePen, Star, Users, X } from "lucide-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/pulse/Sparkline";
import { TokenInfoCell } from "@/components/pulse/TokenInfoCell";
import { QuickBuyButton } from "@/components/pulse/QuickBuyButton";
import type { TrendingPool } from "@/lib/types";
import type { WindowKey } from "@/lib/gt";
import { ageFrom, compactUsd, mcapOf, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Density = "comfortable" | "compact";

type Props = {
  pools: TrendingPool[];
  loading: boolean;
  window: WindowKey;
  density: Density;
};

const CHAIN_BADGE: Record<string, string> = {
  solana: "linear-gradient(135deg,#9945ff,#14f195)",
  base: "#0052ff",
  eth: "#6274ff",
  bsc: "#f0b90b",
};

function RankMark({ rank }: { rank: number }) {
  // Fixed-width slot so medals (1-3) and #N labels (4+) share one column and
  // every token icon starts at the same x position.
  if (rank > 3) {
    return (
      <span className="flex h-7 w-9 shrink-0 items-center justify-center text-xs font-normal text-muted-foreground">
        #{rank}
      </span>
    );
  }
  const palette = [
    ["#ffd75e", "#c98f1b"],
    ["#e3e9f4", "#8f99ad"],
    ["#f0a35e", "#a35f27"],
  ][rank - 1];
  const gid = `rank-${rank}`;
  return (
    <svg viewBox="0 0 40 30" className="h-7 w-9 shrink-0" aria-label={`#${rank}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      {/* wings */}
      <path d="M18 8 L5 2 L9 10 L2 9 L9 16 L18 14 Z" fill={`url(#${gid})`} opacity="0.9" />
      <path d="M22 8 L35 2 L31 10 L38 9 L31 16 L22 14 Z" fill={`url(#${gid})`} opacity="0.9" />
      {/* medal */}
      <circle cx="20" cy="16" r="9" fill={`url(#${gid})`} stroke={palette[1]} strokeWidth="1" />
      <text
        x="20"
        y="20.5"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="rgba(0,0,0,0.55)"
        fontFamily="inherit"
      >
        S
      </text>
    </svg>
  );
}

function TokenAvatar({ pool, compact }: { pool: TrendingPool; compact: boolean }) {
  const [failed, setFailed] = useState(false);
  const cls = cn(
    "rounded-lg border border-white/10 object-cover",
    compact ? "size-9" : "size-11",
  );
  if (pool.imageUrl && !failed) {
    return (
      <img
        src={pool.imageUrl}
        alt={pool.symbol}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cls}
      />
    );
  }
  return (
    <div
      className={cn(
        cls,
        "grid place-items-center bg-gradient-to-br from-white/15 to-white/[0.03] font-bold uppercase text-foreground",
        compact ? "text-xs" : "text-sm",
      )}
    >
      {pool.symbol.slice(0, 2)}
    </div>
  );
}

const sortArrows = (
  <span className="inline-flex flex-col leading-none">
    <span className="text-[7px]">▲</span>
    <span className="text-[7px]">▼</span>
  </span>
);

function HeadLabel({ children, arrows }: { children: React.ReactNode; arrows?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
      {children}
      {arrows && sortArrows}
    </span>
  );
}

export function PulseTable({ pools, loading, window: w, density }: Props) {
  const showSkeleton = loading && pools.length === 0;
  const compact = density === "compact";

  return (
    <div className="w-full">
      <Table className="text-sm">
        <TableHeader className="sticky top-0 z-30 bg-canvas">
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="h-9 px-2">
              <HeadLabel>Token</HeadLabel>
            </TableHead>
            <TableHead className="h-9 w-[150px] px-2">
              <HeadLabel>Trend</HeadLabel>
            </TableHead>
            <TableHead className="h-9 px-2">
              <HeadLabel arrows>Gain</HeadLabel>
            </TableHead>
            <TableHead className="h-9 px-2">
              <HeadLabel arrows>MCap</HeadLabel>
            </TableHead>
            <TableHead className="h-9 px-2">
              <HeadLabel arrows>Liquidity</HeadLabel>
            </TableHead>
            <TableHead className="h-9 px-2">
              <HeadLabel arrows>Volume</HeadLabel>
            </TableHead>
            <TableHead className="h-9 px-2">
              <HeadLabel arrows>Txns</HeadLabel>
            </TableHead>
            <TableHead className="h-9 px-2">
              <HeadLabel>Token Info</HeadLabel>
            </TableHead>
            <TableHead className="h-9 w-14 px-2" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {showSkeleton &&
            Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i} className="border-b border-border/60 hover:bg-transparent">
                <TableCell className={cn("px-2", compact ? "py-2" : "py-3")}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-9" />
                    <Skeleton className="size-11 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-2">
                  <Skeleton className="h-9 w-[120px] rounded-sm opacity-50" />
                </TableCell>
                <TableCell className="px-2">
                  <Skeleton className="h-5 w-14" />
                </TableCell>
                <TableCell className="px-2">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="px-2">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="px-2">
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                <TableCell className="px-2">
                  <Skeleton className="h-7 w-12" />
                </TableCell>
                <TableCell className="bg-[linear-gradient(90deg,transparent_0%,rgba(230,235,255,0.05)_100%)] px-2">
                  <Skeleton className="h-10 w-56" />
                </TableCell>
                <TableCell className="bg-[rgba(230,235,255,0.05)] px-2 shadow-[-20px_0_24px_-16px_rgba(0,0,0,0.6)]">
                  <Skeleton className="size-10 rounded-xl" />
                </TableCell>
              </TableRow>
            ))}

          {pools.map((pool, i) => {
            const change = pool.change[w];
            const txns = pool.txns[w];
            const top3 = i < 3;
            const positive = change > 0;
            return (
              <TableRow
                key={pool.id}
                className="group border-b border-border/60 transition-none hover:bg-white/[0.02]"
              >
                {/* token */}
                <TableCell className={cn("relative px-2", compact ? "py-1.5" : "py-2.5")}>
                  {top3 && (
                    <span
                      className="absolute left-0 top-0 h-full w-[3px]"
                      style={{
                        background: `linear-gradient(180deg, ${
                          ["#ffd75e", "#e3e9f4", "#f0a35e"][i]
                        }, transparent)`,
                      }}
                    />
                  )}
                  <div className="flex items-center gap-2.5">
                    <RankMark rank={i + 1} />
                    <div className="relative shrink-0">
                      <TokenAvatar pool={pool} compact={compact} />
                      <span
                        className="absolute -bottom-1 -left-1 size-4 rounded-full border-2 border-canvas"
                        style={{ background: CHAIN_BADGE[pool.network] ?? "#6274ff" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {pool.symbol}
                        </span>
                        <span className="max-w-28 truncate text-sm text-muted-foreground">
                          {pool.pairLabel.split("/")[1]?.trim() ?? pool.pairLabel}
                        </span>
                        <SquarePen className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <Star className="size-3.5 shrink-0 text-muted-foreground/70" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                        <span className="rounded-[4px] border-[0.5px] border-border px-1 text-[11px] leading-4">
                          {ageFrom(pool.createdAt)}
                        </span>
                        <X className="size-3" strokeWidth={3} />
                        <Send className="size-3" />
                        <Search className="size-3" />
                        <span className="flex items-center gap-0.5 text-[11px] text-mcap">
                          <Users className="size-3" />
                          {compactUsd(txns.buyers + txns.sellers).replace("$", "")}
                        </span>
                      </div>
                      {!compact && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-handle">
                          @{pool.symbol.toLowerCase()}
                          <BadgeCheck className="size-3.5 fill-buy-foreground text-canvas" />
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* trend */}
                <TableCell className="px-2">
                  <Sparkline network={pool.network} poolAddress={pool.poolAddress} window={w} />
                </TableCell>

                {/* gain */}
                <TableCell className="px-2">
                  <span
                    className={cn(
                      "rounded-[4px] px-1.5 py-0.5 text-xs font-medium tabular-nums",
                      positive ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground",
                    )}
                  >
                    {pct(change)}
                  </span>
                </TableCell>

                {/* metrics */}
                <TableCell className="px-2 text-sm font-medium tabular-nums text-mcap">
                  {compactUsd(mcapOf(pool))}
                </TableCell>
                <TableCell className="px-2 text-sm font-medium tabular-nums text-foreground">
                  {compactUsd(pool.liquidityUsd)}
                </TableCell>
                <TableCell className="px-2 text-sm font-medium tabular-nums text-buy-foreground">
                  {compactUsd(pool.volume[w])}
                </TableCell>

                {/* txns */}
                <TableCell className="px-2">
                  <div className="text-sm font-medium tabular-nums text-foreground">
                    {txns.buys + txns.sells}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium tabular-nums">
                    <span className="text-buy-foreground">{txns.buys}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sell-foreground">{txns.sells}</span>
                  </div>
                </TableCell>

                <TableCell className="bg-[linear-gradient(90deg,transparent_0%,rgba(230,235,255,0.05)_100%)] px-2">
                  <TokenInfoCell pool={pool} window={w} />
                </TableCell>

                <TableCell className="bg-[rgba(230,235,255,0.05)] px-2 shadow-[-20px_0_24px_-16px_rgba(0,0,0,0.6)]">
                  <QuickBuyButton pool={pool} />
                </TableCell>
              </TableRow>
            );
          })}

          {!showSkeleton && pools.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-20 text-center text-sm text-muted-foreground">
                No pools to show. Try another chain or refresh.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
