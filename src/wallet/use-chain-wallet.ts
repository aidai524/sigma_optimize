import { useEffect, useMemo, useRef, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base"
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi"
import { chainKind } from "@/lib/chains"

export type WalletChoice = { id: string; name: string }

export function useChainWallet() {
  const evm = useEvmWallet()
  const solana = useSolanaWallet()

  async function connect(blockchain: string, id?: string): Promise<WalletChoice[] | null> {
    if (chainKind(blockchain) === "solana") return solana.connect(id)
    return evm.connect(id)
  }

  function disconnect(blockchain: string) {
    if (chainKind(blockchain) === "solana") solana.disconnect()
    else evm.disconnect()
  }

  function addressFor(blockchain: string): string | null {
    if (chainKind(blockchain) === "solana") return solana.address
    if (chainKind(blockchain) === "evm") return evm.address
    return null
  }

  return {
    addressFor,
    connect,
    disconnect,
    solanaAddress: solana.address,
    evmAddress: evm.address,
    signTransaction: solana.signTransaction,
    connectError: solana.connectError,
    clearConnectError: solana.clearConnectError,
  }
}

function useEvmWallet() {
  const { address, isConnected } = useAccount()
  const connectors = useConnectors()
  const { connectAsync } = useConnect()
  const { disconnect } = useDisconnect()
  const choices = useMemo(() => {
    const injected = connectors.filter((connector) => connector.type === "injected")
    const announced = injected.filter((connector) => connector.id !== "injected")
    const list = announced.length > 0 ? announced : injected
    return list.map((connector) => ({ id: connector.id, name: connector.name }))
  }, [connectors])

  async function connect(id?: string): Promise<WalletChoice[] | null> {
    const target = id ? choices.find((choice) => choice.id === id) : choices.length === 1 ? choices[0] : undefined
    if (!target) return choices
    const connector = connectors.find((item) => item.id === target.id)
    if (!connector) return choices
    await connectAsync({ connector })
    return null
  }

  return {
    address: isConnected ? address ?? null : null,
    choices,
    connect,
    disconnect: () => disconnect(),
  }
}

function useSolanaWallet() {
  const { wallets, wallet, publicKey, connected, connecting, select, connect, disconnect, signTransaction } = useWallet()
  const pending = useRef(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const choices = useMemo(() => {
    const installed = wallets.filter((item) => item.readyState === WalletReadyState.Installed)
    const list = installed.length > 0 ? installed : wallets
    return list.map((item) => ({ id: item.adapter.name, name: item.adapter.name }))
  }, [wallets])

  useEffect(() => {
    if (!pending.current || !wallet || connected || connecting) return
    pending.current = false
    void connect().catch((caught: unknown) => {
      setConnectError(caught instanceof Error && caught.message.trim() ? caught.message : "Could not connect wallet")
    })
  }, [wallet, connected, connecting, connect])

  function connectWallet(id?: string): WalletChoice[] | null {
    const target = id ? choices.find((choice) => choice.id === id) : choices.length === 1 ? choices[0] : undefined
    if (!target) return choices
    setConnectError(null)
    if (wallet?.adapter.name === target.id) {
      void connect().catch((caught: unknown) => {
        setConnectError(caught instanceof Error && caught.message.trim() ? caught.message : "Could not connect wallet")
      })
      return null
    }
    pending.current = true
    select(target.id as WalletName)
    return null
  }

  return {
    address: connected ? publicKey?.toBase58() ?? null : null,
    choices,
    connect: connectWallet,
    disconnect: () => disconnect(),
    signTransaction,
    connectError,
    clearConnectError: () => setConnectError(null),
  }
}
