export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://api.stableflow.ai").replace(/\/$/, "")

export const RPC_URLS = {
  eth: import.meta.env.VITE_ETH_RPC_URL || "https://ethereum.publicnode.com",
  base: import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org",
  bsc: import.meta.env.VITE_BSC_RPC_URL || "https://bsc.publicnode.com",
  sol: import.meta.env.VITE_SOLANA_RPC_URL || "https://solana-rpc.publicnode.com",
} as const
