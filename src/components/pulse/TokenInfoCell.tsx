import { BadgeDollarSign, Copy, Ghost, Percent, Receipt, ShieldCheck, Users } from "lucide-react";
import type { TrendingPool } from "@/lib/types";
import { compactUsd, mcapOf } from "@/lib/format";
import type { WindowKey } from "@/lib/gt";
import { cn } from "@/lib/utils";

type Props = {
  pool: TrendingPool;
  window: WindowKey;
};

type Tone = "up" | "down" | "flat" | "gold";

const toneClass: Record<Tone, string> = {
  up: "border-[#33ffb8]/10 bg-[#33ffb8]/[0.11] text-[#33ffb8]",
  down: "border-[#ff3d7b]/10 bg-[#ff3d7b]/[0.11] text-[#ff3d7b]",
  flat: "border-white/5 bg-secondary text-muted-foreground",
  gold: "border-[#facc15]/10 bg-[#facc15]/[0.08] text-[#facc15]",
};

function Chip({ icon, children, tone = "up" }: { icon: React.ReactNode; children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "flex h-[19px] min-w-0 items-center justify-center gap-1 rounded-[4px] border-[0.5px] px-1 text-[10px] font-medium leading-none tabular-nums",
        toneClass[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const iconCls = "size-2.5 shrink-0";

/**
 * Sigma's Token Info column: eight compact icon badges. There is no grouped or
 * labelled variant — the long-form labels were removed from this build.
 */
export function TokenInfoCell({ pool, window: w }: Props) {
  const txns = pool.txns[w];
  const mcap = mcapOf(pool);
  const liqRatio = mcap > 0 ? (pool.liquidityUsd / mcap) * 100 : 0;
  const total = txns.buys + txns.sells;
  const buysPct = total > 0 ? (txns.buys / total) * 100 : 0;
  const sellsPct = total > 0 ? 100 - buysPct : 0;

  return (
    <div className="flex items-center gap-2.5">
      <ShieldCheck
        className={cn("size-5 shrink-0", liqRatio >= 3 ? "text-buy-foreground" : "text-amber-500")}
        strokeWidth={1.5}
      />
      <div className="grid w-[228px] grid-cols-4 gap-1">
        <Chip icon={<Users className={iconCls} />} tone={liqRatio < 3 ? "down" : "up"}>
          {liqRatio.toFixed(liqRatio < 10 ? 2 : 1)}%
        </Chip>
        <Chip icon={<Ghost className={iconCls} />} tone="up">
          0%
        </Chip>
        <Chip icon={<Copy className={iconCls} />} tone="up">
          {sellsPct.toFixed(sellsPct < 10 ? 2 : 0)}%
        </Chip>
        <Chip icon={<Users className={iconCls} />} tone="gold">
          {compactUsd(txns.buyers + txns.sellers).replace("$", "")}
        </Chip>
        <Chip icon={<Percent className={iconCls} />} tone="up">
          {buysPct.toFixed(buysPct < 10 ? 2 : 1)}%
        </Chip>
        <Chip icon={<Percent className={iconCls} />} tone="up">
          {Math.max(0, buysPct - sellsPct).toFixed(2)}%
        </Chip>
        <Chip icon={<BadgeDollarSign className={iconCls} />} tone="up">
          Paid
        </Chip>
        <Chip icon={<Receipt className={iconCls} />} tone="flat">
          No Tax
        </Chip>
      </div>
    </div>
  );
}
