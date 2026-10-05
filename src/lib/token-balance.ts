import { erc20Abi, formatUnits, type Address } from "viem"
import { PublicKey } from "@solana/web3.js"
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import Big from "big.js"
import { isNativeToken, type IntentsToken } from "@/lib/intents-tokens"
import { evmClient, isEvmReceiveChain, solanaConnection, type EvmReceiveChain } from "@/lib/rpc"

export async function readTokenBalances(
  tokens: readonly IntentsToken[],
  owners: { evm: string | null; solana: string | null },
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  const evmGroups = new Map<EvmReceiveChain, IntentsToken[]>()
  const solanaTokens: IntentsToken[] = []

  for (const token of tokens) {
    if (token.blockchain === "sol") {
      solanaTokens.push(token)
      if (!owners.solana) out[token.assetId] = null
      continue
    }
    if (isEvmReceiveChain(token.blockchain)) {
      const group = evmGroups.get(token.blockchain) ?? []
      group.push(token)
      evmGroups.set(token.blockchain, group)
      if (!owners.evm) out[token.assetId] = null
    }
  }

  const jobs: Promise<void>[] = []
  if (owners.evm) {
    for (const [chain, group] of evmGroups) {
      jobs.push(readEvmChain(chain, owners.evm as Address, group).then((part) => {
        Object.assign(out, part)
      }))
    }
  }
  if (owners.solana && solanaTokens.length > 0) {
    jobs.push(readSolana(owners.solana, solanaTokens).then((part) => {
      Object.assign(out, part)
    }))
  }
  await Promise.all(jobs)
  return out
}

async function readEvmChain(
  chain: EvmReceiveChain,
  owner: Address,
  tokens: IntentsToken[],
): Promise<Record<string, string | null>> {
  const client = evmClient(chain)
  const out: Record<string, string | null> = {}
  const natives = tokens.filter((token) => isNativeToken(token))
  const contracts = tokens.filter((token) => !isNativeToken(token) && isAddress(token.contractAddress))

  await Promise.all(natives.map(async (token) => {
    try {
      const wei = await client.getBalance({ address: owner })
      out[token.assetId] = formatUnits(wei, token.decimals)
    } catch {
      out[token.assetId] = null
    }
  }))

  if (contracts.length === 0) return out
  try {
    const results = await client.multicall({
      contracts: contracts.map((token) => ({
        address: token.contractAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [owner] as const,
      })),
      allowFailure: true,
    })
    results.forEach((result, index) => {
      const token = contracts[index]
      if (!token) return
      out[token.assetId] = result.status === "success"
        ? formatUnits(result.result, token.decimals)
        : null
    })
  } catch {
    for (const token of contracts) out[token.assetId] = null
  }
  return out
}

async function readSolana(owner: string, tokens: IntentsToken[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  const connection = solanaConnection()
  let key: PublicKey
  try {
    key = new PublicKey(owner)
  } catch {
    for (const token of tokens) out[token.assetId] = null
    return out
  }

  const natives = tokens.filter((token) => isNativeToken(token))
  const mints = tokens.filter((token) => !isNativeToken(token))
  try {
    const lamports = await connection.getBalance(key)
    for (const token of natives) out[token.assetId] = formatUnits(BigInt(lamports), token.decimals)
  } catch {
    for (const token of natives) out[token.assetId] = null
  }

  const byMint = new Map<string, Big>()
  let loaded = false
  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(key, { programId })
      loaded = true
      for (const account of accounts.value) {
        const parsed = mintAmount(account.account.data)
        if (!parsed) continue
        const prev = byMint.get(parsed.mint) ?? new Big(0)
        byMint.set(parsed.mint, prev.plus(parsed.amount))
      }
    } catch {
      // A failed program read leaves those mints unknown unless the other program loaded.
    }
  }

  for (const token of mints) {
    const mint = token.contractAddress?.trim()
    if (!mint) {
      out[token.assetId] = null
      continue
    }
    const raw = byMint.get(mint)
    if (!raw) {
      out[token.assetId] = loaded ? "0" : null
      continue
    }
    out[token.assetId] = formatUnits(BigInt(raw.round(0, Big.roundDown).toFixed(0)), token.decimals)
  }
  return out
}

function isAddress(value: string | null): value is string {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value))
}

function mintAmount(data: unknown): { mint: string; amount: string } | null {
  if (!data || typeof data !== "object" || !("parsed" in data)) return null
  const parsed = (data as { parsed?: { info?: { mint?: unknown; tokenAmount?: { amount?: unknown } } } }).parsed
  const mint = parsed?.info?.mint
  const amount = parsed?.info?.tokenAmount?.amount
  if (typeof mint !== "string" || typeof amount !== "string") return null
  return { mint, amount }
}
