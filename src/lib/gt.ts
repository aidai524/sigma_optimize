// GeckoTerminal public API client.
// Free tier is rate limited (~30 req/min), so every response is cached and
// all requests go through a small concurrency queue. Per-row sparkline fetches
// are additionally lazy (only when a row scrolls into view).
import type { OhlcvCandle, TrendingPool } from "./types";

const BASE = "https://api.geckoterminal.com/api/v2";

type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();

const TTL_MS = 45_000;

function getCached<T>(key: string, ttl = TTL_MS): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > ttl) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function setCached(key: string, value: unknown) {
  cache.set(key, { at: Date.now(), value });
}

// --- tiny concurrency queue -------------------------------------------------
const MAX_CONCURRENT = 2;
let active = 0;
const waiting: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  active -= 1;
  const next = waiting.shift();
  if (next) {
    active += 1;
    next();
  }
}

async function request<T>(path: string, ttl = TTL_MS): Promise<T> {
  const cached = getCached<T>(path, ttl);
  if (cached) return cached;

  await acquire();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    const json = (await res.json()) as T;
    setCached(path, json);
    return json;
  } catch (e) {
    // The free API rate-limits aggressively; fall back to a stale cached
    // response rather than failing the UI outright.
    const stale = cache.get(path);
    if (stale) return stale.value as T;
    throw e;
  } finally {
    release();
  }
}

// --- networks ---------------------------------------------------------------
export const NETWORKS = [
  { id: "solana", label: "Solana" },
  { id: "base", label: "Base" },
  { id: "eth", label: "Ethereum" },
  { id: "bsc", label: "BNB" },
] as const;

export type NetworkId = (typeof NETWORKS)[number]["id"];

// --- normalised models ------------------------------------------------------
export function normalizePool(raw: GtPool, images?: Map<string, string>): TrendingPool {
  const a = raw.attributes;
  const [baseSymbol, quoteSymbol] = a.name.split("/").map((s) => s.trim());
  const network = raw.id.split("_")[0] ?? "";
  const baseTokenId = raw.relationships?.base_token?.data?.id ?? "";
  return {
    id: raw.id,
    network,
    poolAddress: a.address,
    baseTokenAddress: baseTokenId.includes("_") ? baseTokenId.split("_").slice(1).join("_") : baseTokenId,
    symbol: baseSymbol || a.name,
    imageUrl: (baseTokenId && images?.get(baseTokenId)) || "",
    pairLabel: quoteSymbol ? `${baseSymbol} / ${quoteSymbol}` : a.name,
    priceUsd: num(a.base_token_price_usd),
    fdvUsd: num(a.fdv_usd),
    marketCapUsd: num(a.market_cap_usd),
    liquidityUsd: num(a.reserve_in_usd),
    createdAt: a.pool_created_at,
    dex: raw.relationships?.dex?.data?.id ?? "",
    change: {
      m5: num(a.price_change_percentage?.m5),
      m15: num(a.price_change_percentage?.m15),
      m30: num(a.price_change_percentage?.m30),
      h1: num(a.price_change_percentage?.h1),
      h6: num(a.price_change_percentage?.h6),
      h24: num(a.price_change_percentage?.h24),
    },
    volume: {
      m5: num(a.volume_usd?.m5),
      h1: num(a.volume_usd?.h1),
      h6: num(a.volume_usd?.h6),
      h24: num(a.volume_usd?.h24),
    },
    txns: {
      m5: pickTxns(a.transactions?.m5),
      h1: pickTxns(a.transactions?.h1),
      h6: pickTxns(a.transactions?.h6),
      h24: pickTxns(a.transactions?.h24),
    },
  };
}

function pickTxns(t?: GtTxns): TrendingPool["txns"]["m5"] {
  return {
    buys: t?.buys ?? 0,
    sells: t?.sells ?? 0,
    buyers: t?.buyers ?? 0,
    sellers: t?.sellers ?? 0,
  };
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function fetchTrending(network: NetworkId, page = 1): Promise<TrendingPool[]> {
  // include=base_token adds each token's image_url at zero extra request cost.
  const path = `/networks/${network}/trending_pools?page=${page}&include=base_token`;
  const json = await request<{ data: GtPool[]; included?: GtIncluded[] }>(path);
  const images = new Map<string, string>();
  for (const inc of json.included ?? []) {
    if (inc.type === "token" && inc.attributes?.image_url) {
      images.set(inc.id, inc.attributes.image_url);
    }
  }
  return (json.data ?? []).map((raw) => normalizePool(raw, images));
}

export type WindowKey = "m5" | "h1" | "h6" | "h24";

const SPARK_CONFIG: Record<WindowKey, { tf: string; aggregate: number; limit: number }> = {
  m5: { tf: "minute", aggregate: 5, limit: 48 },
  h1: { tf: "minute", aggregate: 1, limit: 60 },
  h6: { tf: "minute", aggregate: 5, limit: 72 },
  h24: { tf: "hour", aggregate: 1, limit: 24 },
};

export async function fetchSparkline(
  network: string,
  poolAddress: string,
  window: WindowKey,
): Promise<OhlcvCandle[]> {
  const cfg = SPARK_CONFIG[window];
  const path = `/networks/${network}/pools/${poolAddress}/ohlcv/${cfg.tf}?aggregate=${cfg.aggregate}&limit=${cfg.limit}`;
  const json = await request<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(path, 300_000);
  const list = json.data?.attributes?.ohlcv_list ?? [];
  return list.map((c) => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] }));
}

// --- raw API shapes ---------------------------------------------------------
type GtTxns = { buys?: number; sells?: number; buyers?: number; sellers?: number };

type GtIncluded = {
  id: string;
  type: string;
  attributes?: { image_url?: string };
};

type GtPool = {
  id: string;
  attributes: {
    address: string;
    name: string;
    base_token_price_usd: string;
    pool_created_at: string;
    fdv_usd: string;
    market_cap_usd: string;
    reserve_in_usd: string;
    price_change_percentage?: Record<string, string>;
    volume_usd?: Record<string, string>;
    transactions?: Record<string, GtTxns>;
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
    dex?: { data?: { id?: string } };
  };
};
