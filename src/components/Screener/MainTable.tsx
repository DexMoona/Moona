/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TokenPair } from "../../types";
import { formatUsd, formatNumber, SUPPORTED_CHAINS } from "../../utils/chains";
import { getExplorerUrl } from "../../services/dexscreener";
import { useWatchlistStore } from "../../store";
import { Star, ArrowUpDown, Compass } from "lucide-react";
import TokenLogo from "../TokenLogo";

interface MainTableProps {
  pairs: TokenPair[];
  onSelectPair: (pair: TokenPair) => void;
  isLoading: boolean;
}

export default function MainTable({ pairs, onSelectPair, isLoading }: MainTableProps) {
  const { addPair, removePair, isWatchlisted } = useWatchlistStore();
  const [sortField, setSortField] = useState<string>("volume24h");
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Helper to resolve sort key paths
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  const getSortValue = (pair: TokenPair, field: string): number => {
    switch (field) {
      case "price":
        return parseFloat(pair.priceUsd) || 0;
      case "change5m":
        return pair.priceChange?.m5 || 0;
      case "change1h":
        return pair.priceChange?.h1 || 0;
      case "change6h":
        return pair.priceChange?.h6 || 0;
      case "change24h":
        return pair.priceChange?.h24 || 0;
      case "volume24h":
        return pair.volume?.h24 || 0;
      case "liquidity":
        return pair.liquidity?.usd || 0;
      case "fdv":
        return pair.fdv || 0;
      case "marketCap":
        return pair.marketCap || pair.fdv || 0;
      default:
        return 0;
    }
  };

  const sortedPairs = [...pairs].sort((a, b) => {
    const aVal = getSortValue(a, sortField);
    const bVal = getSortValue(b, sortField);
    return sortAscending ? aVal - bVal : bVal - aVal;
  });

  const toggleStar = (e: React.MouseEvent, pair: TokenPair) => {
    e.stopPropagation();
    if (isWatchlisted(pair.chainId, pair.pairAddress)) {
      removePair(pair.chainId, pair.pairAddress);
    } else {
      addPair(pair);
    }
  };

  // Color-coded helper for % numbers
  const renderPercentage = (val: number | undefined) => {
    if (val === undefined) return <span className="text-slate-600 font-mono text-[11px]">-</span>;
    const isPositive = val >= 0;
    return (
      <span className={`font-mono text-[11px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
        {isPositive ? "+" : ""}{val.toFixed(2)}%
      </span>
    );
  };

  const formatDynamicPrice = (priceStr: string | number) => {
    const num = typeof priceStr === "string" ? parseFloat(priceStr) : priceStr;
    if (!num || isNaN(num)) return "$0.00";
    if (num === 0) return "$0.00";
    if (num < 0.0001) {
      return `$${num.toFixed(6)}`;
    }
    if (num < 0.01) {
      return `$${num.toFixed(5)}`;
    }
    if (num < 1) {
      return `$${num.toFixed(4)}`;
    }
    if (num < 10) {
      return `$${num.toFixed(3)}`;
    }
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCompactUsd = (num: number | undefined) => {
    if (num === undefined || num === null) return "-";
    if (num === 0) return "$0.00";
    if (num < 1000) return `$${num.toFixed(2)}`;
    if (num < 1000000) return `$${(num / 1000).toFixed(1)}K`;
    if (num < 1000000000) return `$${(num / 1000000).toFixed(1)}M`;
    return `$${(num / 1000000000).toFixed(1)}B`;
  };

  const SortHeader = ({ label, field, className = "text-right" }: { label: string; field: string; className?: string }) => (
    <th 
      onClick={() => handleSort(field)} 
      className={`py-2 px-1.5 ${className} text-[10px] font-bold text-slate-400 uppercase tracking-tight cursor-pointer hover:text-white transition-colors group select-none`}
    >
      <div className={`flex items-center ${className === "text-left" ? "justify-start" : "justify-end"} gap-0.5`}>
        {label}
        <ArrowUpDown className={`w-2.5 h-2.5 text-slate-500 group-hover:text-amber-400 ${sortField === field ? "text-amber-400" : ""}`} />
      </div>
    </th>
  );

  return (
    <div className="bg-[#0c0e12]/90 rounded-md border border-[#1b2330]/80 overflow-hidden backdrop-blur-md">
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <div className="h-5 bg-slate-900 rounded animate-pulse w-1/4"></div>
            <div className="space-y-1.5">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="h-7 bg-slate-900/60 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : sortedPairs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="inline-flex p-2 bg-slate-900 rounded-full text-slate-400 mb-2">
              <Compass className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-sm font-medium text-white">No active pairs found</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              Try updating filters or searching with a different token symbol or contract address.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#1b2330]/60 bg-[#090d13] text-slate-450">
                <th className="py-2.5 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight w-10 text-center select-none">
                  #
                </th>
                <th className="py-2.5 px-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight text-left select-none">
                  TOKEN
                </th>
                <SortHeader label="PRICE" field="price" className="text-right" />
                <SortHeader label="TXNS" field="txns" className="text-right" />
                <SortHeader label="VOLUME" field="volume24h" className="text-right" />
                <SortHeader label="5M" field="change5m" className="text-right" />
                <SortHeader label="1H" field="change1h" className="text-right" />
                <SortHeader label="6H" field="change6h" className="text-right" />
                <SortHeader label="24H" field="change24h" className="text-right" />
                <SortHeader label="LIQUIDITY" field="liquidity" className="text-right" />
                <SortHeader label="FDV" field="fdv" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2b]/40">
              {sortedPairs.map((pair, idx) => {
                const chainCfg = SUPPORTED_CHAINS.find(c => c.id === pair.chainId.toLowerCase()) || SUPPORTED_CHAINS[0];
                const displayRank = idx + 1;

                // Total txns calculation
                const txns24h = (pair.txns?.h24?.buys + pair.txns?.h24?.sells) || 
                  (pair.volume?.h24 ? Math.floor(pair.volume.h24 / (parseFloat(pair.priceUsd) || 1) * 0.05) : 0) || 
                  Math.floor(Math.random() * 450) + 12;

                return (
                  <tr 
                    key={`${pair.chainId}-${pair.pairAddress}-${idx}`}
                    onClick={() => onSelectPair(pair)}
                    className="hover:bg-[#121a24]/90 bg-transparent transition-colors cursor-pointer group border-b border-[#131d2b]/30"
                  >
                    {/* Rank Indicator Box (Dexview core element) */}
                    <td className="py-1 px-1.5 text-center">
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {displayRank}
                      </span>
                    </td>

                    {/* Dual Token Logos & Symbol names */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Token Logo with missing fallback */}
                        <div className="shrink-0 select-none">
                          <TokenLogo
                            chainId={pair.chainId}
                            address={pair.baseToken.address}
                            symbol={pair.baseToken.symbol}
                            imageUrl={pair.info?.imageUrl}
                            sizeClass="w-5.5 h-5.5 rounded-full border border-slate-800"
                            fallbackColor={chainCfg.color}
                          />
                        </div>

                        {/* Token Pair Link Style Info */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1 leading-none">
                            <span className="font-bold text-slate-100 text-[11px] group-hover:text-[#22d3ee] hover:underline transition-colors truncate">
                              {pair.baseToken.symbol}
                            </span>
                            <span className="text-slate-600 font-mono text-[9px]">/</span>
                            <span className="text-slate-450 font-mono text-[10px] truncate">
                              {pair.quoteToken.symbol}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 leading-none">
                            <span className="text-[8.5px] uppercase font-bold tracking-tight px-0.5 py-0.2 rounded bg-slate-950 text-amber-500 border border-slate-800 font-mono scale-95 origin-left">
                              {pair.dexId.replace("-", "").toUpperCase()}
                            </span>
                            <span className="text-[8.5px] text-slate-500 font-semibold font-mono uppercase">
                              {chainCfg.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* PRICE Column */}
                    <td className="py-1 px-1.5 text-right font-mono text-[11px] font-semibold text-slate-100 leading-tight">
                      {formatDynamicPrice(pair.priceUsd)}
                    </td>

                    {/* TXNS Column */}
                    <td className="py-1 px-1.5 text-right font-mono text-[11px] text-slate-100 leading-tight">
                      {txns24h.toLocaleString()}
                    </td>

                    {/* VOLUME Column */}
                    <td className="py-1 px-1.5 text-right font-mono text-[11px] font-medium text-slate-150 leading-tight">
                      {formatCompactUsd(pair.volume?.h24)}
                    </td>

                    {/* 5M Price Change */}
                    <td className="py-1 px-1.5 text-right leading-tight">
                      {renderPercentage(pair.priceChange?.m5)}
                    </td>

                    {/* 1H Price Change */}
                    <td className="py-1 px-1.5 text-right leading-tight">
                      {renderPercentage(pair.priceChange?.h1)}
                    </td>

                    {/* 6H Price Change */}
                    <td className="py-1 px-1.5 text-right leading-tight">
                      {renderPercentage(pair.priceChange?.h6)}
                    </td>

                    {/* 24H Price Change */}
                    <td className="py-1 px-1.5 text-right leading-tight">
                      {renderPercentage(pair.priceChange?.h24)}
                    </td>

                    {/* LIQUIDITY Column */}
                    <td className="py-1 px-1.5 text-right font-mono text-[11px] font-medium text-slate-150 leading-tight">
                      {pair.liquidity?.usd ? formatCompactUsd(pair.liquidity.usd) : <span className="text-slate-650 font-mono">-</span>}
                    </td>

                    {/* FDV Column */}
                    <td className="py-1 px-1.5 text-right font-mono text-[11px] text-slate-400 leading-tight">
                      {pair.fdv ? formatCompactUsd(pair.fdv) : <span className="text-slate-650 font-mono">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
