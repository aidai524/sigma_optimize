import { createPublicClient, http } from "viem"
import { base, bsc, mainnet } from "viem/chains"
import { Connection } from "@solana/web3.js"
import { RPC_URLS } from "@/lib/env"

const EVM_CHAINS = { eth: mainnet, base, bsc } as const

export type EvmReceiveChain = keyof typeof EVM_CHAINS

type EvmClient = ReturnType<typeof makeEvmClient>

const clients = new Map<EvmReceiveChain, EvmClient>()
let solana: Connection | null = null

export function isEvmReceiveChain(chain: string): chain is EvmReceiveChain {
  return chain === "eth" || chain === "base" || chain === "bsc"
}

export function evmChainId(chain: EvmReceiveChain): number {
  return EVM_CHAINS[chain].id
}

function makeEvmClient(chain: EvmReceiveChain) {
  return createPublicClient({
    chain: EVM_CHAINS[chain],
    transport: http(RPC_URLS[chain]),
  })
}

export function evmClient(chain: EvmReceiveChain): EvmClient {
  const existing = clients.get(chain)
  if (existing) return existing
  const client = makeEvmClient(chain)
  clients.set(chain, client)
  return client
}

export function solanaConnection(): Connection {
  if (!solana) solana = new Connection(RPC_URLS.sol, "confirmed")
  return solana
}
