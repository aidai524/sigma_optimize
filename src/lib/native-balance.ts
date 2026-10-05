import { createPublicClient, formatUnits, http } from "viem"
import { base, bsc, mainnet } from "viem/chains"
import type { DestinationChainId } from "@/lib/chains"
import { RPC_URLS } from "@/lib/env"

async function readSolBalance(address: string): Promise<string> {
  const res = await fetch(RPC_URLS.sol, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address],
    }),
  })
  const payload = await res.json() as { result?: { value?: number }; error?: { message?: string } }
  if (!res.ok || payload.error || payload.result?.value == null) {
    throw new Error(payload.error?.message || "Could not load balance")
  }
  return formatUnits(BigInt(payload.result.value), 9)
}

export async function readNativeBalance(chain: DestinationChainId, address: string): Promise<string> {
  if (chain === "sol") return readSolBalance(address)
  const viemChain = chain === "base" ? base : chain === "bsc" ? bsc : mainnet
  const client = createPublicClient({
    chain: viemChain,
    transport: http(RPC_URLS[chain]),
  })
  const wei = await client.getBalance({ address: address as `0x${string}` })
  return formatUnits(wei, 18)
}
