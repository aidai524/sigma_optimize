import { useEffect, useRef, useState } from "react"
import type { IntentsToken } from "@/lib/intents-tokens"
import {
  DEPOSIT_STATUS,
  nearintentsQuote,
  nearintentsStatus,
  type NearintentsQuote,
  type NearintentsSwapDetails,
  type SwapType,
} from "@/lib/nearintents"
import { errorText, formatQuoteError, minorToInput, toMinor } from "@/lib/quote-error"

export type ConvertSide = "in" | "out"
export type ConvertPhase = "form" | "working" | "success" | "failed"

const DEBOUNCE_MS = 400
const POLL_MS = 4000

type QuoteInput = {
  active: boolean
  origin: IntentsToken | null
  destination: IntentsToken | null
  recipient: string
  refundTo: string
  side: ConvertSide | null
  text: string
}

type LiveQuote = {
  side: ConvertSide
  text: string
  quote: NearintentsQuote
}

export function useConvertQuote(input: QuoteInput) {
  const [preview, setPreview] = useState<LiveQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [details, setDetails] = useState<NearintentsSwapDetails | null>(null)
  const [watch, setWatch] = useState<{ depositAddress: string; memo: string } | null>(null)
  const requestId = useRef(0)
  const latest = useRef(input)
  useEffect(() => {
    latest.current = input
  })

  useEffect(() => {
    if (!input.active) {
      setQuoting(false)
      return
    }
    if (watch) return
    const origin = input.origin
    const destination = input.destination
    const side = input.side
    const text = input.text
    const recipient = input.recipient.trim()
    const refundTo = input.refundTo.trim()
    if (!origin || !destination || !side || !recipient || !refundTo) {
      setQuoting(false)
      setPreview(null)
      setError(null)
      return
    }
    const decimals = side === "in" ? origin.decimals : destination.decimals
    const amount = toMinor(text, decimals)
    if (!amount) {
      setQuoting(false)
      setPreview(null)
      setError(null)
      return
    }

    const id = ++requestId.current
    setQuoting(true)
    setError(null)
    setPreview(null)
    const timer = window.setTimeout(() => {
      const swapType: SwapType = side === "in" ? "EXACT_INPUT" : "EXACT_OUTPUT"
      void nearintentsQuote({
        dry: true,
        swapType,
        originAsset: origin.assetId,
        destinationAsset: destination.assetId,
        amount,
        recipient,
        refundTo,
      })
        .then((quote) => {
          if (id !== requestId.current) return
          setPreview({ side, text, quote })
        })
        .catch((caught: unknown) => {
          if (id !== requestId.current) return
          setError(formatQuoteError(errorText(caught), {
            sourceDecimals: origin.decimals,
            sourceSymbol: origin.symbol,
            destinationDecimals: destination.decimals,
            destinationSymbol: destination.symbol,
          }))
        })
        .finally(() => {
          if (id === requestId.current) setQuoting(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
    }
  }, [
    watch,
    input.active,
    input.origin,
    input.destination,
    input.recipient,
    input.refundTo,
    input.side,
    input.text,
  ])

  const depositAddress = watch?.depositAddress ?? ""
  const depositMemo = watch?.memo
  const terminal = status === "SUCCESS" || status === "FAILED" || status === "REFUNDED"
  useEffect(() => {
    if (!depositAddress || terminal) return
    let stop = false
    const poll = () => {
      void nearintentsStatus(depositAddress, depositMemo)
        .then((next) => {
          if (stop) return
          setStatus(next.status?.trim() || DEPOSIT_STATUS.pending)
          setDetails(next.swapDetails ?? null)
        })
        .catch(() => undefined)
    }
    poll()
    const timer = window.setInterval(poll, POLL_MS)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [depositAddress, depositMemo, terminal])

  const matched = preview && preview.side === input.side && preview.text === input.text ? preview.quote : null
  const opposite = matched && input.origin && input.destination
    ? quotedOpposite(matched, input.side, input.origin.decimals, input.destination.decimals)
    : ""

  const phase: ConvertPhase = status === "SUCCESS"
    ? "success"
    : status === "FAILED" || status === "REFUNDED"
      ? "failed"
      : watch
        ? "working"
        : "form"

  async function confirmQuote(): Promise<{ depositAddress: string; amountIn: bigint; memo: string }> {
    const current = latest.current
    const origin = current.origin
    const destination = current.destination
    const side = current.side
    if (!origin || !destination || !side) throw new Error("Enter an amount")
    const decimals = side === "in" ? origin.decimals : destination.decimals
    const amount = toMinor(current.text, decimals)
    if (!amount) throw new Error("Enter an amount")
    const id = ++requestId.current
    const quote = await nearintentsQuote({
      dry: false,
      swapType: side === "in" ? "EXACT_INPUT" : "EXACT_OUTPUT",
      originAsset: origin.assetId,
      destinationAsset: destination.assetId,
      amount,
      recipient: current.recipient.trim(),
      refundTo: current.refundTo.trim(),
    })
    if (id !== requestId.current) throw new Error("Quote expired")
    const address = quote.quote?.depositAddress?.trim() || ""
    const amountIn = quote.quote?.amountIn?.trim() || ""
    if (!address || !amountIn) throw new Error("Quote did not return a deposit address")
    setPreview({ side, text: current.text, quote })
    setQuoting(false)
    return { depositAddress: address, amountIn: BigInt(amountIn), memo: quote.quote?.depositMemo?.trim() || "" }
  }

  function markSubmitted(address: string, memo: string) {
    setWatch({ depositAddress: address, memo })
    setStatus(DEPOSIT_STATUS.pending)
    setError(null)
  }

  function reset() {
    requestId.current += 1
    setWatch(null)
    setStatus(null)
    setDetails(null)
    setPreview(null)
    setError(null)
    setQuoting(false)
  }

  return { quoting, error, opposite, matched, phase, status, details, confirmQuote, markSubmitted, reset }
}

function quotedOpposite(
  quote: NearintentsQuote,
  side: ConvertSide | null,
  originDecimals: number,
  destinationDecimals: number,
): string {
  if (side === "in") return quoteAmount(quote.quote?.amountOutFormatted, quote.quote?.amountOut, destinationDecimals)
  if (side === "out") return quoteAmount(quote.quote?.amountInFormatted, quote.quote?.amountIn, originDecimals)
  return ""
}

function quoteAmount(formatted: string | undefined, raw: string | undefined, decimals: number): string {
  const plain = formatted?.replace(/,/g, "").trim()
  if (plain) return plain
  if (!raw?.trim()) return ""
  try {
    return minorToInput(raw.trim(), decimals)
  } catch {
    return ""
  }
}
