import { createConfig, http } from "wagmi"
import { base, bsc, mainnet } from "wagmi/chains"
import { injected } from "wagmi/connectors"
import { RPC_URLS } from "@/lib/env"

export const wagmiConfig = createConfig({
  chains: [mainnet, base, bsc],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [mainnet.id]: http(RPC_URLS.eth),
    [base.id]: http(RPC_URLS.base),
    [bsc.id]: http(RPC_URLS.bsc),
  },
  ssr: false,
})
