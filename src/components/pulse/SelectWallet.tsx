import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, List, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shortAddress, useWallets } from "@/stores/wallets";

/**
 * Sigma puts this on the toolbar's `[list icon] N ⌄` control: the panel is titled
 * `Select Wallet` and lists one row per trading wallet — name, truncated address, balance —
 * with `+ Add Wallet` underneath.
 *
 * Ours was wired to open the trade panel, which was simply the wrong control for this chip.
 */
export function SelectWallet() {
  const { wallets, activeId, setActiveId, rename, canAddWallet } = useWallets();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Select Wallet"
        className={cn(
          "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          open && "text-foreground",
        )}
      >
        <List className="size-3.5" />
        <span className="text-foreground">{wallets.length}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 w-[330px] rounded-xl border border-border bg-popover p-3 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-semibold">Select Wallet</span>
            <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-foreground">
              <span className="size-3.5 rounded-full bg-[#0052ff]" />
              {activeId}
            </span>
          </div>

          <div className="space-y-1">
            {wallets.map((w) => {
              const isActive = w.id === activeId;
              return (
                <div
                  key={w.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                    isActive ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-[5px]",
                      isActive ? "bg-[#0052ff]" : "border border-border",
                    )}
                  >
                    {isActive && <Check className="size-3 text-white" />}
                  </span>

                  <button
                    onClick={() => {
                      setActiveId(w.id);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      {editing === w.id ? (
                        <input
                          autoFocus
                          value={draft}
                          aria-label={`Rename ${w.id}`}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => {
                            rename(w.id, draft);
                            setEditing(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              rename(w.id, draft);
                              setEditing(null);
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-20 rounded-sm border border-input bg-transparent px-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      ) : (
                        <span
                          className={cn("text-sm font-medium", isActive ? "text-brand" : "text-foreground")}
                        >
                          {w.id}
                        </span>
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        title={`Rename ${w.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(w.id);
                          setDraft(w.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditing(w.id);
                            setDraft(w.id);
                          }
                        }}
                        className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {shortAddress(w.address)}
                      <span
                        role="button"
                        tabIndex={0}
                        title="Copy address"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copy(w.address);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void copy(w.address);
                        }}
                        className="cursor-pointer transition-colors hover:text-foreground"
                      >
                        <Copy className="size-3" />
                      </span>
                    </span>
                  </button>

                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-medium tabular-nums">
                    <span className="size-3.5 rounded-full bg-[#0052ff]" />
                    {w.amount}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() =>
              toast.info(
                canAddWallet
                  ? "Add Wallet"
                  : "Creating a wallet needs Sigma's wallet service, which this demo does not hold",
              )
            }
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
          >
            <Plus className="size-4" />
            Add Wallet
          </button>
        </div>
      )}
    </div>
  );
}
