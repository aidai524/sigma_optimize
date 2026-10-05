import { encodeFunctionData, erc20Abi, type Address } from "viem"
import { getWalletClient, switchChain } from "wagmi/actions"
import { wagmiConfig } from "@/wallet/evm/config"

type SupportedChainId = (typeof wagmiConfig)["chains"][number]["id"]

export async function transferEvm(input: {
  chainId: number
  to: string
  amountIn: bigint
  native: boolean
  tokenAddress?: string | null
}): Promise<string> {
  await switchChain(wagmiConfig, { chainId: input.chainId as SupportedChainId })
  const client = await getWalletClient(wagmiConfig)
  if (!client) throw new Error("Connect an EVM wallet")
  const to = input.to as Address
  if (input.native) {
    return client.sendTransaction({ to, value: input.amountIn, chain: client.chain })
  }
  if (!input.tokenAddress) throw new Error("Missing token contract")
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, input.amountIn],
  })
  return client.sendTransaction({
    to: input.tokenAddress as Address,
    data,
    chain: client.chain,
  })
}
