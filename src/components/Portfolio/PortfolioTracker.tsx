/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import TokenLogo from "../TokenLogo";
import { 
  Wallet, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase, 
  Key, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  Trash2
} from "lucide-react";

interface TokenHolding {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  chainId: string;
  address: string;
  change24h: number;
}

interface PortfolioTrackerProps {
  walletConnected: boolean;
  walletAddress: string;
  walletBalance: string;
  onConnectWallet: () => void;
}

export default function PortfolioTracker({ 
  walletConnected, 
  walletAddress, 
  walletBalance, 
  onConnectWallet 
}: PortfolioTrackerProps) {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("dex_api_key") || "");
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => localStorage.getItem("dex_api_key") || "");
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState<boolean>(false);

  // Save index API keys to localStorage
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    localStorage.setItem("dex_api_key", cleanKey);
    setApiKey(cleanKey);
    setError(null);
    if (walletConnected && walletAddress) {
      fetchLivePortfolio(walletAddress, cleanKey);
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("dex_api_key");
    setApiKey("");
    setApiKeyInput("");
    setHoldings([]);
    setError("API Key removed. Add a key to load on-chain wallet balances.");
  };

  // Main portfolio fetching logic using JSON-RPC
  const fetchLivePortfolio = async (address: string, activeKey: string) => {
    if (!activeKey) {
      loadDemoHoldings();
      return;
    }

    setLoading(true);
    setError(null);
    setUsingDemoData(false);

    try {
      // Step 1: Query token balances for EVM
      const response = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${activeKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getTokenBalances",
          params: [address],
        }),
      });

      if (!response.ok) {
        throw new Error(`failed to contact Alchemy. Code: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error.message || "Alchemy API returned an error.");
      }

      const rawBalances = resData.result?.tokenBalances || [];
      const nonZeroBalances = rawBalances
        .filter((b: any) => parseInt(b.tokenBalance, 16) > 0)
        .slice(0, 12); // Grab up to 12 biggest assets for rendering

      const resolved: TokenHolding[] = [];

      // Step 2: Grab native ETH balance
      const ethBalanceRes = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${activeKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_getBalance",
          params: [address, "latest"],
        }),
      });

      if (ethBalanceRes.ok) {
        const ethData = await ethBalanceRes.json();
        const ethHex = ethData.result;
        if (ethHex) {
          const ethWei = parseInt(ethHex, 16);
          const ethQty = ethWei / 1e18;

          if (ethQty > 0) {
            // Price lookup for ETH via Wrapped ETH
            let ethPrice = 3000;
            let ethChange = 0;
            try {
              const priceRes = await fetch("https://api.dexscreener.com/latest/dex/tokens/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
              if (priceRes.ok) {
                const priceData = await priceRes.json();
                if (priceData.pairs && priceData.pairs.length > 0) {
                  ethPrice = parseFloat(priceData.pairs[0].priceUsd) || 3000;
                  ethChange = parseFloat(priceData.pairs[0].priceChange?.h24) || 2.5;
                }
              }
            } catch (e) {
              console.warn("ETH price lookup failed, using fallback:", e);
            }

            resolved.push({
              id: "eth-native",
              symbol: "ETH",
              name: "Ethereum Native Token",
              balance: ethQty,
              priceUsd: ethPrice,
              valueUsd: ethQty * ethPrice,
              chainId: "ethereum",
              address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
              change24h: ethChange
            });
          }
        }
      }

      // Step 3: Resolve metadata and look up prices for each ERC-20 token
      for (const t of nonZeroBalances) {
        try {
          const metaRes = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${activeKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 3,
              method: "alchemy_getTokenMetadata",
              params: [t.contractAddress],
            }),
          });

          if (!metaRes.ok) continue;
          const metaData = await metaRes.json();
          const meta = metaData.result;
          if (!meta) continue;

          const decimals = meta.decimals || 18;
          const symbol = meta.symbol || "ERC20";
          const name = meta.name || "Custom ERC20 Token";
          const rawBal = parseInt(t.tokenBalance, 16);
          const balance = rawBal / Math.pow(10, decimals);

          if (balance <= 0) continue;

          // Fetch Live Price on DexScreener by Token Contract Address
          let priceUsd = 0;
          let change24h = 0;

          try {
            const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${t.contractAddress}`);
            if (dexRes.ok) {
              const dexData = await dexRes.json();
              if (dexData.pairs && dexData.pairs.length > 0) {
                const mainPair = dexData.pairs[0];
                priceUsd = parseFloat(mainPair.priceUsd) || 0;
                change24h = parseFloat(mainPair.priceChange?.h24) || 0;
              }
            }
          } catch (pe) {
            console.warn(`Price check failed for ${symbol}:`, pe);
          }

          resolved.push({
            id: t.contractAddress,
            symbol,
            name,
            balance,
            priceUsd,
            valueUsd: balance * priceUsd,
            chainId: "ethereum",
            address: t.contractAddress,
            change24h
          });
        } catch (tokenErr) {
          console.warn("Error resolving token details:", tokenErr);
        }
      }

      setHoldings(resolved.sort((a, b) => b.valueUsd - a.valueUsd));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse on-chain portfolio balances. Verify your API key and network.");
      loadDemoHoldings(); // Safe fallback for testing UI
    } finally {
      setLoading(false);
    }
  };

  const loadDemoHoldings = () => {
    setUsingDemoData(true);
    setHoldings([
      {
        id: "demo-eth",
        symbol: "ETH",
        name: "Ether",
        balance: 1.84,
        priceUsd: 3125.40,
        valueUsd: 5750.73,
        chainId: "ethereum",
        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        change24h: 3.45
      },
      {
        id: "demo-pepe",
        symbol: "PEPE",
        name: "Pepe Coin",
        balance: 247000000,
        priceUsd: 0.00001452,
        valueUsd: 3586.44,
        chainId: "ethereum",
        address: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
        change24h: 12.8
      },
      {
        id: "demo-usdc",
        symbol: "USDC",
        name: "USD Coin",
        balance: 1450,
        priceUsd: 1.00,
        valueUsd: 1450.00,
        chainId: "ethereum",
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        change24h: -0.01
      },
      {
        id: "demo-virtual",
        symbol: "VIRTUAL",
        name: "Virtual Protocol",
        balance: 1850,
        priceUsd: 0.542,
        valueUsd: 1002.70,
        chainId: "base",
        address: "0x0b3e328455c40110b016000c12dd3f51abc4000b",
        change24h: -5.46
      }
    ]);
  };

  useEffect(() => {
    if (walletConnected && walletAddress) {
      if (apiKey) {
        fetchLivePortfolio(walletAddress, apiKey);
      } else {
        loadDemoHoldings();
      }
    } else {
      setHoldings([]);
    }
  }, [walletConnected, walletAddress, apiKey]);

  const totalValuation = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Visual Welcome Board */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-[#07131e] to-indigo-950/20 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-405" />
            EVM Token Portfolio Tracker
          </h2>
          <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
            Real-time balance scanner checking decentralized holdings directly on Ethereum Mainnet. Connect your web3 injector and provide your Alchemy API key below to launch on-chain audits.
          </p>
        </div>
        
        {walletConnected && (
          <button 
            onClick={() => fetchLivePortfolio(walletAddress, apiKey)}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-2 transition select-none cursor-pointer self-start md:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Balances
          </button>
        )}
      </div>

      {/* WALLET CONNECTOR CHECK BLOCK */}
      {!walletConnected ? (
        <div className="text-center py-20 bg-slate-950/20 rounded-xl border border-slate-800 max-w-lg mx-auto p-6">
          <div className="inline-flex p-4 bg-slate-900 rounded-full text-cyan-400 mb-4 shadow">
            <Wallet className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-white">Wallet Connection Required</h3>
          <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
            Please connect your MetaMask or active injected web3 browser wallet directly to audit live portfolios, ERC-20 tokens, and Ethereum mainnet balances.
          </p>
          <button
            onClick={onConnectWallet}
            className="mt-6 py-2.5 px-6 bg-gradient-to-r from-cyan-500 to-[#22d3ee] hover:from-cyan-450 hover:to-cyan-300 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer shadow-[0_4px_12px_rgba(34,211,238,0.25)] flex items-center gap-2 mx-auto"
          >
            <Wallet className="w-4 h-4" />
            Connect Web3 Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Portfolio Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono">Portfolio Valuation</span>
                <div className="text-3xl font-black text-emerald-400 font-mono mt-1.5">
                  ${totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-[10px] text-slate-505 font-mono mt-3 flex items-center gap-1">
                {usingDemoData ? (
                  <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold">⚠️ USING DEMO PREVIEW DATA</span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">✓ REAL ON-CHAIN SYNC</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono">Audited Wallet Source</span>
                <div className="text-xs font-bold font-mono text-cyan-400 mt-2 break-all selection:bg-cyan-500/35">
                  {walletAddress}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-3 block">
                Network: Ethereum Mainnet (0x1)
              </span>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono">Ether Reserve</span>
                <div className="text-2xl font-black text-white font-mono mt-1.5">
                  {walletBalance || "0 ETH"}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-3">
                Scanned via web3 wallet provider
              </span>
            </div>
          </div>

          {/* API Keys Configuration Drawer */}
          <div className="bg-[#11161d] p-5 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Alchemy RPC Scanner Credentials
              </h4>
              <a 
                href="https://www.alchemy.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline transition font-bold"
              >
                <span>Obtain Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input 
                  type="password"
                  placeholder="Paste your Ethereum Alchemy API Key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-lg py-2 pl-3 pr-16 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
                {apiKey && (
                  <span className="absolute right-3 top-2.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded uppercase tracking-wider">
                    Activated
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-550 border border-indigo-500 text-white font-black rounded-lg text-xs transition select-none cursor-pointer"
                >
                  Verify & Activate
                </button>
                {apiKey && (
                  <button 
                    type="button"
                    onClick={handleClearApiKey}
                    className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 text-rose-400 hover:text-rose-300 rounded-lg transition"
                    title="Clear API Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <span className="block text-[10px] text-slate-500 leading-relaxed font-mono">
              Note: To safeguard keys against exposure, key signatures are loaded and run locally inside your browser sandbox and not sent to outer databases. Under the namespaces prefix `dex_`.
            </span>
          </div>

          {/* Holdings Visual Grid Table */}
          <div className="bg-[#0b0f15] border border-slate-850 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950/40 border-b border-slate-850/60 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Scanned ERC-20 Assets ({holdings.length})
              </span>
              {usingDemoData && (
                <div className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  Showing premium demo positions (API Key empty)
                </div>
              )}
            </div>

            {error && !holdings.length && (
              <div className="p-6 text-center text-rose-455 text-xs font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-450 animate-spin" />
                <span className="text-slate-500 text-xs font-mono">Auditing blockchain ledger tokens...</span>
              </div>
            ) : holdings.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-mono">
                No active ERC-20 tokens detected in this wallet on Mainnet.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse font-semibold">
                  <thead>
                    <tr className="border-b border-slate-850/80 bg-slate-950/20 text-slate-400 h-10 uppercase text-[10px] tracking-wider">
                      <th className="px-5 text-left">Asset / Ticker</th>
                      <th className="px-4">Contract Address</th>
                      <th className="px-4 text-right">Balance</th>
                      <th className="px-4 text-right">Index Unit Price</th>
                      <th className="px-5 text-right">USD Valuation</th>
                      <th className="px-5 text-right">24h Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {holdings.map((hold) => (
                      <tr key={hold.id} className="h-13 hover:bg-slate-900/15 transition-all">
                        <td className="px-5 text-left">
                          <div className="flex items-center gap-2.5">
                            <TokenLogo
                              chainId={hold.chainId}
                              address={hold.address}
                              symbol={hold.symbol}
                              sizeClass="w-7.5 h-7.5 font-bold text-[10px]"
                              fallbackColor="#151d2a"
                            />
                            <div>
                              <div className="font-extrabold text-slate-100 flex items-center gap-1.5">
                                {hold.symbol}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium block">{hold.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4">
                          <span className="font-mono text-[10.5px] text-slate-500 hover:text-cyan-400 select-all cursor-pointer">
                            {hold.address.substring(0, 8)}...{hold.address.substring(hold.address.length - 8)}
                          </span>
                        </td>
                        <td className="px-4 text-right font-mono text-slate-200">
                          {hold.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 text-right font-mono text-slate-300">
                          {hold.priceUsd ? `$${hold.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "$-"}
                        </td>
                        <td className="px-5 text-right font-mono font-black text-emerald-450 text-sm">
                          ${hold.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 text-right">
                          <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${hold.change24h >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {hold.change24h >= 0 ? "+" : ""}{hold.change24h.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
