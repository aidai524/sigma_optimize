import { useEffect, useMemo, useRef, useState } from "react"
import Big from "big.js"
import { ArrowUpDown, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TokenSelectDialog } from "@/components/deposit/TokenSelectDialog"
import { useConvertQuote, type ConvertSide } from "@/components/deposit/use-convert-quote"
import { shortAddress } from "@/lib/address"
import { chainLogoUrl, chainName, tokenLogoUrl } from "@/lib/chains"
import {
  assetKey,
  isConvertToken,
  isNativeToken,
  type IntentsToken,
} from "@/lib/intents-tokens"
import { formatActionError, formatBalance } from "@/lib/quote-error"
import { evmChainId, isEvmReceiveChain } from "@/lib/rpc"
import { readTokenBalances } from "@/lib/token-balance"
import { useChainWallet, type WalletChoice } from "@/wallet/use-chain-wallet"
import { transferEvm } from "@/wallet/evm/transfer"
import { transferSolana } from "@/wallet/solana/transfer"
import { cn } from "@/lib/utils"

const BALANCE_POLL_MS = 10_000

type Draft = { side: ConvertSide; text: string }

function IconLoading(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 13 13"
      fill="none"
      className={props.className}
    >
      <path
        d="M10.9474 6.5C10.9474 4.04379 8.95621 2.05263 6.5 2.05263C4.04379 2.05263 2.05263 4.04379 2.05263 6.5C2.05263 7.06682 1.59313 7.52632 1.02632 7.52632C0.459497 7.52632 0 7.06682 0 6.5C0 2.91015 2.91015 0 6.5 0C10.0899 0 13 2.91015 13 6.5C13 10.0899 10.0899 13 6.5 13C5.93318 13 5.47368 12.5405 5.47368 11.9737C5.47368 11.4069 5.93318 10.9474 6.5 10.9474C8.95621 10.9474 10.9474 8.95621 10.9474 6.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconLogout(props: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={props.className}>
      <path
        d="M9.95605 0C10.4196 0.000164484 10.7958 0.376267 10.7959 0.839844C10.7959 1.30349 10.4197 1.67952 9.95605 1.67969H1.8916C1.8146 1.77419 1.67969 2.04765 1.67969 2.4834V11.5186C1.6797 11.9543 1.8146 12.2276 1.8916 12.3203H9.95605C10.4197 12.3205 10.7959 12.6965 10.7959 13.1602C10.7958 13.6237 10.4196 13.9998 9.95605 14H1.80469C0.775688 14 0 12.9324 0 11.5166V2.4834C0 1.06765 0.775688 0 1.80469 0H9.95605ZM8.83008 3.25879C9.15908 2.92979 9.68955 2.92979 10.0186 3.25879L13.1416 6.38184C13.15 6.38958 13.1588 6.39713 13.167 6.40527C13.2701 6.50844 13.3405 6.63141 13.3789 6.76172C13.4638 7.04735 13.3931 7.3685 13.167 7.59473C13.1603 7.60136 13.1524 7.60692 13.1455 7.61328L10.0166 10.7412C9.85388 10.9057 9.63903 10.9883 9.42383 10.9883C9.20858 10.9883 8.99283 10.9057 8.83008 10.7412C8.50158 10.4123 8.50164 9.88263 8.83008 9.55371L10.5439 7.83984H4.78809C4.32434 7.83984 3.94824 7.46375 3.94824 7C3.94824 6.53625 4.32434 6.16016 4.78809 6.16016H10.5449L8.83008 4.44629C8.50164 4.11737 8.50158 3.58767 8.83008 3.25879Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TokenMark(props: { src: string; label: string; className: string }) {
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

function sanitizeAmount(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "")
  const dot = cleaned.indexOf(".")
  if (dot < 0) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`
}

function defaultConverting(tokens: readonly IntentsToken[]): IntentsToken | null {
  return tokens.find((token) => token.blockchain === "sol" && token.symbol === "SOL" && isNativeToken(token)) ?? null
}

function defaultGaining(tokens: readonly IntentsToken[]): IntentsToken | null {
  return tokens.find((token) => token.blockchain === "base" && token.symbol === "USDC") ?? null
}

function plainBalance(value: string): string {
  try {
    return new Big(value).toFixed().replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
  } catch {
    return value
  }
}

function exceedsBalance(amount: string, balance: string | null): boolean {
  if (!amount || balance == null) return false
  try {
    return new Big(amount).gt(balance)
  } catch {
    return false
  }
}

function rateLabel(amountIn: string, amountOut: string, inSymbol: string, outSymbol: string): string | null {
  try {
    const input = new Big(amountIn)
    const output = new Big(amountOut)
    if (!input.gt(0) || !output.gt(0)) return null
    const rate = output.div(input).toFixed(6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    return `1 ${inSymbol} ≈ ${rate} ${outSymbol}`
  } catch {
    return null
  }
}

export function ConvertPanel(props: { active: boolean; tokens: IntentsToken[]; tokensLoading: boolean }) {
  const { active, tokens, tokensLoading } = props
  const wallet = useChainWallet()
  const convertTokens = useMemo(() => tokens.filter(isConvertToken), [tokens])
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [gainingId, setGainingId] = useState<string | null>(null)
  const converting = useMemo(() => {
    const picked = convertingId ? convertTokens.find((token) => token.assetId === convertingId) : null
    return picked ?? defaultConverting(convertTokens)
  }, [convertTokens, convertingId])
  const gaining = useMemo(() => {
    const picked = gainingId ? convertTokens.find((token) => token.assetId === gainingId) : null
    return picked ?? defaultGaining(convertTokens)
  }, [convertTokens, gainingId])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [balances, setBalances] = useState<Record<string, string | null> | null>(null)
  const [pickerOpen, setPickerOpen] = useState<"in" | "out" | null>(null)
  const [walletPicker, setWalletPicker] = useState<{ blockchain: string; choices: WalletChoice[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const convertingAddress = converting ? wallet.addressFor(converting.blockchain) : null
  const gainingAddress = gaining ? wallet.addressFor(gaining.blockchain) : null
  const sameAsset = Boolean(converting && gaining && assetKey(converting) === assetKey(gaining))

  const quote = useConvertQuote({
    active: active && !sameAsset,
    origin: converting,
    destination: gaining,
    recipient: gainingAddress ?? "",
    refundTo: convertingAddress ?? "",
    side: draft?.side ?? null,
    text: draft?.text ?? "",
  })

  const convertingValue = draft?.side === "in" ? draft.text : quote.opposite
  const gainingValue = draft?.side === "out" ? draft.text : quote.opposite
  const sending = draft?.side === "out" ? quote.opposite : draft?.side === "in" ? draft.text : ""
  const balancesReady = balances != null
  const convertingBalance = converting && balances ? balances[converting.assetId] ?? null : null
  const gainingBalance = gaining && balances ? balances[gaining.assetId] ?? null : null
  const convertingBalanceLoading = Boolean(convertingAddress) && !balancesReady
  const gainingBalanceLoading = Boolean(gainingAddress) && !balancesReady
  const exceeds = exceedsBalance(sending, convertingBalance)
  const locked = busy || quote.phase !== "form"
  const rate = converting && gaining && quote.opposite
    ? rateLabel(convertingValue, gainingValue, converting.symbol, gaining.symbol)
    : null

  useEffect(() => {
    if (!active) return
    let stop = false
    setBalances(null)
    const pull = () => {
      void readTokenBalances(convertTokens, { evm: wallet.evmAddress, solana: wallet.solanaAddress })
        .then((next) => {
          if (!stop) setBalances(next)
        })
        .catch(() => {
          if (!stop) setBalances((current) => current ?? {})
        })
    }
    pull()
    const timer = window.setInterval(pull, BALANCE_POLL_MS)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [active, convertTokens, wallet.evmAddress, wallet.solanaAddress])

  async function connectSide(blockchain: string, id?: string) {
    setActionError(null)
    wallet.clearConnectError()
    try {
      const choices = await wallet.connect(blockchain, id)
      if (!mounted.current) return
      if (choices && choices.length === 0) {
        setActionError("No wallet found")
        setWalletPicker(null)
        return
      }
      setWalletPicker(choices ? { blockchain, choices } : null)
    } catch (caught) {
      if (!mounted.current) return
      setActionError(formatActionError(caught, "Could not connect wallet"))
    }
  }

  async function onConfirm() {
    if (!converting || !convertingAddress) return
    setBusy(true)
    setActionError(null)
    try {
      const live = await quote.confirmQuote()
      if (!mounted.current) return
      if (converting.blockchain === "sol") {
        if (!wallet.signTransaction) throw new Error("This wallet cannot sign transactions")
        await transferSolana({
          from: convertingAddress,
          to: live.depositAddress,
          amountIn: live.amountIn,
          mint: isNativeToken(converting) ? null : converting.contractAddress,
          memo: live.memo,
          signTransaction: wallet.signTransaction,
        })
      } else if (isEvmReceiveChain(converting.blockchain)) {
        await transferEvm({
          chainId: evmChainId(converting.blockchain),
          to: live.depositAddress,
          amountIn: live.amountIn,
          native: isNativeToken(converting),
          tokenAddress: converting.contractAddress,
        })
      } else {
        throw new Error("Unsupported chain")
      }
      if (!mounted.current) return
      quote.markSubmitted(live.depositAddress, live.memo)
    } catch (caught) {
      if (!mounted.current) return
      setActionError(formatActionError(caught, "Transfer failed"))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function swap() {
    setConvertingId(gaining?.assetId ?? null)
    setGainingId(converting?.assetId ?? null)
    setDraft(null)
    setActionError(null)
  }

  const missingChain = !convertingAddress ? converting : !gainingAddress ? gaining : null
  const message = (actionError ? formatActionError(actionError, actionError) : null)
    || (wallet.connectError ? formatActionError(wallet.connectError, wallet.connectError) : null)
    || (sameAsset ? "Choose two different tokens." : null)
    || (exceeds ? "Insufficient balance" : null)
    || quote.error
  const canConfirm = Boolean(
    converting
    && gaining
    && convertingAddress
    && gainingAddress
    && draft
    && quote.opposite
    && !quote.quoting
    && !busy
    && !sameAsset
    && !exceeds
    && !quote.error
    && quote.phase === "form",
  )

  if (quote.phase !== "form") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-border px-4 py-8 text-center">
          {quote.phase === "working" ? (
            <>
              <span className="size-8 animate-spin rounded-full border-2 border-brand-500 border-r-transparent" />
              <p className="text-base font-medium">Processing</p>
              <p className="text-sm text-muted-foreground">Waiting for the transfer to finish.</p>
            </>
          ) : null}
          {quote.phase === "success" ? (
            <>
              <p className="text-base font-medium text-buy-foreground">Convert complete</p>
              <p className="text-sm text-muted-foreground">
                {quote.details?.amountOutFormatted
                  ? `Received ${quote.details.amountOutFormatted} ${gaining?.symbol ?? ""}`
                  : "Tokens have arrived in the trading account."}
              </p>
            </>
          ) : null}
          {quote.phase === "failed" ? (
            <>
              <p className="text-base font-medium text-sell-foreground">Convert failed</p>
              <p className="text-sm text-muted-foreground">
                {quote.status === "REFUNDED" ? "The transfer was refunded." : "The transfer could not be completed."}
              </p>
            </>
          ) : null}
        </div>
        {quote.phase === "success" ? (
          <button
            type="button"
            onClick={() => {
              quote.reset()
              setDraft(null)
              setActionError(null)
            }}
            className="cursor-pointer h-11 rounded-full bg-brand-500 text-sm font-semibold text-white"
          >
            Done
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {converting && gaining ? (
        <p className="text-sm text-muted-foreground">
          Swap {converting.symbol} on {chainName(converting.blockchain)} for {gaining.symbol} on {chainName(gaining.blockchain)}
        </p>
      ) : null}
      {!tokensLoading && convertTokens.length === 0 ? (
        <p className="text-center text-sm text-sell-foreground">Could not load tokens.</p>
      ) : null}

      <div>
        <WalletChip
          address={convertingAddress}
          onConnect={() => { if (converting) void connectSide(converting.blockchain) }}
          onDisconnect={() => { if (converting) wallet.disconnect(converting.blockchain) }}
        />
        <AmountCard
          label="Converting"
          value={convertingValue}
          balance={convertingBalance}
          balanceLoading={convertingBalanceLoading}
          token={converting}
          disabled={locked}
          onChange={(text) => setDraft({ side: "in", text })}
          onFill={(amount) => setDraft({ side: "in", text: amount })}
          onPick={() => setPickerOpen("in")}
        />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          aria-label="Switch tokens"
          disabled={locked || !converting || !gaining}
          onClick={swap}
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-secondary text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUpDown className="size-4" />
        </button>
      </div>

      <div>
        <WalletChip
          address={gainingAddress}
          onConnect={() => { if (gaining) void connectSide(gaining.blockchain) }}
          onDisconnect={() => { if (gaining) wallet.disconnect(gaining.blockchain) }}
        />
        <AmountCard
          label="Gaining"
          value={gainingValue}
          balance={gainingBalance}
          balanceLoading={gainingBalanceLoading}
          token={gaining}
          disabled={locked}
          onChange={(text) => setDraft({ side: "out", text })}
          onFill={(amount) => setDraft({ side: "out", text: amount })}
          onPick={() => setPickerOpen("out")}
        />
        {rate ? <p className="mt-1 text-right text-xs text-muted-foreground">{rate}</p> : null}
      </div>

      {message ? <p className="min-w-0 break-words text-center text-sm text-sell-foreground">{message}</p> : null}

      {missingChain ? (
        <button
          type="button"
          onClick={() => void connectSide(missingChain.blockchain)}
          className="cursor-pointer h-11 rounded-full bg-brand-500 text-sm font-semibold text-white"
        >
          Connect wallet
        </button>
      ) : (
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => void onConfirm()}
          className="flex cursor-pointer h-11 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? <IconLoading className="size-4 animate-spin" /> : "Confirm"}
        </button>
      )}

      <TokenSelectDialog
        open={pickerOpen != null}
        onClose={() => setPickerOpen(null)}
        tokens={convertTokens}
        loading={tokensLoading}
        selectedAssetId={(pickerOpen === "in" ? converting : gaining)?.assetId ?? null}
        balanceByAssetId={balances ?? undefined}
        onSelect={(token) => {
          const other = pickerOpen === "in" ? gaining : converting
          if (other && assetKey(other) === assetKey(token)) return
          if (pickerOpen === "in") setConvertingId(token.assetId)
          else setGainingId(token.assetId)
          setDraft(null)
        }}
      />

      <Dialog open={walletPicker != null} onOpenChange={(next) => { if (!next) setWalletPicker(null) }}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Connect wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {walletPicker?.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="cursor-pointer flex h-10 items-center rounded-lg px-3 text-left text-sm hover:bg-secondary"
                onClick={() => { if (walletPicker) void connectSide(walletPicker.blockchain, choice.id) }}
              >
                {choice.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WalletChip(props: { address: string | null; onConnect: () => void; onDisconnect: () => void }) {
  return (
    <div className="mb-1.5 flex justify-end">
      {props.address ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {shortAddress(props.address)}
          <button type="button" aria-label="Disconnect" className="cursor-pointer hover:text-foreground" onClick={props.onDisconnect}>
            <IconLogout className="size-3.5" />
          </button>
        </span>
      ) : (
        <button type="button" className="cursor-pointer text-xs text-muted-foreground hover:text-foreground" onClick={props.onConnect}>
          Connect
        </button>
      )}
    </div>
  )
}

function AmountCard(props: {
  label: string
  value: string
  balance: string | null
  balanceLoading: boolean
  token: IntentsToken | null
  disabled: boolean
  onChange: (value: string) => void
  onFill: (amount: string) => void
  onPick: () => void
}) {
  const canFill = !props.disabled && !props.balanceLoading && props.balance != null
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{props.label}</span>
        <span className="flex items-center gap-1.5">
          Balance:
          {props.balanceLoading ? (
            <span className="inline-block h-3 w-10 animate-pulse rounded bg-secondary" />
          ) : canFill ? (
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={() => props.onFill(plainBalance(props.balance ?? "0"))}
            >
              {formatBalance(props.balance ?? "0")}
            </button>
          ) : (
            <span>{props.balance == null ? "—" : formatBalance(props.balance)}</span>
          )}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          inputMode="decimal"
          value={props.value}
          disabled={props.disabled}
          placeholder="0.0"
          onChange={(event) => props.onChange(sanitizeAmount(event.target.value))}
          className="min-w-0 flex-1 bg-transparent text-2xl font-medium text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="button"
          disabled={props.disabled || !props.token}
          onClick={props.onPick}
          className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.token ? (
            <span className="relative size-6 shrink-0">
              <TokenMark src={tokenLogoUrl(props.token.symbol)} label={props.token.symbol} className="size-6 rounded-full object-cover" />
              <TokenMark
                src={chainLogoUrl(props.token.blockchain)}
                label={props.token.blockchain}
                className="absolute right-[-2px] bottom-[-2px] size-3 rounded-[4px] object-cover border border-popover"
              />
            </span>
          ) : (
            <span className="size-6 rounded-full bg-secondary" />
          )}
          <span>{props.token?.symbol ?? "Select"}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
