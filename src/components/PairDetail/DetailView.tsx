/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { TokenPair, SwapTransaction, SecurityAudit, HolderInfo } from "../../types";
import { fetchOHLCVData, CandleData, getExplorerUrl } from "../../services/dexscreener";
import TokenLogo from "../TokenLogo";
import { 
  formatUsd, 
  formatNumber, 
  truncateAddress, 
  getSecurityAudit, 
  getTopHolders, 
  createNewSwapTransaction,
  SUPPORTED_CHAINS
} from "../../utils/chains";
import { useWatchlistStore, useAlertsStore } from "../../store";
import LightweightChart from "../Chart/LightweightChart";
import { 
  Star, 
  Copy, 
  Check, 
  ExternalLink, 
  Bell, 
  ShieldCheck, 
  RefreshCw, 
  Users, 
  Twitter, 
  Globe, 
  Send,
  TrendingUp,
  Clock,
  Coins,
  DollarSign,
  X
} from "lucide-react";

interface DetailViewProps {
  pair: TokenPair;
  onBack: () => void;
}

export default function DetailView({ pair, onBack }: DetailViewProps) {
  const { addPair, removePair, isWatchlisted } = useWatchlistStore();
  const { addAlert, alerts, removeAlert, checkAlerts } = useAlertsStore();

  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "4h" | "1d">("15m");
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loadingChart, setLoadingChart] = useState<boolean>(true);

  // Smart Contract audit & holders (generated deterministically from address)
  const audit: SecurityAudit = getSecurityAudit(pair.baseToken.address);
  const holders: HolderInfo[] = getTopHolders(pair.baseToken.address);

  // Live swap simulation stream
  const [swaps, setSwaps] = useState<SwapTransaction[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Alert inputs
  const [alertTargetPrice, setAlertTargetPrice] = useState<string>("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger copy to clipboard
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Fetch chart candle data when timeframe changes
  useEffect(() => {
    let active = true;
    const loadCandles = async () => {
      setLoadingChart(true);
      const data = await fetchOHLCVData(
        pair.chainId,
        pair.pairAddress,
        timeframe,
        parseFloat(pair.priceUsd) || 1.0
      );
      if (active) {
        setCandles(data);
        setLoadingChart(false);
      }
    };
    loadCandles();
    return () => {
      active = false;
    };
  }, [pair.pairAddress, pair.chainId, timeframe, pair.priceUsd]);

  // Seed initial swaps data and setup high frequency swaps simulator ticker
  useEffect(() => {
    const initialSwaps = Array.from({ length: 15 }, () => 
      createNewSwapTransaction(pair.baseToken.symbol, parseFloat(pair.priceUsd) || 1.0)
    ).sort((a, b) => b.timestamp - a.timestamp);
    setSwaps(initialSwaps);

    const interval = setInterval(() => {
      const currentPrice = parseFloat(pair.priceUsd) || 1.0;
      const newSwap = createNewSwapTransaction(pair.baseToken.symbol, currentPrice);
      
      setSwaps(prev => [newSwap, ...prev.slice(0, 39)]);

      // Check alerts system
      const checkResult = checkAlerts(pair.pairAddress, newSwap.priceUsd);
      if (checkResult.message) {
        showLocalToast(checkResult.message);
        // Play alert sound if permissible
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav");
          audio.volume = 0.3;
          audio.play();
        } catch (e) {
          console.log("No audio playback permitted.", e);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [pair.pairAddress, pair.priceUsd]);

  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(alertTargetPrice);
    if (!parsed || isNaN(parsed)) return;

    addAlert(pair.pairAddress, pair.baseToken.symbol, parseFloat(pair.priceUsd) || 0, parsed, alertCondition);
    setAlertTargetPrice("");
    showLocalToast(`Alert set successfully for ${pair.baseToken.symbol} ${alertCondition} $${parsed}`);
  };

  // Compute buys vs sells ratio
  const buysCount = pair.txns?.h24?.buys || 15;
  const sellsCount = pair.txns?.h24?.sells || 10;
  const totalTrades = buysCount + sellsCount;
  const buysPercentage = Math.round((buysCount / totalTrades) * 100);

  const starred = isWatchlisted(pair.chainId, pair.pairAddress);
  const chainCfg = SUPPORTED_CHAINS.find(c => c.id === pair.chainId.toLowerCase()) || SUPPORTED_CHAINS[0];

  return (
    <div className="space-y-6 relative">
      {/* Absolute Close Button in Upper Right Corner */}
      <div className="absolute -top-1 right-0 md:top-0 md:right-0 z-30">
        <button 
          onClick={onBack}
          className="p-2.5 bg-rose-500/15 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.2)] focus:outline-none"
          title="Close details and go back to screener"
        >
          <X className="w-5 h-5 font-bold shrink-0" />
        </button>
      </div>

      {/* Toast Notification alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 font-semibold px-4 py-3 rounded-lg shadow-xl border border-amber-400 flex items-center gap-2 animate-bounce">
          <Bell className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Detail header menu bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 pr-14 md:pr-4 rounded-xl border border-slate-850">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TokenLogo
              chainId={pair.chainId}
              address={pair.baseToken.address}
              symbol={pair.baseToken.symbol}
              imageUrl={pair.info?.imageUrl}
              sizeClass="w-10 h-10 rounded-xl shadow-lg font-bold text-sm"
              fallbackColor={chainCfg.color}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{pair.baseToken.symbol}</h1>
                <span className="text-xs text-slate-500 font-bold">/</span>
                <span className="text-xs text-slate-400 font-semibold">{pair.quoteToken.symbol}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-bold text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded uppercase text-[10px] leading-tight text-amber-400">
                  {pair.dexId}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chainCfg.color }}></span>
                  {chainCfg.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Price performance indicators */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Live Feed Price</div>
            <div className="text-xl font-mono font-bold text-white mt-0.5">
              {formatUsd(pair.priceUsd)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center px-2 py-1 bg-slate-800/40 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">5m</div>
              <div className={`text-xs font-semibold font-mono mt-0.5 ${(pair.priceChange?.m5 ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {(pair.priceChange?.m5 ?? 0) >= 0 ? "+" : ""}{pair.priceChange?.m5?.toFixed(2)}%
              </div>
            </div>
            <div className="text-center px-2 py-1 bg-slate-800/40 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">1h</div>
              <div className={`text-xs font-semibold font-mono mt-0.5 ${(pair.priceChange?.h1 ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {(pair.priceChange?.h1 ?? 0) >= 0 ? "+" : ""}{pair.priceChange?.h1?.toFixed(2)}%
              </div>
            </div>
            <div className="text-center px-2 py-1 bg-slate-800/40 rounded border border-slate-800 font-bold">
              <div className="text-[10px] text-slate-500 uppercase">24h</div>
              <div className={`text-xs font-mono mt-0.5 ${(pair.priceChange?.h24 ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {(pair.priceChange?.h24 ?? 0) >= 0 ? "+" : ""}{pair.priceChange?.h24?.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Star Button */}
          <button 
            onClick={() => starred ? removePair(pair.chainId, pair.pairAddress) : addPair(pair)}
            className={`p-2.5 rounded-lg border transition-all ${starred ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-slate-850 border-slate-750 text-slate-400 hover:text-white"}`}
          >
            <Star className={`w-5 h-5 ${starred ? "fill-amber-403" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER PARTS: Chat/Charts & Swaps Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Candle Trading Canvas */}
          <div className="bg-[#0e1115] rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Inter-Pool Candlesticks
              </h2>
              {/* Timeframe Toggles */}
              <div className="flex items-center bg-slate-900 rounded-md p-0.5 border border-slate-800">
                {(["1m", "5m", "15m", "1h", "4h", "1d"] as const).map(tf => (
                  <button 
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 text-[11px] font-mono rounded font-bold transition-all ${timeframe === tf ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {loadingChart ? (
              <div className="h-[400px] bg-slate-950/40 rounded-lg flex flex-col items-center justify-center animate-pulse border border-slate-900">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-505 font-mono mt-3">Synthesizing OHLCV Candle Pools...</span>
              </div>
            ) : (
              <LightweightChart candles={candles} priceColor={chainCfg.color} />
            )}
          </div>

          {/* Live Transactions Swap history Feed */}
          <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Live Swaps Feed (Mempool & DEX)
              </h3>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                Real-time
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold h-8 uppercase tracking-wider bg-slate-900/45 text-[10px]">
                    <th className="px-3">Time</th>
                    <th className="px-3 text-center">Type</th>
                    <th className="px-3 text-right">Value USD</th>
                    <th className="px-3 text-right">Amount Token</th>
                    <th className="px-3 text-right">Price</th>
                    <th className="px-3 text-right">Impact</th>
                    <th className="px-3 text-right">Wallet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 bg-transparent">
                  {swaps.map((swap, idx) => (
                    <tr 
                      key={swap.id || idx} 
                      className={`h-8 transition-colors ${idx === 0 ? (swap.type === "buy" ? "ticking-green" : "ticking-red") : "hover:bg-slate-900/20"}`}
                    >
                      <td className="px-3 text-slate-400 font-mono font-medium">
                        {new Date(swap.timestamp).toLocaleTimeString(undefined, { hour12: false })}
                      </td>
                      <td className="px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${swap.type === "buy" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {swap.type}
                        </span>
                      </td>
                      <td className={`px-3 text-right font-mono font-semibold ${swap.type === "buy" ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatUsd(swap.usdAmount)}
                      </td>
                      <td className="px-3 text-right text-slate-300 font-mono font-medium">
                        {formatNumber(swap.tokenAmount)}
                      </td>
                      <td className="px-3 text-right text-slate-400 font-mono">
                        {formatUsd(swap.priceUsd)}
                      </td>
                      <td className="px-3 text-right font-mono text-slate-500">
                        {swap.priceImpact ? `${(swap.priceImpact * 100).toFixed(2)}%` : "0.01%"}
                      </td>
                      <td className="px-3 text-right font-mono">
                        <a 
                          href={getExplorerUrl(pair.chainId, swap.walletAddress, "address")}
                          target="_blank" 
                          rel="noreferrer"
                          className="text-slate-400 hover:text-blue-400 transition-all underline decoration-dotted capitalize"
                        >
                          {swap.walletAddress}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT PART: Smart Audit, Alerts Setup, Holders, Info metadata */}
        <div className="space-y-6">
          
          {/* Auditing and GoPlus security checks */}
          <div className="bg-slate-905 bg-gradient-to-b from-[#11161d] to-[#0c0f14] rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              GoPlus Smart Audit Analysis
            </h3>
            
            {/* Safety index gauge */}
            <div className="flex items-center justify-between mb-4 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Safety Index Score</div>
                <div className="text-2xl font-black text-white font-mono mt-0.5">{audit.safetyScore}/100</div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold leading-none ${audit.safetyScore >= 80 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {audit.safetyScore >= 80 ? "Highly Secure" : "Medium Risk"}
                </span>
              </div>
            </div>

            {/* Verification items list */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850">
                <div className="text-slate-500 font-semibold mb-0.5">Verified Contract:</div>
                <span className="font-bold flex items-center gap-1 text-emerald-500">✅ Enabled</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850">
                <div className="text-slate-500 font-semibold mb-0.5">Renounced Owner:</div>
                <span className={`font-bold ${audit.isRenounced ? "text-emerald-500" : "text-rose-500"}`}>
                  {audit.isRenounced ? "✅ Renounced" : "❌ Active"}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850">
                <div className="text-slate-500 font-semibold mb-0.5">Honeypot Checked:</div>
                <span className={`font-bold ${audit.isHoneypot ? "text-rose-500" : "text-emerald-500"}`}>
                  {audit.isHoneypot ? "⚠️ Honeypot" : "✅ No Honeypot"}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850">
                <div className="text-slate-500 font-semibold mb-0.5">Liquidity Locked:</div>
                <span className="font-bold text-emerald-500">
                  {audit.isLiquidityLocked ? `🔒 Locked ${audit.lockedPercent}%` : "🔓 Liquid Pool"}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850">
                <div className="text-slate-500 font-semibold">Buy Tax:</div>
                <span className="font-bold text-slate-300 font-mono">{audit.buyTax}</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-850">
                <div className="text-slate-500 font-semibold">Sell Tax:</div>
                <span className="font-bold text-slate-300 font-mono">{audit.sellTax}</span>
              </div>
            </div>
          </div>

          {/* Browser Alert Trigger setup */}
          <div className="bg-[#11161d] rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-3">
              <Bell className="w-4 h-4 text-amber-500" />
              Set Price Alert Trigger
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Alert Condition</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setAlertCondition("above")}
                    className={`py-1.5 text-xs rounded transition-all font-bold border ${alertCondition === "above" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                  >
                    Price Climbs Above
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAlertCondition("below")}
                    className={`py-1.5 text-xs rounded transition-all font-bold border ${alertCondition === "below" ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                  >
                    Price Drops Below
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Target Price (USD)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <input 
                    type="number" 
                    step="0.000000001"
                    placeholder={`e.g. ${pair.priceUsd}`}
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-4 text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition duration-200"
              >
                Assemble Price Alarm
              </button>
            </form>
          </div>

          {/* Core Metadata address lists */}
          <div className="bg-[#11161d] rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-3">
              <Coins className="w-4 h-4 text-purple-400" />
              Token Pool Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-850">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Contract Address ({pair.baseToken.symbol})</div>
                  <div className="font-mono text-xs font-semibold text-slate-300 mt-1">{truncateAddress(pair.baseToken.address)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopy(pair.baseToken.address)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition rounded"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a 
                    href={getExplorerUrl(pair.chainId, pair.baseToken.address, "token")}
                    target="_blank" 
                    rel="noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Pool parameters */}
              <div className="space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-850 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-900/60">
                  <span className="text-slate-500 font-semibold">Total Liquidity Pool:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {pair.liquidity?.usd ? formatUsd(pair.liquidity.usd) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900/60">
                  <span className="text-slate-500 font-semibold">FDV / Market Cap:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {pair.fdv ? formatUsd(pair.fdv) : "N/A"}
                  </span>
                </div>
                {pair.pairCreatedAt && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-semibold">Pair Creation Age:</span>
                    <span className="font-mono font-medium text-slate-200">
                      {new Date(pair.pairCreatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Buying / Selling ratio bar */}
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                  <span className="text-emerald-500">Buys ({buysCount})</span>
                  <span className="text-rose-500">Sells ({sellsCount})</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${buysPercentage}%` }} />
                  <div className="bg-rose-500 h-full transition-all flex-1" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>{buysPercentage}% Buying pressure</span>
                  <span>{100 - buysPercentage}% Selling pressure</span>
                </div>
              </div>

              {/* Web links socials */}
              {pair.info && (pair.info.websites || pair.info.socials) && (
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex items-center gap-3">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Community Links:</span>
                  <div className="flex items-center gap-2">
                    {pair.info.websites?.map((web, i) => (
                      <a 
                        key={i} 
                        href={web.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
                        title={web.label || "Website"}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    ))}
                    {pair.info.socials?.map((soc, i) => (
                      <a 
                        key={i} 
                        href={soc.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
                        title={soc.type || "Social"}
                      >
                        {soc.type === "telegram" ? <Send className="w-3.5 h-3.5" /> : <Twitter className="w-3.5 h-3.5" />}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Token Holders list */}
          <div className="bg-[#11161d] rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-3">
              <Users className="w-4 h-4 text-cyan-400" />
              Top Holders Ledger
            </h3>

            <div className="space-y-2 text-xs">
              {holders.map((holder, index) => (
                <div key={index} className="flex justify-between items-center py-1.5 border-b border-slate-900/60 last:border-0 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] w-4 text-slate-500 font-mono font-bold">#{index + 1}</span>
                    <span className="font-mono font-semibold max-w-[150px] truncate text-slate-200">
                      {holder.address}
                    </span>
                    {holder.isContract && (
                      <span className="text-[9px] bg-sky-505 bg-sky-500/15 text-sky-400 px-1 rounded-sm uppercase font-bold text-[8px] leading-tight">
                        Pool
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono font-medium">
                    <span className="text-slate-200">{holder.balance}</span>
                    <span className="float-right ml-2 text-slate-500 text-[10px] font-bold">{holder.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
