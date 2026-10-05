import { CHAINS as REGISTRY, CHAIN_ORDER as ORDER, type ChainId } from "@/lib/chain-registry";
import { cn } from "@/lib/utils";

/**
 * Chain marks are drawn from the registry so this page, the account menu and the
 * balance summary all describe a chain the same way. Marks stay inline (colour +
 * glyph) rather than loading a logo: at 20px in a dense settings list a disc is
 * more legible than the real mark, and it keeps the list free of image requests.
 */
export type ChainKey = ChainId;

export const CHAINS = REGISTRY;
export const CHAIN_ORDER = ORDER;

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
