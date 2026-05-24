/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Token {
  address: string;
  name: string;
  symbol: string;
}

export interface PairTxns {
  buys: number;
  sells: number;
}

export interface PairPeriodStats<T> {
  m5?: T;
  h1?: T;
  h6?: T;
  h24?: T;
}

export interface PairLiquidity {
  usd?: number;
  base?: number;
  quote?: number;
}

export interface PairInfoLink {
  label?: string;
  type?: string;
  url: string;
}

export interface PairInfo {
  imageUrl?: string;
  header?: string;
  openGraph?: string;
  websites?: PairInfoLink[];
  socials?: PairInfoLink[];
}

export interface TokenPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: Token;
  quoteToken: Token;
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: PairTxns;
    h1: PairTxns;
    h6: PairTxns;
    h24: PairTxns;
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: PairLiquidity;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: PairInfo;
}

export interface SecurityAudit {
  isOpenSource: boolean;
  isHoneypot: boolean;
  buyTax: string; // "0%" etc.
  sellTax: string;
  cannotSell: boolean;
  isBlacklisted: boolean;
  isRenounced: boolean;
  isLiquidityLocked: boolean;
  lockedPercent: number;
  safetyScore: number; // 0-100
}

export interface SwapTransaction {
  id: string;
  timestamp: number;
  type: "buy" | "sell";
  usdAmount: number;
  tokenAmount: number;
  priceUsd: number;
  walletAddress: string;
  priceImpact: number; // e.g. 0.05 for 5%
}

export interface HolderInfo {
  address: string;
  balance: string;
  percentage: number;
  isContract: boolean;
}

export interface TokenHolding {
  id: string; // chain + address
  chainId: string;
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  change24h: number;
}

export interface WalletTraceTrade {
  id: string;
  timestamp: number;
  chainId: string;
  pairAddress: string;
  tokenName: string;
  tokenSymbol: string;
  type: "buy" | "sell";
  amountToken: number;
  amountUsd: number;
  priceUsd: number;
  pnl?: number;
}

export interface PriceAlert {
  id: string;
  pairAddress: string;
  tokenSymbol: string;
  priceUsd: number;
  condition: "above" | "below";
  targetPrice: number;
  createdAt: number;
  isTriggered: boolean;
}

export interface RefreshedPriceState {
  pairAddress: string;
  priceUsd: string;
  priceChange24h: number;
  direction: "up" | "down" | "none";
}
