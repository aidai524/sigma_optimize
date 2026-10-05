import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { wagmiConfig } from "@/wallet/evm/config"
import { SolanaWalletProvider } from "@/wallet/solana/provider"

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
