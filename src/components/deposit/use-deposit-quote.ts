import { useEffect, useRef, useState } from "react"
import type { IntentsToken } from "@/lib/intents-tokens"
import {
  SEEN_DEPOSIT_STATUSES,
  TERMINAL_DEPOSIT_STATUSES,
  nearintentsQuote,
  nearintentsStatus,
  type NearintentsQuote,
  type NearintentsSwapDetails,
} from "@/lib/nearintents"
import { errorText, formatMinorAmount, formatQuoteError, minimumSwapUsd, oneUsdMinor, usdMinor } from "@/lib/quote-error"

export type DepositPhase = "form" | "working" | "success" | "failed"

type QuoteInput = {
  open: boolean
  quiet: boolean
  source: IntentsToken | null
  destination: IntentsToken | null
  recipient: string
  refundTo: string
  blockedReason: string | null
}

export function useDepositQuote(input: QuoteInput) {
  const [quote, setQuote] = useState<NearintentsQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [minDeposit, setMinDeposit] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [details, setDetails] = useState<NearintentsSwapDetails | null>(null)
  const [expiryTick, setExpiryTick] = useState(0)
  const [manualTick, setManualTick] = useState(0)
  const requestId = useRef(0)
  const locked = status != null && SEEN_DEPOSIT_STATUSES.has(status)
  const lockedRef = useRef(locked)
  const immediateOnOpen = useRef(true)
  const expirySeen = useRef(0)
  const manualSeen = useRef(0)
  lockedRef.current = locked

  useEffect(() => {
    if (!input.open) {
      immediateOnOpen.current = true
      setQuote(null)
      setQuoting(false)
      setError(null)
      setMinDeposit(null)
      setStatus(null)
      setDetails(null)
    }
  }, [input.open])

  useEffect(() => {
    if (!input.open || lockedRef.current) return
    const source = input.source
    const destination = input.destination
    if (input.quiet || !source || !destination) {
      setQuoting(false)
      setError(input.quiet ? null : input.blockedReason)
      setMinDeposit(null)
      return
    }
    if (input.blockedReason) {
      setQuoting(false)
      setQuote(null)
      setStatus(null)
      setDetails(null)
      setError(input.blockedReason)
      setMinDeposit(null)
      return
    }
    const amount = oneUsdMinor(source.symbol, source.price, source.decimals)
    if (!amount) {
      setQuoting(false)
      setQuote(null)
      setError("This token has no price.")
      setMinDeposit(null)
      return
    }
    const id = ++requestId.current
    const expiryBump = expiryTick !== expirySeen.current
    const manualBump = manualTick !== manualSeen.current
    expirySeen.current = expiryTick
    manualSeen.current = manualTick
    const delay = immediateOnOpen.current || expiryBump || manualBump ? 0 : 400
    immediateOnOpen.current = false
    setQuoting(true)
    setError(null)
    setMinDeposit(null)
    setQuote(null)
    setStatus(null)
    setDetails(null)
    const timer = window.setTimeout(() => {
      void (async () => {
        const request = {
          originAsset: source.assetId,
          destinationAsset: destination.assetId,
          recipient: input.recipient,
          refundTo: input.refundTo,
        }
        const tokens = {
          sourceDecimals: source.decimals,
          sourceSymbol: source.symbol,
          destinationDecimals: destination.decimals,
          destinationSymbol: destination.symbol,
        }
        try {
          const next = await nearintentsQuote({ ...request, amount })
          if (id !== requestId.current) return
          setQuote(next)
          setMinDeposit(minimumDepositLabel(next, source.symbol, source.decimals))
        } catch (caught) {
          if (id !== requestId.current) return
          const message = errorText(caught)
          const minUsd = minimumSwapUsd(message)
          const retryUsd = minUsd == null ? null : minUsd * 1.1
          const retryAmount = retryUsd == null ? null : usdMinor(retryUsd, source.price, source.decimals, source.symbol)
          if (retryAmount && retryAmount !== amount) {
            try {
              const next = await nearintentsQuote({ ...request, amount: retryAmount })
              if (id !== requestId.current) return
              setQuote(next)
              setMinDeposit(minimumDepositLabel(next, source.symbol, source.decimals))
              return
            } catch (retryCaught) {
              if (id !== requestId.current) return
              setError(formatQuoteError(errorText(retryCaught), tokens))
              return
            }
          }
          setError(formatQuoteError(message, tokens))
        } finally {
          if (id === requestId.current) setQuoting(false)
        }
      })()
    }, delay)
    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
    }
  }, [
    input.open,
    input.quiet,
    input.source,
    input.destination,
    input.recipient,
    input.refundTo,
    input.blockedReason,
    expiryTick,
    manualTick,
  ])

  const deadline = quote?.quote?.deadline
  useEffect(() => {
    if (!input.open || locked || !deadline) return
    const at = Date.parse(deadline)
    if (!Number.isFinite(at)) return
    const delay = Math.max(2000, at - Date.now())
    const timer = window.setTimeout(() => setExpiryTick((current) => current + 1), delay)
    return () => window.clearTimeout(timer)
  }, [input.open, locked, deadline])

  const depositAddress = quote?.quote?.depositAddress?.trim() || ""
  const depositMemo = quote?.quote?.depositMemo
  const terminal = status != null && TERMINAL_DEPOSIT_STATUSES.has(status)
  useEffect(() => {
    if (!input.open || !depositAddress || terminal) return
    let stop = false
    const poll = () => {
      void nearintentsStatus(depositAddress, depositMemo)
        .then((next) => {
          if (stop) return
          setStatus(next.status?.trim() || null)
          setDetails(next.swapDetails ?? null)
        })
        .catch(() => undefined)
    }
    poll()
    const timer = window.setInterval(poll, 4000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [input.open, depositAddress, depositMemo, terminal])

  const phase: DepositPhase = status === "SUCCESS"
    ? "success"
    : status === "FAILED" || status === "REFUNDED"
      ? "failed"
      : locked
        ? "working"
        : "form"

  function requote() {
    setStatus(null)
    setDetails(null)
    setQuote(null)
    setError(null)
    setManualTick((current) => current + 1)
  }

  return { quote, quoting, error, minDeposit, status, details, phase, locked, requote }
}

function minimumDepositLabel(quote: NearintentsQuote, symbol: string, decimals: number): string | null {
  const formatted = quote.quote?.amountInFormatted?.trim()
  if (formatted) return `${formatted} ${symbol}`
  const raw = quote.quote?.amountIn?.trim()
  if (!raw) return null
  return `${formatMinorAmount(raw, decimals)} ${symbol}`
}
