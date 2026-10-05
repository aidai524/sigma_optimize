import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEPOSIT_CHAINS, chainKind, type DestinationChainId, type RefundKind } from "@/lib/chains"

type DepositPrefsState = {
  sourceChain: string | null
  sourceAssetKey: string | null
  destinationChain: DestinationChainId
  accountByChain: Partial<Record<DestinationChainId, string>>
  refundByKind: Partial<Record<RefundKind, string>>
  setSourceToken: (token: { blockchain: string; assetKey: string }) => void
  setDestinationChain: (chain: DestinationChainId) => void
  setAccount: (chain: DestinationChainId, address: string) => void
  setRefundAddress: (kind: RefundKind, address: string) => void
}

type PersistedPrefs = {
  sourceChain?: string | null
  sourceAssetKey?: string | null
  destinationChain?: DestinationChainId
  accountByChain?: Partial<Record<DestinationChainId, string>>
  refundByChain?: Record<string, string>
  refundByKind?: Partial<Record<RefundKind, string>>
}

function refundKindsFromChains(refundByChain: Record<string, string> | undefined): Partial<Record<RefundKind, string>> {
  const refundByKind: Partial<Record<RefundKind, string>> = {}
  if (!refundByChain) return refundByKind
  for (const code of DEPOSIT_CHAINS) {
    const address = refundByChain[code]?.trim()
    const kind = chainKind(code)
    if (!address || kind === "other" || refundByKind[kind]) continue
    refundByKind[kind] = address
  }
  return refundByKind
}

export const useDepositPrefs = create<DepositPrefsState>()(
  persist(
    (set) => ({
      sourceChain: null,
      sourceAssetKey: null,
      destinationChain: "sol",
      accountByChain: {},
      refundByKind: {},
      setSourceToken: (token) => set({
        sourceChain: token.blockchain,
        sourceAssetKey: token.assetKey,
      }),
      setDestinationChain: (destinationChain) => set({ destinationChain }),
      setAccount: (chain, address) => set((state) => ({
        accountByChain: { ...state.accountByChain, [chain]: address },
      })),
      setRefundAddress: (kind, address) => set((state) => ({
        refundByKind: { ...state.refundByKind, [kind]: address },
      })),
    }),
    {
      name: "sigma.deposit-prefs",
      version: 1,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as PersistedPrefs
        return {
          sourceChain: state.sourceChain ?? null,
          sourceAssetKey: state.sourceAssetKey ?? null,
          destinationChain: state.destinationChain ?? "sol",
          accountByChain: state.accountByChain ?? {},
          refundByKind: state.refundByKind ?? refundKindsFromChains(state.refundByChain),
        }
      },
    },
  ),
)
