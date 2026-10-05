export type PoolTxns = {
  buys: number;
  sells: number;
  buyers: number;
  sellers: number;
};

export type TrendingPool = {
  id: string;
  network: string;
  poolAddress: string;
  baseTokenAddress: string;
  symbol: string;
  imageUrl: string;
  pairLabel: string;
  priceUsd: number;
  fdvUsd: number;
  marketCapUsd: number;
  liquidityUsd: number;
  createdAt: string;
  dex: string;
  change: { m5: number; m15: number; m30: number; h1: number; h6: number; h24: number };
  volume: { m5: number; h1: number; h6: number; h24: number };
  txns: { m5: PoolTxns; h1: PoolTxns; h6: PoolTxns; h24: PoolTxns };
};

export type OhlcvCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};
