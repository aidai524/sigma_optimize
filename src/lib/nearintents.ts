import { API_BASE } from "@/lib/env"

export type NearintentsQuote = {
  correlationId?: string
  message?: string
  quote?: {
    depositAddress?: string
    depositMemo?: string
    amountIn?: string
    amountInFormatted?: string
    amountOut?: string
    minAmountIn?: string
    deadline?: string
  }
}

export type NearintentsSwapDetails = {
  amountIn?: string
  amountInFormatted?: string
  amountOut?: string
  amountOutFormatted?: string
  amountInUsd?: string
  amountOutUsd?: string
}

export type NearintentsStatus = {
  status?: string
  updatedAt?: string
  swapDetails?: NearintentsSwapDetails
}

export const DEPOSIT_STATUS = {
  pending: "PENDING_DEPOSIT",
  known: "KNOWN_DEPOSIT_TX",
  incomplete: "INCOMPLETE_DEPOSIT",
  processing: "PROCESSING",
  success: "SUCCESS",
  refunded: "REFUNDED",
  failed: "FAILED",
} as const

export const SEEN_DEPOSIT_STATUSES: ReadonlySet<string> = new Set([
  DEPOSIT_STATUS.known,
  DEPOSIT_STATUS.incomplete,
  DEPOSIT_STATUS.processing,
  DEPOSIT_STATUS.success,
  DEPOSIT_STATUS.refunded,
  DEPOSIT_STATUS.failed,
])

export const TERMINAL_DEPOSIT_STATUSES: ReadonlySet<string> = new Set([
  DEPOSIT_STATUS.success,
  DEPOSIT_STATUS.refunded,
  DEPOSIT_STATUS.failed,
])

export type QuoteRequest = {
  originAsset: string
  destinationAsset: string
  amount: string
  recipient: string
  refundTo: string
}

class NearintentsError extends Error {
  response: { data: { message: string } }

  constructor(message: string) {
    super(message)
    this.name = "NearintentsError"
    this.response = { data: { message } }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function messageOf(payload: unknown): string {
  const row = asRecord(payload)
  if (!row) return ""
  if (typeof row.message === "string") return row.message
  const data = asRecord(row.data)
  if (data && typeof data.message === "string") return data.message
  return ""
}

function unwrap(payload: unknown): unknown {
  const row = asRecord(payload)
  if (!row || !("code" in row) || !("data" in row)) return payload
  const code = row.code
  if (typeof code === "number" && code !== 200 && code !== 0) {
    throw new NearintentsError(messageOf(payload) || "Request failed")
  }
  return row.data
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = { message: text }
    }
  }
  if (!res.ok) throw new NearintentsError(messageOf(payload) || `Request failed (${res.status})`)
  return unwrap(payload)
}

export async function nearintentsQuote(input: QuoteRequest): Promise<NearintentsQuote> {
  const data = await request("/v1/nearintents/quote", {
    method: "POST",
    body: JSON.stringify({
      dry: false,
      swapType: "FLEX_INPUT",
      depositType: "ORIGIN_CHAIN",
      recipientType: "DESTINATION_CHAIN",
      refundType: "ORIGIN_CHAIN",
      originAsset: input.originAsset,
      destinationAsset: input.destinationAsset,
      amount: input.amount,
      recipient: input.recipient.trim(),
      refundTo: input.refundTo.trim(),
      slippageTolerance: 100,
      deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
      quoteWaitingTimeMs: 0,
    }),
  })
  const quote = (data ?? {}) as NearintentsQuote
  if (!quote.quote?.depositAddress?.trim()) {
    throw new NearintentsError(quote.message?.trim() || "Quote did not return a deposit address")
  }
  return quote
}

export async function nearintentsStatus(depositAddress: string, depositMemo?: string): Promise<NearintentsStatus> {
  const search = new URLSearchParams({ depositAddress })
  if (depositMemo?.trim()) search.set("depositMemo", depositMemo.trim())
  const data = await request(`/v1/nearintents/status?${search.toString()}`)
  return (data ?? {}) as NearintentsStatus
}
