import { useEffect, useState, useSyncExternalStore } from "react"
import { QRCodeSVG } from "qrcode.react"
import { ChevronDown, Copy } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TokenSelectDialog } from "@/components/deposit/TokenSelectDialog"
import { useDepositQuote } from "@/components/deposit/use-deposit-quote"
import { isAddressForChain } from "@/lib/address"
import {
  RECEIVE_CHAINS,
  chainKind,
  chainLogoUrl,
  chainName,
  receiveChain,
  tokenLogoUrl,
  type RefundKind,
} from "@/lib/chains"
import {
  assetKey,
  destinationNative,
  getIntentsTokensSnapshot,
  resolveSourceToken,
  subscribeIntentsTokens,
} from "@/lib/intents-tokens"
import { readNativeBalance } from "@/lib/native-balance"
import { formatBalance, formatUsd, oneUsdMinor } from "@/lib/quote-error"
import { useDepositBalance } from "@/stores/deposit-balance"
import { useDepositPrefs } from "@/stores/deposit-prefs"
import { cn } from "@/lib/utils"

const REFUND_KIND_LABEL: Record<RefundKind, string> = {
  evm: "EVM",
  solana: "Solana",
  near: "NEAR",
  tron: "Tron",
  zec: "Zcash",
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

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
  toast.success("Address copied")
}

export function DepositDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { open, onOpenChange } = props
  const prefs = useDepositPrefs()
  const balance = useDepositBalance()
  const tokenSnapshot = useSyncExternalStore(subscribeIntentsTokens, getIntentsTokensSnapshot, getIntentsTokensSnapshot)
  const tokens = tokenSnapshot.tokens
  const tokensLoading = tokenSnapshot.loading
  const tokensError = tokenSnapshot.error
  const [pickerOpen, setPickerOpen] = useState(false)

  const destination = receiveChain(prefs.destinationChain)
  const source = resolveSourceToken(tokens, prefs.sourceAssetKey)
  const native = destinationNative(tokens, destination.id, destination.symbol)
  const account = prefs.accountByChain[destination.id] ?? ""
  const refundKind = source ? chainKind(source.blockchain) : null
  const refund = refundKind && refundKind !== "other" ? prefs.refundByKind[refundKind] ?? "" : ""

  const blockedReason = (() => {
    if (tokensError) return tokensError
    if (tokensLoading || !source) return null
    if (!native) return "Native token is unavailable on this chain."
    if (!account.trim()) return "Enter a trading account address."
    if (!isAddressForChain(account, destination.id)) return "Enter a valid trading account address."
    if (!refund.trim()) return "Enter a refund address."
    if (!isAddressForChain(refund, source.blockchain)) return "Enter a valid refund address."
    if (oneUsdMinor(source.symbol, source.price, source.decimals) == null) return "This token has no price."
    return null
  })()

  const quoteState = useDepositQuote({
    open,
    quiet: tokensLoading || (!source && !tokensError),
    source,
    destination: native,
    recipient: account,
    refundTo: refund,
    blockedReason,
  })

  const accountValid = isAddressForChain(account, destination.id)
  useEffect(() => {
    if (!open) return
    const setBalance = useDepositBalance.getState().setBalance
    setBalance({
      chain: destination.id,
      address: account.trim() || null,
      symbol: destination.symbol,
      amount: null,
      usd: null,
      error: null,
      updatedAt: Date.now(),
    })
    if (!accountValid || !native) {
      setBalance({
        chain: destination.id,
        address: account.trim() || null,
        symbol: destination.symbol,
        amount: null,
        usd: null,
        error: account.trim() ? "Enter a valid trading account address." : null,
        updatedAt: Date.now(),
      })
      return
    }
    let stop = false
    const pull = () => {
      void readNativeBalance(destination.id, account.trim())
        .then((amount) => {
          if (stop) return
          setBalance({
            chain: destination.id,
            address: account.trim(),
            symbol: destination.symbol,
            amount,
            usd: formatUsd(amount, native.price),
            error: null,
            updatedAt: Date.now(),
          })
        })
        .catch(() => {
          if (stop) return
          setBalance({
            chain: destination.id,
            address: account.trim(),
            symbol: destination.symbol,
            amount: null,
            usd: null,
            error: "Could not load balance.",
            updatedAt: Date.now(),
          })
        })
    }
    pull()
    const timer = window.setInterval(pull, 10_000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [open, account, accountValid, destination.id, destination.symbol, native])

  useEffect(() => {
    if (!open || quoteState.status !== "SUCCESS" || !accountValid || !native) return
    let stop = false
    const setBalance = useDepositBalance.getState().setBalance
    void readNativeBalance(destination.id, account.trim())
      .then((amount) => {
        if (stop) return
        setBalance({
          chain: destination.id,
          address: account.trim(),
          symbol: destination.symbol,
          amount,
          usd: formatUsd(amount, native.price),
          error: null,
          updatedAt: Date.now(),
        })
      })
      .catch(() => undefined)
    return () => {
      stop = true
    }
  }, [open, quoteState.status, account, accountValid, destination.id, destination.symbol, native])

  const formLocked = quoteState.quoting || (quoteState.locked && quoteState.phase !== "success")
  const depositAddress = quoteState.quote?.quote?.depositAddress?.trim() || ""
  const depositMemo = quoteState.quote?.quote?.depositMemo?.trim() || ""
  const showForm = quoteState.phase === "form"
  const showError = showForm && !quoteState.quoting && Boolean(quoteState.error)
  const amountLabel = balance.amount == null ? "—" : `${formatBalance(balance.amount)} ${balance.symbol ?? destination.symbol}`
  const usdLabel = balance.usd ?? "—"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
          <DialogHeader className="border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Deposit</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-4 py-4">
            <div>
              <div className="flex items-center justify-between text-xs tracking-wide text-muted-foreground uppercase">
                <span>Available on {destination.label}</span>
                <span>≈ USD value</span>
              </div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-foreground">{amountLabel}</p>
                <p className="text-sm text-muted-foreground">{usdLabel}</p>
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Trading account
              <Input
                value={account}
                disabled={formLocked}
                placeholder={`Enter ${destination.label} address`}
                onChange={(event) => prefs.setAccount(destination.id, event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              Refund address
              <Input
                value={refund}
                disabled={formLocked || !source}
                placeholder={refundKind && refundKind !== "other" ? `Enter ${REFUND_KIND_LABEL[refundKind]} refund address` : "Select a token first"}
                onChange={(event) => {
                  if (!refundKind || refundKind === "other") return
                  prefs.setRefundAddress(refundKind, event.target.value)
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Deposit from</span>
                <button
                  type="button"
                  disabled={formLocked}
                  onClick={() => setPickerOpen(true)}
                  className="cursor-pointer disabled:cursor-not-allowed flex h-10 items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm text-foreground disabled:opacity-50"
                >
                  {source ? (
                    <Mark src={tokenLogoUrl(source.symbol)} label={source.symbol} className="size-5 rounded-full object-cover" />
                  ) : (
                    <span className="size-5 rounded-full bg-secondary" />
                  )}
                  <span className="truncate">{source?.symbol ?? "Select"}</span>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Receive on</span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={formLocked}
                    className="cursor-pointer disabled:cursor-not-allowed flex h-10 items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm text-foreground outline-none disabled:opacity-50"
                  >
                    <Mark src={chainLogoUrl(destination.id)} label={destination.label} className="size-5 rounded-full object-cover" />
                    <span className="truncate">{destination.label}</span>
                    <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-border bg-popover">
                    {RECEIVE_CHAINS.map((chain) => (
                      <DropdownMenuItem
                        key={chain.id}
                        onClick={() => prefs.setDestinationChain(chain.id)}
                        className={cn("text-sm", chain.id === destination.id && "text-brand")}
                      >
                        <Mark src={chainLogoUrl(chain.id)} label={chain.label} className="size-4 rounded-full object-cover" />
                        {chain.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {source ? (
              <p className="text-sm text-muted-foreground">
                Deposit {source.symbol} on {chainName(source.blockchain)}. It arrives as {destination.symbol} on {destination.label}.
              </p>
            ) : null}

            {quoteState.minDeposit ? (
              <p className="text-xs text-amber-300">
                Minimum deposit is {quoteState.minDeposit}. A smaller amount will fail.
              </p>
            ) : null}

            {showForm ? (
              <div className={cn("relative flex gap-4 rounded-xl border border-border p-3")}>
                <div className="grid size-[148px] shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                  {quoteState.quoting || tokensLoading ? (
                    <Skeleton className="size-[148px] rounded-none" />
                  ) : depositAddress ? (
                    <QRCodeSVG value={depositAddress} size={132} level="M" />
                  ) : (
                    <span className="px-3 text-center text-xs text-neutral-400">Quote failed</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                  <p className="text-sm text-muted-foreground flex justify-between items-center">
                    <span>
                      {source ? `${source.symbol} Deposit Address` : "Deposit Address"}
                    </span>
                    {depositAddress && !quoteState.quoting ? (
                      <button
                        type="button"
                        aria-label="Copy address"
                        className="cursor-pointer self-end text-muted-foreground hover:text-foreground"
                        onClick={() => void copyText(depositAddress)}
                      >
                        <Copy className="size-4" />
                      </button>
                    ) : null}
                  </p>
                  {quoteState.quoting || tokensLoading ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : (
                    <p className="text-sm break-all text-foreground">{depositAddress || "—"}</p>
                  )}
                  {depositMemo && !quoteState.quoting ? (
                    <p className="text-xs break-all text-muted-foreground">Memo {depositMemo}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-border px-4 py-8 text-center">
                {quoteState.phase === "working" ? (
                  <>
                    <span className="size-8 animate-spin rounded-full border-2 border-brand-500 border-r-transparent" />
                    <p className="text-base font-medium">Processing</p>
                    <p className="text-sm text-muted-foreground">Waiting for the transfer to finish.</p>
                  </>
                ) : null}
                {quoteState.phase === "success" ? (
                  <>
                    <p className="text-base font-medium text-buy-foreground">Deposit complete</p>
                    <p className="text-sm text-muted-foreground">
                      {quoteState.details?.amountOutFormatted
                        ? `Received ${quoteState.details.amountOutFormatted} ${destination.symbol}`
                        : `${destination.symbol} has arrived in the trading account.`}
                    </p>
                  </>
                ) : null}
                {quoteState.phase === "failed" ? (
                  <>
                    <p className="text-base font-medium text-sell-foreground">Deposit failed</p>
                    <p className="text-sm text-muted-foreground">
                      {quoteState.status === "REFUNDED"
                        ? "The deposit was refunded."
                        : "The deposit could not be completed."}
                    </p>
                  </>
                ) : null}
              </div>
            )}

            {showError ? (
              <p className="text-center text-sm text-sell-foreground">{quoteState.error}</p>
            ) : null}

            {quoteState.phase === "success" ? (
              <button
                type="button"
                onClick={quoteState.requote}
                className="cursor-pointer h-11 rounded-full bg-brand-500 text-sm font-semibold text-white"
              >
                Done
              </button>
            ) : showForm ? (
              <button
                type="button"
                disabled={!depositAddress || quoteState.quoting}
                onClick={() => void copyText(depositAddress)}
                className="cursor-pointer h-11 rounded-full bg-brand-500 text-sm font-semibold text-white disabled:opacity-40"
              >
                Copy Address
              </button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <TokenSelectDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tokens={tokens}
        loading={tokensLoading}
        selectedAssetId={source?.assetId ?? null}
        onSelect={(token) => prefs.setSourceToken({ blockchain: token.blockchain, assetKey: assetKey(token) })}
      />
    </>
  )
}
