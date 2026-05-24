/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityAudit, SwapTransaction, HolderInfo, TokenHolding, WalletTraceTrade } from "../types";

export interface ChainConfig {
  id: string;
  name: string;
  symbol: string;
  color: string;
  bgClass: string;
  borderClass: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  { id: "ethereum", name: "Ethereum", symbol: "ETH", color: "#627EEA", bgClass: "bg-blue-950/40", borderClass: "border-blue-550/30" },
  { id: "bsc", name: "BNB Chain", symbol: "BNB", color: "#F3BA2F", bgClass: "bg-amber-950/40", borderClass: "border-amber-500/30" },
  { id: "solana", name: "Solana", symbol: "SOL", color: "#14F195", bgClass: "bg-emerald-950/40", borderClass: "border-emerald-500/30" },
  { id: "base", name: "Base", symbol: "BASE", color: "#0052FF", bgClass: "bg-sky-950/40", borderClass: "border-sky-500/30" },
  { id: "arbitrum", name: "Arbitrum", symbol: "ARB", color: "#28A0F0", bgClass: "bg-cyan-950/40", borderClass: "border-cyan-500/30" },
  { id: "polygon", name: "Polygon", symbol: "POL", color: "#8247E5", bgClass: "bg-purple-950/40", borderClass: "border-purple-500/30" },
  { id: "avalanche", name: "Avalanche", symbol: "AVAX", color: "#E84142", bgClass: "bg-red-950/40", borderClass: "border-red-550/30" },
  { id: "sui", name: "Sui", symbol: "SUI", color: "#6FBCDF", bgClass: "bg-teal-950/40", borderClass: "border-teal-500/30" },
  { id: "tron", name: "Tron", symbol: "TRX", color: "#EC0928", bgClass: "bg-red-950/40", borderClass: "border-red-400/30" },
  { id: "ton", name: "Toncoin", symbol: "TON", color: "#0098EA", bgClass: "bg-blue-950/40", borderClass: "border-blue-500/30" },
  { id: "blast", name: "Blast", symbol: "BLAST", color: "#FCFC03", bgClass: "bg-yellow-950/45", borderClass: "border-yellow-500/35" }
];

// Helper to format currency
export function formatUsd(val: number | string | undefined): string {
  if (val === undefined || val === null) return "$0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";

  if (num === 0) return "$0.00";

  // Scientific notation and extremely small tokens
  if (num < 0.0001) {
    // Show up to 8 decimals or standard decimal format with small numbers
    const fixed = num.toFixed(8);
    // Trim trailing zeros after the 4th decimal, but keep at least 6
    return `$${fixed}`;
  }

  if (num < 1) {
    return `$${num.toFixed(4)}`;
  }

  if (num < 1000) {
    return `$${num.toFixed(2)}`;
  }

  if (num < 1000000) {
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;
  }

  if (num < 1000000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }

  return `$${(num / 1000000000).toFixed(2)}B`;
}

// Format volume, liquidity, counts
export function formatNumber(val: number | string | undefined): string {
  if (val === undefined || val === null) return "0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0";

  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

// Convert address to safe truncated string
export function truncateAddress(address: string): string {
  if (!address) return "0x00...000";
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Generate deterministic GoPlus Safety Audit Score based on Token Contract address
export function getSecurityAudit(address: string): SecurityAudit {
  // Use character codes of address to determine states deterministically
  let sum = 0;
  for (let i = 0; i < address.length; i++) {
    sum += address.charCodeAt(i);
  }

  const isOpenSource = sum % 9 !== 0; // 88% chance open source
  const isHoneypot = sum % 37 === 0;  // Very low chance of honeypot
  const canSell = !isHoneypot && (sum % 23 !== 0);
  const buyTax = sum % 13 === 0 ? "5%" : sum % 19 === 0 ? "3%" : "0%";
  const sellTax = sum % 13 === 0 ? "5%" : sum % 17 === 0 ? "3%" : "0%";
  const isBlacklisted = sum % 71 === 0;
  const isRenounced = sum % 5 !== 0;   // 80% change ownership renounced
  const lockedPercent = 80 + (sum % 21); // 80 - 100% locked
  const isLiquidityLocked = lockedPercent > 85;

  let safetyScore = 100;
  if (!isOpenSource) safetyScore -= 30;
  if (isHoneypot) safetyScore -= 60;
  if (!canSell) safetyScore -= 40;
  if (isBlacklisted) safetyScore -= 20;
  if (!isRenounced) safetyScore -= 15;
  if (!isLiquidityLocked) safetyScore -= 20;

  return {
    isOpenSource,
    isHoneypot,
    buyTax,
    sellTax,
    cannotSell: !canSell,
    isBlacklisted,
    isRenounced,
    isLiquidityLocked,
    lockedPercent,
    safetyScore: Math.max(10, Math.min(100, safetyScore))
  };
}

// Deterministically generate top holders list
export function getTopHolders(address: string): HolderInfo[] {
  let sum = 0;
  for (let i = 0; i < address.length; i++) {
    sum += address.charCodeAt(i);
  }

  const list: HolderInfo[] = [];
  let remaining = 100;

  // Generate 6-8 holders
  const count = 6 + (sum % 3);
  const names = [
    "Uniswap Pool Contract",
    "PancakeSwap Liquidity",
    "Raydium AMM Authority",
    "Developer Wallet (Multi-Sig)",
    "Binance Exchange Hot Wallet",
    "Early Seed Investor 1",
    "Early Seed Investor 2",
    "Community Staking Contract",
    "MEV Bot Liquidator"
  ];

  for (let i = 0; i < count; i++) {
    const isContract = i < 3;
    let share = 0;
    if (i === 0) share = 25 + (sum % 15); // AMM pool holds considerable amount
    else if (i === 1) share = 10 + (sum % 10);
    else share = Math.min(remaining / 2, Math.floor(1 + Math.random() * 5));

    share = Math.min(share, remaining);
    remaining -= share;

    const mockAddr = `0x${address.substring(2, 6)}${(sum + i * 179).toString(16)}...${(sum * i + 83).toString(16)}`;

    list.push({
      address: isContract ? names[i] : mockAddr,
      balance: formatNumber(10000000 * (share / 100)),
      percentage: Number(share.toFixed(2)),
      isContract
    });

    if (remaining <= 0) break;
  }

  // Add individual investor details at the end if space remaining
  if (remaining > 0) {
    list.push({
      address: "Public Float / Small Holders",
      balance: formatNumber(10000000 * (remaining / 100)),
      percentage: Number(remaining.toFixed(2)),
      isContract: false
    });
  }

  return list.sort((a, b) => b.percentage - a.percentage);
}

// Generate continuous real-time trades stream
export function createNewSwapTransaction(baseSymbol: string, currentPrice: number): SwapTransaction {
  const isBuy = Math.random() > 0.45; // slightly skewed towards buys
  const sizeMultiplier = Math.random();
  let usdAmount = 50 + (sizeMultiplier * sizeMultiplier * 25000); // realistic distribution of sizes
  
  // Whales occasionally
  if (Math.random() > 0.98) {
    usdAmount = 45000 + Math.random() * 80000;
  }

  const tokenAmount = usdAmount / currentPrice;
  const priceImpact = Math.min(0.2, (usdAmount / 150000) * (0.8 + Math.random() * 0.4)); // proportional to size

  // Random wallet
  const hexPart = Math.floor(Math.random() * 16777215).toString(16);
  const walletAddress = `0x${hexPart}...${hexPart.substring(hexPart.length - 4)}`;

  return {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    type: isBuy ? "buy" : "sell",
    usdAmount,
    tokenAmount,
    priceUsd: isBuy ? currentPrice * (1 + priceImpact * 0.1) : currentPrice * (1 - priceImpact * 0.1),
    walletAddress,
    priceImpact
  };
}

// Generate custom wallet holdings (ETH/BSC/SOL addresses are supported)
export function getWalletHoldings(address: string): TokenHolding[] {
  // Generate deterministic assets based on wallet address
  let sum = 0;
  const cleanAddr = address.toLowerCase();
  for (let i = 0; i < cleanAddr.length; i++) {
    sum += cleanAddr.charCodeAt(i);
  }

  const isSolana = address.length > 40 && !address.startsWith("0x");
  const chain = isSolana ? "solana" : (sum % 2 === 0 ? "ethereum" : "bsc");

  const templates = [
    { symbol: "USDT", name: "Tether USD", price: 1.00, bal: 500 + (sum % 9500), change: 0.01 },
    { symbol: "WETH", name: "Wrapped Ether", price: 3450, bal: 0.5 + (sum % 5), change: 3.2 },
    { symbol: "SAND", name: "The Sandbox", price: 0.42, bal: 1000 + (sum % 10000), change: -4.5 },
    { symbol: "PEPE", name: "Pepe Coin", price: 0.00001423, bal: 154000000 + (sum % 1800000000), change: 18.2 },
    { symbol: "SOL", name: "Solana", price: 184.2, bal: 2 + (sum % 40), change: 5.4 },
    { symbol: "DOGE", name: "Dogecoin", price: 0.154, bal: 400 + (sum % 6000), change: -1.2 },
    { symbol: "SHIB", name: "Shiba Inu", price: 0.000025, bal: 12000000 + (sum % 45000000), change: 8.7 },
  ];

  // Select 3 to 5 holdings based on wallet
  const holdingsCount = 3 + (sum % 3);
  const selected: TokenHolding[] = [];

  for (let i = 0; i < holdingsCount; i++) {
    const templateIdx = (sum + i * 3) % templates.length;
    const item = templates[templateIdx];
    
    // Check duplicates
    if (selected.some(s => s.symbol === item.symbol)) continue;

    const finalPrice = item.price * (0.9 + (sum % 20) / 100);
    const balance = item.bal * (0.8 + (sum % 5) / 10);
    const valueUsd = balance * finalPrice;

    selected.push({
      id: `${chain}-${item.symbol}`,
      chainId: chain,
      address: `0x${(sum + i).toString(16)}...token`,
      name: item.name,
      symbol: item.symbol,
      balance,
      priceUsd: finalPrice,
      valueUsd,
      change24h: item.change
    });
  }

  return selected;
}

// Generate wallet trading timeline history
export function getWalletTradeHistory(address: string): WalletTraceTrade[] {
  let sum = 0;
  for (let i = 0; i < address.length; i++) {
    sum += address.charCodeAt(i);
  }

  const tradeList: WalletTraceTrade[] = [];
  const assets = [
    { symbol: "MUNACHI", name: "Munachi Token", price: 0.005, pnl: 450 },
    { symbol: "PEPE", name: "Pepe Coin", price: 0.000014, pnl: -120 },
    { symbol: "POPCAT", name: "Popcat Solana", price: 1.45, pnl: 1800 },
    { symbol: "WIF", name: "dogwifhat", price: 2.84, pnl: 890 },
    { symbol: "BONK", name: "Bonk", price: 0.000028, pnl: -40 }
  ];

  for (let i = 0; i < 5 + (sum % 4); i++) {
    const asset = assets[(sum + i) % assets.length];
    const isBuy = (sum + i * 3) % 2 === 0;
    const amountUsd = 100 + ((sum * i) % 4900);
    const priceUsd = asset.price * (0.95 + (Math.random() * 0.1));
    const amountToken = amountUsd / priceUsd;

    tradeList.push({
      id: `wtrade-${i}-${Math.random()}`,
      timestamp: Date.now() - (i * 2.5 * 3600 * 1000) - (Math.random() * 1800 * 1000),
      chainId: sum % 2 === 0 ? "ethereum" : "solana",
      pairAddress: `0x${(sum * i).toString(16)}...pair`,
      tokenName: asset.name,
      tokenSymbol: asset.symbol,
      type: isBuy ? "buy" : "sell",
      amountToken,
      amountUsd,
      priceUsd,
      pnl: isBuy ? undefined : asset.pnl * (amountUsd / 2000)
    });
  }

  return tradeList.sort((a, b) => b.timestamp - a.timestamp);
}
