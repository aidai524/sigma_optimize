import { PublicKey } from "@solana/web3.js"
import { chainKind, type ChainKind } from "@/lib/chains"

function trimmed(value: string): string {
  return value.trim()
}

export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed(value))
}

export function isSolanaAddress(value: string): boolean {
  try {
    const key = new PublicKey(trimmed(value))
    return key.toBytes().length === 32
  } catch {
    return false
  }
}

function isNearAddress(value: string): boolean {
  const text = trimmed(value)
  if (/^[a-f0-9]{64}$/.test(text)) return true
  return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(text) && text.length >= 2 && text.length <= 64
}

function isTronAddress(value: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed(value))
}

function matchesKind(value: string, kind: ChainKind): boolean {
  if (kind === "evm") return isEvmAddress(value)
  if (kind === "solana") return isSolanaAddress(value)
  if (kind === "tron") return isTronAddress(value)
  if (kind === "near") return isNearAddress(value)
  if (kind === "zec") return trimmed(value).length >= 26
  return trimmed(value).length >= 8
}

export function isAddressForChain(value: string, blockchain: string): boolean {
  return matchesKind(value, chainKind(blockchain))
}

/** First 5 characters, ellipsis, last 4. */
export function shortAddress(value: string): string {
  const text = trimmed(value)
  if (text.length <= 9) return text
  return `${text.slice(0, 5)}...${text.slice(-4)}`
}
