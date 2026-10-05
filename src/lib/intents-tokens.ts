import { RECEIVE_CHAINS, isDepositChain } from "@/lib/chains"
import { NEARINTENTS_API_KEY, ONECLICK_BASE } from "@/lib/env"

export type IntentsToken = {
  assetId: string
  blockchain: string
  symbol: string
  decimals: number
  contractAddress: string | null
  price: number
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const REFRESH_MS = 30 * 60 * 1000

type TokenSnapshot = {
  tokens: IntentsToken[]
  loading: boolean
  error: string | null
}

let cached: IntentsToken[] | null = null
let loading = false
let error: string | null = null
let inflight: Promise<IntentsToken[]> | null = null
let started = false
let snapshot: TokenSnapshot = { tokens: [], loading: false, error: null }
const listeners = new Set<() => void>()

function publish() {
  snapshot = { tokens: cached ?? [], loading, error }
  for (const listener of listeners) listener()
}

export function subscribeIntentsTokens(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getIntentsTokensSnapshot(): TokenSnapshot {
  return snapshot
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function mapToken(raw: unknown): IntentsToken | null {
  const row = asRecord(raw)
  if (!row) return null
  const assetId = text(row.assetId ?? row.asset_id)
  const blockchain = text(row.blockchain).toLowerCase()
  const symbol = text(row.symbol).toUpperCase()
  const decimals = numberValue(row.decimals)
  if (!assetId || !blockchain || !symbol) return null
  if (decimals == null || !Number.isInteger(decimals) || decimals < 0) return null
  const contract = text(row.contractAddress ?? row.contract_address)
  return {
    assetId,
    blockchain,
    symbol,
    decimals,
    contractAddress: contract || null,
    price: numberValue(row.price) ?? 0,
  }
}

const DEPOSIT_SYMBOLS = new Set(["USDT", "USDT0", "USDC"])

export function isNativeToken(token: Pick<IntentsToken, "contractAddress">): boolean {
  const addr = String(token.contractAddress || "").trim().toLowerCase()
  return !addr || addr === "native" || addr === ZERO_ADDRESS
}

function isCurrentGasToken(token: Pick<IntentsToken, "symbol" | "contractAddress">): boolean {
  return isNativeToken(token) && !token.symbol.toUpperCase().includes("DEPRECATED")
}

export function isDepositSourceToken(token: Pick<IntentsToken, "symbol" | "contractAddress">): boolean {
  return DEPOSIT_SYMBOLS.has(token.symbol.trim().toUpperCase()) || isCurrentGasToken(token)
}

export function isReceiveGasToken(token: Pick<IntentsToken, "blockchain" | "symbol" | "contractAddress">): boolean {
  const chain = RECEIVE_CHAINS.find((item) => item.id === token.blockchain)
  return Boolean(chain && chain.symbol === token.symbol && isCurrentGasToken(token))
}

export function assetKey(token: Pick<IntentsToken, "blockchain" | "symbol" | "contractAddress">): string {
  const addr = String(token.contractAddress || "").trim() || "native"
  return `${token.blockchain}:${token.symbol}:${addr}`
}

export function sameAssetKey(left: string | null | undefined, right: string | null | undefined): boolean {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase()
}

export function destinationNative(tokens: readonly IntentsToken[], chain: string, symbol: string): IntentsToken | null {
  return tokens.find((token) => (
    token.blockchain === chain && token.symbol === symbol && isNativeToken(token)
  )) ?? null
}

export function resolveSourceToken(
  tokens: readonly IntentsToken[],
  sourceAssetKey: string | null,
): IntentsToken | null {
  if (sourceAssetKey) {
    const matched = tokens.find((token) => sameAssetKey(assetKey(token), sourceAssetKey))
    if (matched) return matched
  }
  const arbUsdc = tokens.find((token) => token.blockchain === "arb" && token.symbol === "USDC")
  return arbUsdc ?? tokens[0] ?? null
}

function tokenList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const row = asRecord(payload)
  if (!row) return []
  if (Array.isArray(row.data)) return row.data
  const data = asRecord(row.data)
  if (data && Array.isArray(data.tokens)) return data.tokens
  if (Array.isArray(row.tokens)) return row.tokens
  return []
}

function fetchIntentsTokens(force: boolean): Promise<IntentsToken[]> {
  if (!force && cached) return Promise.resolve(cached)
  if (inflight) return inflight
  const hadCache = cached != null
  if (!hadCache) {
    loading = true
    error = null
    publish()
  }
  inflight = fetch(`${ONECLICK_BASE}/v0/tokens`, {
    headers: {
      Accept: "application/json",
      "X-API-Key": NEARINTENTS_API_KEY,
    },
  })
    .then(async (res) => {
      const payload: unknown = await res.json()
      if (!res.ok) throw new Error("Could not load tokens")
      const tokens = tokenList(payload)
        .map(mapToken)
        .filter((token): token is IntentsToken => token != null && isDepositChain(token.blockchain))
      if (tokens.length === 0) throw new Error("Could not load tokens")
      cached = tokens
      loading = false
      error = null
      publish()
      return tokens
    })
    .catch((caught: unknown) => {
      loading = false
      if (!cached) error = caught instanceof Error ? caught.message : "Could not load tokens."
      publish()
      if (cached) return cached
      throw caught
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function loadIntentsTokens(): Promise<IntentsToken[]> {
  return fetchIntentsTokens(false)
}

export function startIntentsTokenRefresh() {
  if (started || typeof window === "undefined") return
  started = true
  void fetchIntentsTokens(false).catch(() => undefined)
  window.setInterval(() => {
    void fetchIntentsTokens(true).catch(() => undefined)
  }, REFRESH_MS)
}
