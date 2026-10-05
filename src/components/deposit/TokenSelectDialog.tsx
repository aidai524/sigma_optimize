import { useEffect, useMemo, useState } from "react"
import Big from "big.js"
import { Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { chainLogoUrl, chainName, sortBlockchains, tokenLogoUrl } from "@/lib/chains"
import { assetKey, type IntentsToken } from "@/lib/intents-tokens"
import { formatBalance } from "@/lib/quote-error"
import { cn } from "@/lib/utils"

const ALL = "all"

type TokenSelectDialogProps = {
  open: boolean
  onClose: () => void
  tokens: IntentsToken[]
  loading: boolean
  selectedAssetId: string | null
  balanceByAssetId?: Record<string, string | null>
  onSelect: (token: IntentsToken) => void
}

function Mark(props: { src: string; label: string; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !props.src) {
    return (
      <span className={cn(props.className, "grid place-items-center bg-secondary text-[10px] font-medium text-foreground")}>
        {props.label.slice(0, 1)}
      </span>
    )
  }
  return <img src={props.src} alt="" className={props.className} onError={() => setFailed(true)} />
}

function compareBalance(left: string | null | undefined, right: string | null | undefined): number {
  const l = knownBalance(left)
  const r = knownBalance(right)
  if (l && r) {
    if (l.eq(0) && !r.eq(0)) return 1
    if (r.eq(0) && !l.eq(0)) return -1
    return r.cmp(l)
  }
  if (l && !r) return -1
  if (!l && r) return 1
  return 0
}

function knownBalance(value: string | null | undefined): Big | null {
  if (value == null || !value.trim()) return null
  try {
    const amount = new Big(value)
    return amount.gt(0) ? amount : new Big(0)
  } catch {
    return null
  }
}

export function TokenSelectDialog(props: TokenSelectDialogProps) {
  const { open, onClose, tokens, loading, selectedAssetId, balanceByAssetId, onSelect } = props
  const [search, setSearch] = useState("")
  const [chain, setChain] = useState(ALL)

  useEffect(() => {
    if (!open) return
    setSearch("")
    setChain(ALL)
  }, [open])

  const chains = useMemo(
    () => sortBlockchains([...new Set(tokens.map((token) => token.blockchain))]),
    [tokens],
  )
  const query = search.trim().toLowerCase()
  const visible = useMemo(() => {
    const filtered = tokens.filter((token) => {
      if (chain !== ALL && token.blockchain !== chain) return false
      if (!query) return true
      return token.symbol.toLowerCase().includes(query)
        || token.blockchain.includes(query)
        || (token.contractAddress?.toLowerCase().includes(query) ?? false)
    })
    if (!balanceByAssetId) return filtered
    const order = new Map(chains.map((code, index) => [code, index]))
    return [...filtered].sort((a, b) => {
      const balanceCmp = compareBalance(balanceByAssetId[a.assetId], balanceByAssetId[b.assetId])
      if (balanceCmp !== 0) return balanceCmp
      const chainCmp = (order.get(a.blockchain) ?? 1000) - (order.get(b.blockchain) ?? 1000)
      if (chainCmp !== 0) return chainCmp
      return a.symbol.localeCompare(b.symbol)
    })
  }, [tokens, chain, query, balanceByAssetId, chains])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="gap-0 overflow-hidden bg-[#0e1220] p-4 text-[#fafafa] sm:max-w-[474px]">
        <DialogHeader className="mb-3 flex-row items-center gap-3 pr-8">
          <DialogTitle className="text-base font-medium text-[#fafafa]">Select token</DialogTitle>
          <label className="relative ml-auto hidden w-[240px] md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#6c6e7a]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search symbol or address"
              className="h-9 w-full rounded-full border border-[#1b1f2d] bg-[#161a2b] pr-8 pl-9 text-sm text-[#fafafa] outline-none placeholder:text-[#6c6e7a]"
            />
            {search ? (
              <button type="button" aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-[#6c6e7a]" onClick={() => setSearch("")}>
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
        </DialogHeader>
        <label className="relative mb-3 block md:hidden">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#6c6e7a]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search symbol or address"
            className="h-9 w-full rounded-full border border-[#1b1f2d] bg-[#161a2b] pr-3 pl-9 text-sm text-[#fafafa] outline-none placeholder:text-[#6c6e7a]"
          />
        </label>
        <div className="flex h-[min(520px,62vh)] min-h-0">
          <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-[#1b1f2d] pr-3">
            <button
              type="button"
              onClick={() => setChain(ALL)}
              className={cn(
                "grid size-[50px] place-items-center rounded-[12px] text-xs font-medium shrink-0 cursor-pointer",
                chain === ALL ? "border border-[#6274ff] bg-[rgba(98,116,255,0.12)] text-[#fafafa]" : "text-[#fafafa] hover:bg-white/5",
              )}
            >
              All
            </button>
            {chains.map((code) => (
              <button
                key={code}
                type="button"
                aria-label={chainName(code)}
                onClick={() => setChain(code)}
                className={cn(
                  "grid size-[50px] place-items-center rounded-[12px] shrink-0 cursor-pointer",
                  chain === code ? "border border-[#6274ff] bg-[rgba(98,116,255,0.12)]" : "hover:bg-white/5",
                )}
              >
                <Mark src={chainLogoUrl(code)} label={code} className="size-8 rounded-full object-cover" />
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pl-3">
            {loading && visible.length === 0 ? (
              <p className="px-2 py-6 text-sm text-[#9a9aab]">Loading tokens…</p>
            ) : null}
            {!loading && visible.length === 0 ? (
              <p className="px-2 py-6 text-sm text-[#9a9aab]">No tokens found</p>
            ) : null}
            {visible.map((token) => {
              const selected = token.assetId === selectedAssetId
              return (
                <button
                  key={token.assetId}
                  type="button"
                  onClick={() => {
                    onSelect(token)
                    onClose()
                  }}
                  className={cn(
                    "cursor-pointer flex w-full items-center gap-2.5 rounded-[12px] px-2 py-3 text-left hover:bg-[#161a2b] md:px-3.5",
                    selected && "bg-[#161a2b]",
                  )}
                >
                  <span className="relative size-8 shrink-0">
                    <Mark src={tokenLogoUrl(token.symbol)} label={token.symbol} className="size-8 rounded-full object-cover" />
                    <Mark
                      src={chainLogoUrl(token.blockchain)}
                      label={token.blockchain}
                      className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-[4px] border border-[#0e1220] object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#fafafa]">{token.symbol}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#9a9aab]">{chainName(token.blockchain)}</span>
                  </span>
                  {balanceByAssetId ? (
                    <span className="shrink-0 text-sm text-[#fafafa]">
                      {balanceByAssetId[token.assetId] == null ? "—" : formatBalance(balanceByAssetId[token.assetId] || "0")}
                    </span>
                  ) : null}
                  <span className="sr-only">{assetKey(token)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
