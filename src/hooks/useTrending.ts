import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTrending, type NetworkId } from "@/lib/gt";
import type { TrendingPool } from "@/lib/types";

type State = {
  pools: TrendingPool[];
  loading: boolean;
  error: string | null;
  refreshedAt: number | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LS_PREFIX = "trial.trending.";

function readSnapshot(network: NetworkId): { pools: TrendingPool[]; refreshedAt: number } | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + network);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { pools: TrendingPool[]; refreshedAt: number };
    return Array.isArray(parsed.pools) && parsed.pools.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeSnapshot(network: NetworkId, pools: TrendingPool[], refreshedAt: number) {
  try {
    localStorage.setItem(LS_PREFIX + network, JSON.stringify({ pools, refreshedAt }));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

/**
 * Live trending pools with:
 *  - automatic retry + exponential backoff (the public API is rate limited),
 *  - previous data kept on screen while refreshing,
 *  - a localStorage snapshot so revisits paint instantly even when the API
 *    is temporarily rate limiting,
 *  - a minimum skeleton duration on first load so the table never flashes
 *    an empty/blank state.
 */
export function useTrending(network: NetworkId, refreshMs = 60_000) {
  const [state, setState] = useState<State>(() => {
    const snap = readSnapshot(network);
    return snap
      ? { pools: snap.pools, loading: false, error: null, refreshedAt: snap.refreshedAt }
      : { pools: [], loading: true, error: null, refreshedAt: null };
  });
  const seq = useRef(0);
  const hasData = useRef(false);
  const retry = useRef(0);

  useEffect(() => {
    hasData.current = false;
    // Switching chains paints that chain's last snapshot immediately.
    const snap = readSnapshot(network);
    if (snap) {
      hasData.current = true;
      setState({ pools: snap.pools, loading: false, error: null, refreshedAt: snap.refreshedAt });
    } else {
      setState({ pools: [], loading: true, error: null, refreshedAt: null });
    }
  }, [network]);

  const load = useCallback(async () => {
    const id = ++seq.current;
    const started = Date.now();
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const pools = await fetchTrending(network);
      if (id !== seq.current) return;
      if (!hasData.current) {
        const elapsed = Date.now() - started;
        if (elapsed < 600) await sleep(600 - elapsed);
        if (id !== seq.current) return;
      }
      hasData.current = true;
      retry.current = 0;
      const refreshedAt = Date.now();
      writeSnapshot(network, pools, refreshedAt);
      setState({ pools, loading: false, error: null, refreshedAt });
    } catch (e) {
      if (id !== seq.current) return;
      const msg = e instanceof Error ? e.message : "unknown";
      retry.current = Math.min(retry.current + 1, 6);
      setState((s) => ({
        ...s,
        loading: false,
        // With cached rows on screen, stay quiet — the retry is automatic.
        error:
          s.pools.length > 0
            ? null
            : msg === "RATE_LIMIT"
              ? "Data source rate limit reached — retrying automatically…"
              : "Couldn't reach the live data source — retrying…",
      }));
      const backoff = Math.min(3000 * 2 ** (retry.current - 1), 60_000);
      await sleep(backoff);
      if (id === seq.current) void load();
    }
  }, [network]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(), refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  return { ...state, reload: load };
}
