export const RECEIVE_CHAINS = [
  { id: "sol", label: "Solana", symbol: "SOL", kind: "solana" },
  { id: "base", label: "Base", symbol: "ETH", kind: "evm" },
  { id: "eth", label: "Ethereum", symbol: "ETH", kind: "evm" },
  { id: "bsc", label: "BNB Chain", symbol: "BNB", kind: "evm" },
] as const

export type DestinationChainId = (typeof RECEIVE_CHAINS)[number]["id"]
export type ChainKind = "evm" | "solana" | "near" | "tron" | "zec" | "other"
export type RefundKind = Exclude<ChainKind, "other">

/** Chains shown in the deposit token picker, in rail order. */
export const DEPOSIT_CHAINS = [
  "eth",
  "sol",
  "base",
  "bsc",
  "arb",
  "op",
  "pol",
  "avax",
  "near",
  "tron",
  "zec",
  "scroll",
  "xlayer",
] as const

const DEPOSIT_CHAIN_SET = new Set<string>(DEPOSIT_CHAINS)

const CHAIN_KINDS: Record<string, ChainKind> = {
  eth: "evm",
  base: "evm",
  arb: "evm",
  op: "evm",
  pol: "evm",
  bsc: "evm",
  avax: "evm",
  gnosis: "evm",
  scroll: "evm",
  xlayer: "evm",
  bera: "evm",
  monad: "evm",
  plasma: "evm",
  near: "near",
  sol: "solana",
  tron: "tron",
  zec: "zec",
}

const CHAIN_NAMES: Record<string, string> = {
  eth: "Ethereum",
  base: "Base",
  arb: "Arbitrum",
  op: "Optimism",
  pol: "Polygon",
  bsc: "BNB Chain",
  avax: "Avalanche",
  gnosis: "Gnosis",
  scroll: "Scroll",
  xlayer: "X Layer",
  bera: "Berachain",
  monad: "Monad",
  plasma: "Plasma",
  near: "NEAR",
  sol: "Solana",
  tron: "Tron",
  zec: "Zcash",
}

const LOGO_HOST = "https://assets.dapdap.net"

const LOGO_ALIAS: Record<string, string> = {
  eth: "ethereum",
  sol: "solana",
  pol: "polygon",
  arb: "arbitrum",
  op: "optimism",
  avax: "avalanche",
  bera: "berachain",
  zec: "zcash",
}

export function isDepositChain(blockchain: string): boolean {
  return DEPOSIT_CHAIN_SET.has(blockchain.trim().toLowerCase())
}

export function chainKind(blockchain: string): ChainKind {
  return CHAIN_KINDS[blockchain.trim().toLowerCase()] ?? "other"
}

export function chainName(blockchain: string): string {
  const key = blockchain.trim().toLowerCase()
  return CHAIN_NAMES[key] ?? key.toUpperCase()
}

export function chainLogoUrl(blockchain: string): string {
  const key = blockchain.trim().toLowerCase()
  const file = LOGO_ALIAS[key] || key
  return `${LOGO_HOST}/stableflow/networks/${file}.png`
}

export function tokenLogoUrl(symbol: string): string {
  return `${LOGO_HOST}/stableflow/tokens/${symbol.trim().toLowerCase()}.png`
}

export function receiveChain(id: string) {
  return RECEIVE_CHAINS.find((chain) => chain.id === id) ?? RECEIVE_CHAINS[0]
}

export function isDestinationChain(id: string): id is DestinationChainId {
  return RECEIVE_CHAINS.some((chain) => chain.id === id)
}

export function sortBlockchains(blockchains: string[]): string[] {
  const rank = new Map<string, number>(DEPOSIT_CHAINS.map((code, index) => [code, index]))
  return [...blockchains].sort((a, b) => {
    const left = rank.get(a) ?? 1000
    const right = rank.get(b) ?? 1000
    if (left !== right) return left - right
    return a.localeCompare(b)
  })
}
