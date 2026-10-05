import { cn } from "@/lib/utils";

export type ChainKey = "eth" | "bsc" | "avax" | "base" | "sol" | "hood" | "stable" | "arc";

type ChainMeta = { label: string; color: string; glyph: string; ring: string };

/**
 * Chain marks are drawn inline rather than loaded from Sigma's CDN, so the build
 * has no external asset dependency. The label next to each mark carries the
 * meaning; the disc only has to be recognisable at 20px.
 */
export const CHAINS: Record<ChainKey, ChainMeta> = {
  eth: { label: "ETH", color: "#6274ff", glyph: "Ξ", ring: "#6274ff" },
  bsc: { label: "BSC", color: "#f0b90b", glyph: "◆", ring: "#f0b90b" },
  avax: { label: "AVAX", color: "#e84142", glyph: "▲", ring: "#e84142" },
  base: { label: "BASE", color: "#0052ff", glyph: "●", ring: "#0052ff" },
  sol: { label: "SOL", color: "#9945ff", glyph: "≡", ring: "#9945ff" },
  hood: { label: "HOOD", color: "#00c805", glyph: "H", ring: "#00c805" },
  stable: { label: "STABLE", color: "#5b6478", glyph: "$", ring: "#5b6478" },
  arc: { label: "ARC", color: "#0ea5e9", glyph: "◠", ring: "#0ea5e9" },
};

/** Display order mirrors Sigma's Settings → Quick Trades list. */
export const CHAIN_ORDER: ChainKey[] = ["eth", "bsc", "avax", "base", "sol", "hood", "stable", "arc"];

export function ChainMark({ chain, className }: { chain: ChainKey; className?: string }) {
  const meta = CHAINS[chain];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold leading-none text-white",
        className,
      )}
      style={{ backgroundColor: meta.color }}
    >
      {meta.glyph}
    </span>
  );
}
