/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { TokenPair, PriceAlert } from "./types";
import { searchDexPairs, fetchPairDetails } from "./services/dexscreener";
import TokenLogo from "./components/TokenLogo";
import { 
  SUPPORTED_CHAINS, 
  formatUsd, 
  formatNumber, 
  truncateAddress 
} from "./utils/chains";
import { 
  useWatchlistStore, 
  useAlertsStore, 
  useSettingsStore 
} from "./store";
import MainTable from "./components/Screener/MainTable";
import DetailView from "./components/PairDetail/DetailView";
import PortfolioTracker from "./components/Portfolio/PortfolioTracker";
import TrendingTokenTicker, { TickerToken } from "./components/TrendingTokenTicker";
import AdminPanel from "./components/Admin/AdminPanel";
import WalletModal from "./components/Wallet/WalletModal";
import MempoolFeed from "./components/Mempool/MempoolFeed";
import { 
  Star, 
  Flame, 
  Compass, 
  TrendingUp, 
  Clock, 
  Award, 
  Wallet, 
  Bell, 
  Settings, 
  Search, 
  ChevronRight, 
  Sun, 
  Moon, 
  X, 
  Cpu, 
  Grid,
  Heart,
  HelpCircle,
  Menu,
  ShieldCheck,
  RefreshCw,
  Coins,
  Radio,
  Filter,
  SlidersHorizontal,
  Megaphone,
  Leaf,
  LineChart
} from "lucide-react";

export default function App() {
  // Navigation tab states
  type SidebarTab = "screener" | "trending" | "new-pairs" | "gainers" | "watchlist" | "portfolio" | "alerts" | "settings" | "admin" | "mempool";
  const [activeTab, setActiveTab] = useState<SidebarTab>("screener");
  const [deskviewEnabled, setDeskviewEnabled] = useState<boolean>(true);
  const [docsModalOpen, setDocsModalOpen] = useState<boolean>(false);
  
  // DEX and Wallet connections state variables
  const [selectedDex, setSelectedDex] = useState<string>("all");
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletType, setWalletType] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<string>("");
  const [walletModalOpen, setWalletModalOpen] = useState<boolean>(false);
  
  // Selected pair view context
  const [selectedPair, setSelectedPair] = useState<TokenPair | null>(null);

  // Core pairs list state
  const [allPairs, setAllPairs] = useState<TokenPair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState<boolean>(false);

  // Global search Ctrl+K modal states
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TokenPair[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Advertising & Token Sponsorship states
  const [adModalOpen, setAdModalOpen] = useState<boolean>(false);
  const [adSuccessFull, setAdSuccessFull] = useState<boolean>(false);
  
  // Custom sponsorship fields
  const [adProjectName, setAdProjectName] = useState<string>("");
  const [adTokenAddress, setAdTokenAddress] = useState<string>("");
  const [adWebsiteUrl, setAdWebsiteUrl] = useState<string>("");
  const [adTwitterHandle, setAdTwitterHandle] = useState<string>("");
  const [adBudgetUsd, setAdBudgetUsd] = useState<string>("");
  const [adDurationDays, setAdDurationDays] = useState<string>("");
  const [adContactEmail, setAdContactEmail] = useState<string>("");

  const [sponsoredTokens, setSponsoredTokens] = useState<{ symbol: string; address: string; chainId: string; tag: string }[]>([
    { symbol: "DEXMOONA", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", chainId: "ethereum", tag: "OWNER AD" }
  ]);

  // Alarms builder fields
  const [customAlarmAddress, setCustomAlarmAddress] = useState<string>("");
  const [customAlarmTarget, setCustomAlarmTarget] = useState<string>("");
  const [customAlarmCondition, setCustomAlarmCondition] = useState<"above" | "below">("above");
  const [customAlarmStatus, setCustomAlarmStatus] = useState<string | null>(null);
  const [alarmCreating, setAlarmCreating] = useState<boolean>(false);

  // Admin authentication triggers
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    return typeof window !== "undefined" && sessionStorage.getItem("dex_admin_unlocked") === "true";
  });
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [adminError, setAdminError] = useState<string | null>(null);



  // Filters state
  const [gridSearch, setGridSearch] = useState<string>("");
  const [activeChainIdFilter, setActiveChainIdFilter] = useState<string>("all");
  const [minLiquidity, setMinLiquidity] = useState<string>("");
  const [minVolume, setMinVolume] = useState<string>("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<boolean>(false);

  // Mobile sidebar menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"US" | "CN">("US");

  // Pull global stores
  const { pairs: watchPairs, updatePairPrices } = useWatchlistStore();
  const { alerts, removeAlert, addAlert, checkAlerts } = useAlertsStore();
  const { 
    theme, 
    currency, 
    defaultChain, 
    refreshInterval, 
    toggleTheme, 
    setCurrency, 
    setDefaultChain, 
    setRefreshInterval 
  } = useSettingsStore();

  // Apply default chain settings on startup
  useEffect(() => {
    if (defaultChain && defaultChain !== "all") {
      setActiveChainIdFilter(defaultChain);
    }
  }, [defaultChain]);

  // Request Notification Permissions on start
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Poll DexScreener every 60 seconds to check active alerts
  useEffect(() => {
    const alertPollInterval = setInterval(async () => {
      const activeAlerts = alerts.filter(a => !a.isTriggered);
      if (activeAlerts.length === 0) return;

      for (const alert of activeAlerts) {
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${alert.pairAddress}`);
          if (res.ok) {
            const data = await res.json();
            if (data.pairs && data.pairs.length > 0) {
              const currentPrice = parseFloat(data.pairs[0].priceUsd);
              if (currentPrice && !isNaN(currentPrice)) {
                const isAboveAndMet = alert.condition === "above" && currentPrice >= alert.targetPrice;
                const isBelowAndMet = alert.condition === "below" && currentPrice <= alert.targetPrice;

                if (isAboveAndMet || isBelowAndMet) {
                  // Trigger notification
                  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                    new Notification("DEXMOONA Price Alert", {
                      body: `${alert.tokenSymbol} has reached your target of $${alert.targetPrice} (Currently: $${currentPrice.toFixed(4)})!`,
                      icon: "https://raw.githubusercontent.com/DexMoona/Doc/refs/heads/main/Moona%20logo.jpg"
                    });
                  }

                  // Check alert to toggle state
                  checkAlerts(alert.pairAddress, currentPrice);
                }
              }
            }
          }
        } catch (e) {
          console.warn("Pricing check failed for alert symbol:", alert.tokenSymbol, e);
        }
      }
    }, 60000); // 60 seconds polling

    return () => clearInterval(alertPollInterval);
  }, [alerts, checkAlerts]);

  // Load high fidelity live tokens across networks using robust keywords searches
  const loadTokens = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingPairs(true);
      else setSyncing(true);

      // Perform parallel DexScreener searches on leading crypto symbols
      const keywords = ["PEPE", "VIRTUAL", "SOL", "WETH", "BONK", "BRETT", "POPCAT", "GOAT", "FARTCOIN", "TRUMP"];
      const promises = keywords.map(keyword => searchDexPairs(keyword));
      const results = await Promise.all(promises);

      // Flatten and remove duplicate pool addresses
      const flattened = results.reduce((acc, curr) => [...acc, ...curr], []);
      const uniqueMap = new Map<string, TokenPair>();
      
      flattened.forEach(pair => {
        const key = `${pair.chainId}-${pair.pairAddress}`.toLowerCase();
        // Overwrite or store if not present
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, pair);
        }
      });

      const processed = Array.from(uniqueMap.values());
      setAllPairs(processed);
      setLastRefreshed(new Date());

      // Silently sync bookmark updates in background
      const updates = processed
        .filter(p => watchPairs.some(wp => wp.chainId === p.chainId && wp.pairAddress === p.pairAddress))
        .map(p => ({
          chainId: p.chainId,
          pairAddress: p.pairAddress,
          priceUsd: p.priceUsd,
          priceChange24h: p.priceChange?.h24 || 0
        }));

      if (updates.length > 0) {
        updatePairPrices(updates);
      }
    } catch (err) {
      console.error("Error syncing DexScreener token pools:", err);
    } finally {
      setLoadingPairs(false);
      setSyncing(false);
    }
  }, [watchPairs, updatePairPrices]);

  // Trigger loading on mount
  useEffect(() => {
    loadTokens();
  }, []);

  // Set up continuous dynamic polling of rates based on user settings
  useEffect(() => {
    const timer = setInterval(() => {
      // Don't poll while inspecting detail views to avoid chart glitches, but silent reload screener
      loadTokens(true);
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [loadTokens, refreshInterval]);

  // Keyboard shortcut listener for Ctrl/Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Trigger global modal search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchDexPairs(searchQuery);
        setSearchResults(res.slice(0, 15));
      } catch (err) {
        console.warn("Search query error:", err);
      } finally {
        setSearching(false);
      }
    }, 450); // Debounce typing

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);



  // Filters computed pairs based on Active tabs + Selected Chain filters
  const filteredPairs = useMemo(() => {
    let list = [...allPairs];

    // Filter by tab
    if (activeTab === "trending") {
      // Ranked by 24h volume
      list.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
    } else if (activeTab === "new-pairs") {
      // Ranked by creation age
      list.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    } else if (activeTab === "gainers") {
      // Ranked by positive 24h price change
      list = list.filter(p => (p.priceChange?.h24 || 0) > 0);
      list.sort((a, b) => (b.priceChange?.h24 || 0) - (a.priceChange?.h24 || 0));
    } else if (activeTab === "watchlist") {
      // Return saved watchlisted pairs
      list = watchPairs;
    }

    // Apply chain multi-select filter
    if (activeChainIdFilter !== "all") {
      list = list.filter(p => p.chainId.toLowerCase() === activeChainIdFilter.toLowerCase());
    }

    // Apply DEX filter
    if (selectedDex !== "all") {
      const targetDex = selectedDex.toLowerCase();
      list = list.filter(p => {
        const dex = p.dexId.toLowerCase();
        if (targetDex === "pump-fun") {
          return dex.includes("pump");
        }
        return dex === targetDex;
      });
    }

    // Apply main grid search (filter by name, symbol, address)
    if (gridSearch.trim() !== "") {
      const q = gridSearch.toLowerCase().trim();
      list = list.filter(p => 
        p.baseToken.name.toLowerCase().includes(q) ||
        p.baseToken.symbol.toLowerCase().includes(q) ||
        p.baseToken.address.toLowerCase().includes(q) ||
        p.pairAddress.toLowerCase().includes(q)
      );
    }

    // Apply min liquidity bounds
    if (minLiquidity.trim() !== "") {
      const minL = parseFloat(minLiquidity);
      if (!isNaN(minL)) {
        list = list.filter(p => (p.liquidity?.usd || 0) >= minL);
      }
    }

    // Apply min volume bounds
    if (minVolume.trim() !== "") {
      const minV = parseFloat(minVolume);
      if (!isNaN(minV)) {
        list = list.filter(p => (p.volume?.h24 || 0) >= minV);
      }
    }

    return list;
  }, [allPairs, activeTab, watchPairs, activeChainIdFilter, selectedDex, gridSearch, minLiquidity, minVolume]);

  const handleSelectPairFromScreener = (pair: TokenPair) => {
    setSelectedPair(pair);
    setSearchOpen(false);
  };

  return (
    <div className={`min-h-screen text-[#e2e8f0] font-sans antialiased`} style={{ backgroundColor: "#0b0e11" }}>
      
      {/* GLOBAL CTRL+K SEARCH MODAL */}
      {searchOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal search inputs */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Query token name, symbol, or contract address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>
              <button 
                onClick={() => setSearchOpen(false)}
                className="p-2 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Grid container */}
            <div className="max-h-[350px] overflow-y-auto p-2 divide-y divide-slate-800/40">
              {searching ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono animate-pulse">
                  Querying DexScreener database pools...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">
                  {searchQuery ? "No matching pairs found on any chain." : "Type above to search across Ethereum, Solana, BSC, Base..."}
                </div>
              ) : (
                searchResults.map((pair, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectPairFromScreener(pair)}
                    className="p-3 hover:bg-slate-850/80 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <TokenLogo
                        chainId={pair.chainId}
                        address={pair.baseToken.address}
                        symbol={pair.baseToken.symbol}
                        imageUrl={pair.info?.imageUrl}
                        sizeClass="w-7 h-7 font-black text-[10px]"
                        fallbackColor={SUPPORTED_CHAINS.find(c => c.id === pair.chainId.toLowerCase())?.color || "#627EEA"}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                          <span>{pair.baseToken.symbol}</span>
                          <span className="text-slate-500 font-medium font-mono text-xs">/ {pair.quoteToken.symbol}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                          <span className="uppercase text-[9px] font-black px-1 rounded bg-slate-800 text-amber-500">
                            {pair.dexId}
                          </span>
                          <span className="capitalize">{pair.chainId} network</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-100">{formatUsd(pair.priceUsd)}</div>
                      <div className={`text-[10px] font-mono mt-0.5 font-semibold ${(pair.priceChange?.h24 || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {(pair.priceChange?.h24 || 0) >= 0 ? "+" : ""}{pair.priceChange?.h24?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* STICKY HEADER VIEW (Screener title, Search, Alert triggers, dark mode) */}
      <header className="sticky top-0 z-40 bg-[#080b0f] border-b border-[#151c27] h-16 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Logo Brand Title with official Dexmoona Mascot Image and brand name 'DEXMOONA' */}
          <div className="flex items-center gap-2.5 select-none cursor-pointer shrink-0 animate-fade-in" onClick={() => { setSelectedPair(null); setActiveTab("screener"); }}>
            <div className="w-8.5 h-8.5 rounded-lg bg-[#ffffff] hover:bg-cyan-100 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all overflow-hidden border border-[#22d3ee]/20">
              <img 
                src="https://raw.githubusercontent.com/DexMoona/Doc/refs/heads/main/Moona%20logo.jpg" 
                alt="DEXMOONA Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="hidden sm:inline-block font-sans font-black tracking-tighter text-lg bg-gradient-to-r from-white via-slate-100 to-[#22d3ee] bg-clip-text text-transparent">
              DEXMOONA
            </span>
          </div>

          {/* Global Dexview-styled Search Bar with Custom Placeholder */}
          <div className="flex items-center flex-1 max-w-sm">
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-[#0d1218] hover:bg-[#111721] rounded-md px-3 py-1.5 border border-[#192230] text-[11px] text-slate-400 hover:text-slate-200 transition-all w-full text-left relative focus:outline-none cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
              <span className="truncate">Search by token name, symbol or address...</span>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <kbd className="hidden md:inline font-mono text-[8px] bg-[#070b0f] text-slate-500 px-1.2 py-0.2 rounded border border-slate-800 select-none">
                  Ctrl+K
                </kbd>
              </div>
            </button>
          </div>

          {/* Clickable Horizontal Navigation Links in Top Nav bar */}
          <nav className="hidden lg:flex items-center gap-4 text-[11.5px] font-bold text-slate-300">
            <button 
              onClick={() => setDocsModalOpen(true)} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Docs
            </button>
            <button 
              onClick={() => setAdModalOpen(true)} 
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              Advertise <span className="bg-[#22d3ee]/10 text-[#22d3ee] text-[8px] px-1 rounded">HOT</span>
            </button>
            <button 
              onClick={() => { setSelectedPair(null); setActiveTab("new-pairs"); }} 
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              New Pairs <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
            <button 
              onClick={() => { setSelectedPair(null); setActiveTab("screener"); }} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Multichart
            </button>
            <button 
              onClick={() => { setActiveTab("portfolio"); }} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Wallet
            </button>
          </nav>
        </div>

        {/* Utility right icons */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Active Watchlist indicator */}
          <div 
            onClick={() => { setSelectedPair(null); setActiveTab("watchlist"); }}
            className="hidden sm:flex items-center gap-1 text-[10px] text-slate-300 bg-[#0d1218] py-1 px-2 rounded border border-[#192230] font-bold shadow-sm cursor-pointer hover:bg-[#111721] transition-colors"
          >
            <Star className="w-3.5 h-3.5 text-[#22d3ee] fill-[#22d3ee]" />
            <span>{watchPairs.length} Starred</span>
          </div>

          {/* Deskview Mode Toggle visual pills (ON/OFF) */}
          <button 
            onClick={() => setDeskviewEnabled(!deskviewEnabled)} 
            className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md border flex items-center gap-1 transition-all ${deskviewEnabled ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]" : "bg-slate-950 border-[#192230] text-slate-500 hover:text-slate-300"}`}
            title="Toggle Deskview Trading HUD Layout"
          >
            <span className="text-[11px]">{deskviewEnabled ? "⚡" : "💤"}</span>
            <span>HUD: {deskviewEnabled ? "DESK" : "LITE"}</span>
          </button>

          {/* Connect Wallet Button */}
          <button 
            onClick={() => {
              if (walletConnected) {
                setWalletModalOpen(true);
              } else {
                setWalletConnected(true);
                setWalletAddress("0xda91ec87...d912");
                setWalletType("metamask");
                setWalletBalance("4.218 ETH");
              }
            }}
            className={`px-3.5 py-1 text-[11px] font-extrabold uppercase rounded-md border tracking-wide transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
              walletConnected 
                ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/40 hover:bg-emerald-900/30" 
                : "bg-gradient-to-r from-[#22d3ee] to-[#0ea5e9] text-slate-950 border-transparent hover:brightness-105 active:scale-95"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="truncate max-w-[90px]">{walletConnected ? "Connected" : "Connect"}</span>
          </button>

          {/* Unified Hamburger Menu Button */}
          <button 
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className={`p-2 rounded-md hover:text-white transition-all border flex items-center justify-center cursor-pointer relative h-8 w-8 ${
              mobileMenuOpen
                ? "bg-[#111721] text-[#22d3ee] border-[#22d3ee]/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]" 
                : "bg-[#0d1218] hover:bg-[#111721] border-[#192230] text-slate-400"
            }`}
            title="Menu & Commands"
          >
            <Menu className="w-4 h-4 shrink-0" />
            {(activeChainIdFilter !== "all" || minLiquidity !== "" || minVolume !== "") && (
              <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#22d3ee] animate-pulse" />
            )}
          </button>

          {/* Absolute Filter and Preferences Configuration Popover dropdown details card (Desktop only) */}
          {filterPopoverOpen && (
            <div className="absolute -right-12 sm:right-0 top-11 z-50 w-[calc(100vw-2.5rem)] sm:w-80 bg-[#090e14] border border-[#1b2533] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] p-4 animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-black tracking-widest text-[#f3ba2f] uppercase flex items-center gap-1.5 font-mono">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filtering Controls
                </span>
                <button 
                  onClick={() => setFilterPopoverOpen(false)}
                  className="text-slate-500 hover:text-white transition p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Set Network filtering layout */}
              <div className="space-y-1.5">
                <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">
                  Active Network Filter
                </span>
                <div className="flex flex-wrap gap-1">
                  <button 
                    onClick={() => setActiveChainIdFilter("all")}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition border leading-none ${activeChainIdFilter === "all" ? "bg-indigo-600 border-indigo-505 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}
                  >
                    All Networks
                  </button>
                  {SUPPORTED_CHAINS.map(chain => {
                    const active = activeChainIdFilter === chain.id;
                    return (
                      <button 
                        key={chain.id}
                        onClick={() => setActiveChainIdFilter(chain.id)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition leading-none flex items-center gap-1 shrink-0 ${active ? "bg-indigo-600 border-indigo-505 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chain.color }}></span>
                        {chain.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Min Liquidity and Min Vol setup */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold text-slate-450">Min Liquidity ($)</span>
                  <input 
                    type="number"
                    placeholder="Min Liq"
                    value={minLiquidity}
                    onChange={(e) => setMinLiquidity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200 placeholder-slate-700 hover:border-slate-705 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold text-slate-455">Min Volume ($)</span>
                  <input 
                    type="number"
                    placeholder="Min Vol"
                    value={minVolume}
                    onChange={(e) => setMinVolume(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200 placeholder-slate-700 hover:border-slate-705 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sub grid finder filter input */}
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Search symbols in view</span>
                <input 
                  type="text" 
                  placeholder="e.g. sol, doge, orca"
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-semibold text-white placeholder-slate-700 focus:outline-none"
                />
              </div>

              {/* Settings preferences section integrated cleanly! */}
              <div className="border-t border-slate-800/60 pt-3 space-y-2">
                <span className="block text-[10px] uppercase font-black tracking-widest text-[#f3ba2f] font-mono">
                  Preferences / settings
                </span>

                {/* Pricing currency selections */}
                <div className="space-y-1">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Base Pricing Currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </div>

                {/* API Poll Refresh Frequency */}
                <div className="space-y-1">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Screener Sync rate</span>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="3000">⚡ High Frequency (3s)</option>
                    <option value="5000">⏱️ Standard Feed (5s)</option>
                    <option value="10000">🐢 Conserve CPU (10s)</option>
                  </select>
                </div>
              </div>

              {/* Actions footer tools for clearing filters */}
              <div className="border-t border-slate-800/65 pt-2 flex gap-1.5">
                <button 
                  onClick={() => {
                    setActiveChainIdFilter("all");
                    setMinLiquidity("");
                    setMinVolume("");
                    setGridSearch("");
                  }}
                  className="w-full py-1.5 text-center text-[10px] font-black uppercase text-rose-400 hover:text-white bg-rose-950/20 rounded border border-rose-900/40 hover:bg-rose-900/60 transition"
                >
                  Clear Filters
                </button>
                <button 
                  onClick={() => setFilterPopoverOpen(false)}
                  className="w-full py-1.5 text-center text-[10px] font-black uppercase text-slate-300 hover:text-white bg-slate-900 rounded border border-slate-800 transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </header>



      {/* TRENDING TOKEN RATING FLOAT SYSTEM */}
      <TrendingTokenTicker onSelectToken={(token: TickerToken) => {
        // Find existing pair in allPairs, or construct a TokenPair from the TickerToken
        const matchingPair = allPairs.find(p => 
          p.baseToken.symbol.toLowerCase() === token.symbol.toLowerCase() || 
          p.baseToken.address.toLowerCase() === token.address.toLowerCase()
        );
        if (matchingPair) {
          setSelectedPair(matchingPair);
        } else {
          // Construct fully-formed high fidelity virtual TokenPair so chart and detailed view works perfectly
          const virtualPair = {
            chainId: token.chainId || "solana",
            dexId: "raydium",
            pairAddress: token.address,
            baseToken: { 
              address: token.address, 
              name: token.name, 
              symbol: token.symbol 
            },
            quoteToken: { 
              address: "So11111111111111111111111111111111111111112", 
              name: "Wrapped SOL", 
              symbol: "SOL" 
            },
            priceUsd: token.priceUsd.toString(),
            priceChange: { 
              m5: token.priceChangePercent, 
              h1: token.priceChangePercent, 
              h6: token.priceChangePercent * 1.5, 
              h24: token.priceChangePercent * 2.1 
            },
            volume: { 
              h24: token.volume24h 
            },
            liquidity: { 
              usd: token.liquidityUsd 
            },
            fdv: token.liquidityUsd * 2.8,
            marketCap: token.liquidityUsd * 2.4,
            info: { 
              imageUrl: token.imageUrl,
              websites: [],
              socials: []
            }
          };
          setSelectedPair(virtualPair);
        }
        setActiveTab("screener"); // Ensure the main screens show the screener detailed pane configuration
      }} />

      {/* MAIN CONTAINER LAYOUT WITH SIDEBAR */}
      <div className="max-w-[1600px] mx-auto flex">
        
        {/* SIDEBAR NAVIGATION PANEL (Visible Desktop, Hidden Mobile) */}
        {deskviewEnabled ? (
          <aside className="w-14 shrink-0 border-r border-[#151c27] bg-[#0c0e12] min-h-[calc(100vh-4rem)] flex flex-col justify-between py-4 select-none items-center hidden md:flex">
            {/* Top tools section */}
            <div className="flex flex-col items-center gap-4.5 w-full">
              {/* Dashboard */}
              <button 
                onClick={() => { setActiveTab("screener"); setSelectedPair(null); }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${activeTab === "screener" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="DEX Pair Screener"
              >
                <Compass className="w-5 h-5" />
              </button>

              {/* Flame (Trending) */}
              <button 
                onClick={() => { setActiveTab("trending"); setSelectedPair(null); }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${activeTab === "trending" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="Trending Tokens"
              >
                <Flame className="w-5 h-5 text-amber-500" />
              </button>

              {/* Newly Listed Pools */}
              <button 
                onClick={() => { setActiveTab("new-pairs"); setSelectedPair(null); }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${activeTab === "new-pairs" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="Newly Listed Pools"
              >
                <Clock className="w-5 h-5 text-teal-400" />
              </button>

              {/* Watchlist Starred */}
              <button 
                onClick={() => { setActiveTab("watchlist"); setSelectedPair(null); }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all relative cursor-pointer ${activeTab === "watchlist" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="Starred Watchlist"
              >
                <Star className="w-5 h-5 text-amber-400" />
                {watchPairs.length > 0 && (
                  <span className="absolute top-1 right-1 bg-[#22d3ee] text-slate-955 font-mono text-[8px] font-black px-1 rounded-full">{watchPairs.length}</span>
                )}
              </button>

              {/* Portfolio */}
              <button 
                onClick={() => { setActiveTab("portfolio"); setSelectedPair(null); }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${activeTab === "portfolio" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="Portfolio Tracker"
              >
                <Wallet className="w-5 h-5 text-indigo-455" />
              </button>

              {/* Alerts */}
              <button 
                onClick={() => { setActiveTab("alerts"); setSelectedPair(null); }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${activeTab === "alerts" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="Price Alerts"
              >
                <Bell className="w-5 h-5 text-amber-500" />
              </button>

              {/* Advertisement Modal toggle */}
              <button 
                onClick={() => { setAdModalOpen(true); }}
                className="w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:bg-[#111721] hover:text-white"
                title="Promote / Sponsor Token Campaign"
              >
                <Megaphone className="w-5 h-5 text-pink-400 animate-pulse" />
              </button>

              {/* Quick Settings dropdown Popover tool */}
              <button 
                onClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${filterPopoverOpen ? "bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30" : "text-slate-400 hover:bg-[#111721] hover:text-white"}`}
                title="Screener Filters"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom socials section (Telegram, Twitter/X) */}
            <div className="flex flex-col items-center gap-3.5 w-full">
              {/* Telegram Channel */}
              <a 
                href="https://t.me/dexmoon_official" 
                target="_blank" 
                rel="noreferrer" 
                className="w-8.5 h-8.5 rounded-full bg-cyan-950/20 hover:bg-cyan-900/40 text-[#22d3ee] flex items-center justify-center transition-all border border-cyan-900/30 font-bold"
                title="Telegram Official"
              >
                <span className="font-sans text-[10px]">TG</span>
              </a>

              {/* Twitter X channel */}
              <a 
                href="https://x.com/dexmoon_official" 
                target="_blank" 
                rel="noreferrer" 
                className="w-8.5 h-8.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center justify-center border border-[#1b2330] transition-all font-bold"
                title="Twitter X Official"
              >
                <span className="font-sans text-[10px]">X</span>
              </a>
            </div>
          </aside>
        ) : (
          <aside className={`w-64 shrink-0 border-r border-[#151c27] bg-[#0c0e12] min-h-[calc(100vh-3.5rem)] p-4 space-y-2 select-none md:block ${mobileMenuOpen ? "fixed inset-y-14 left-0 z-30 w-64 block bg-[#0c0e12]" : "hidden"}`}>
            
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-3 mb-2">
              Token Analytics
            </div>

            <nav className="space-y-1">
              <button 
                onClick={() => { setActiveTab("screener"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "screener" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  DEX Pair Screener
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>

              <button 
                onClick={() => { setActiveTab("trending"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "trending" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Trending Tokens
                </span>
                <span className="bg-amber-500/10 text-amber-400 text-[9px] font-black px-1.5 rounded-sm">Hot</span>
              </button>

              <button 
                onClick={() => { setActiveTab("new-pairs"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "new-pairs" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  Newly Listed Pools
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>

              <button 
                onClick={() => { setActiveTab("gainers"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "gainers" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Gainers & Losers
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>

              <div className="pt-4 pb-2">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-3">
                  User Intelligence
                </div>
              </div>

              <button 
                onClick={() => { setActiveTab("watchlist"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "watchlist" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Starred Watchlist
                </span>
                <span className="font-mono text-slate-500 text-[10px] font-semibold">{watchPairs.length}</span>
              </button>

              <button 
                onClick={() => { setActiveTab("portfolio"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "portfolio" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  Portfolio Tracker
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>

              <button 
                onClick={() => { setActiveTab("alerts"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "alerts" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Price Target Alarms
                </span>
                <span className="font-mono text-slate-500 text-[10px] font-semibold">
                  {alerts.filter(a => !a.isTriggered).length}
                </span>
              </button>

              <button 
                onClick={() => { setActiveTab("admin"); setSelectedPair(null); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "admin" && !selectedPair ? "bg-[#111721] text-[#22d3ee] border-l-2 border-[#22d3ee]" : "text-slate-400 hover:text-white hover:bg-slate-900/50"}`}
              >
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-405 animate-pulse" />
                  Admin Override Control
                </span>
                <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black px-1 rounded">SYS</span>
              </button>
            </nav>

            {/* FILTERS & SETTINGS PANEL IN SIDEBAR (Unified under Hamburger Drawer on mobile and sidebar on desktop) */}
            <div className="pt-4 border-t border-slate-850 space-y-3">
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Screener Filters
                </span>
                <Filter className="w-3.5 h-3.5 text-[#22d3ee]" />
              </div>

              <div className="space-y-3 px-3">
                {/* Active Network Filter */}
                <div className="space-y-1">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">
                    Chain Network
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <button 
                      onClick={() => setActiveChainIdFilter("all")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition border leading-none cursor-pointer ${activeChainIdFilter === "all" ? "bg-indigo-650 border-indigo-500 text-white" : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"}`}
                    >
                      All
                    </button>
                    {SUPPORTED_CHAINS.map(chain => {
                      const active = activeChainIdFilter === chain.id;
                      return (
                        <button 
                          key={chain.id}
                          onClick={() => setActiveChainIdFilter(chain.id)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition leading-none flex items-center gap-1 cursor-pointer ${active ? "bg-indigo-650 border-indigo-500 text-white" : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900"}`}
                        >
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: chain.color }}></span>
                          <span className="truncate max-w-[50px]">{chain.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Min Liquidity and Min Vol setup */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono animate-none">Min Liquidity</span>
                    <input 
                      type="number"
                      placeholder="Min $"
                      value={minLiquidity}
                      onChange={(e) => setMinLiquidity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[10px] font-mono font-bold text-slate-205 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">Min Volume</span>
                    <input 
                      type="number"
                      placeholder="Min $"
                      value={minVolume}
                      onChange={(e) => setMinVolume(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[10px] font-mono font-bold text-slate-205 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sub grid finder filter input */}
                <div className="space-y-1">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">Search in layout</span>
                  <input 
                    type="text" 
                    placeholder="e.g. sol, pepe"
                    value={gridSearch}
                    onChange={(e) => setGridSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                  />
                </div>

                {/* Pricing currency selections */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase font-semibold text-slate-505 font-mono">Currency</span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="w-full bg-[#0d121a] border border-slate-800 rounded p-1 text-[10px] text-slate-310 focus:outline-none cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="BTC">BTC (₿)</option>
                    </select>
                  </div>

                  {/* API Poll Refresh Frequency */}
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase font-semibold text-slate-550 font-mono">Refresh</span>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="w-full bg-[#0d121a] border border-slate-800 rounded p-1 text-[10px] text-slate-310 focus:outline-none cursor-pointer"
                    >
                      <option value="3000">3s</option>
                      <option value="5000">5s</option>
                      <option value="10000">10s</option>
                    </select>
                  </div>
                </div>

                {/* Clear action */}
                <button 
                  onClick={() => {
                    setActiveChainIdFilter("all");
                    setMinLiquidity("");
                    setMinVolume("");
                    setGridSearch("");
                  }}
                  className="w-full py-1 text-center text-[9px] font-black uppercase text-rose-450 hover:text-white bg-rose-950/20 rounded border border-rose-900/40 hover:bg-rose-900/60 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Quick instructions details info card in sidebar */}
            <div className="pt-4">
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-300">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  DEX Live Synchronizer
                </div>
                <p className="text-slate-500 text-[10px] leading-relaxed">
                  Aggregating real-time swap transactions from Uniswap, Raydium, Sushiswap pools. Next poll cycle launches in a few seconds.
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* COMPONENT BODY RENDER VIEWS */}
        <main className="flex-1 p-3 md:p-6 overflow-hidden min-h-[calc(100vh-3.5rem)]">
          {selectedPair ? (
            /* DETAIL PAIR CHART PAGE */
            <DetailView 
              pair={selectedPair} 
              onBack={() => setSelectedPair(null)} 
            />
          ) : activeTab === "portfolio" ? (
            /* PORTFOLIO & WALLET INTEL SCANNERS */
            <PortfolioTracker 
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              walletBalance={walletBalance}
              onConnectWallet={() => setWalletModalOpen(true)}
            />
          ) : activeTab === "mempool" ? (
            /* FULLSCREEN LIVE MEMPOOL FEED CONSOLE */
            <MempoolFeed />
          ) : activeTab === "alerts" ? (
            /* ACTIVE PRICE ALERTS TRIGGERS INDEX */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950/20 rounded-xl border border-slate-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500 animate-swing" />
                  Active Browser Price Target Alarms
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Alert configurations are stored securely inside your browser local storage. Trigger sounds or browser push systems automatically when pool parameters are crossed.
                </p>
              </div>

              {/* Custom price alarm adder form */}
              <div className="bg-[#11161d] p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Configure Custom Trigger Rule
                </h3>
                
                {customAlarmStatus && (
                  <div className="p-2.5 bg-indigo-950/30 border border-indigo-505/20 text-indigo-400 text-xs font-bold rounded">
                    {customAlarmStatus}
                  </div>
                )}

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const addr = customAlarmAddress.trim();
                    const target = parseFloat(customAlarmTarget);
                    if (!addr || !target || isNaN(target)) {
                      setCustomAlarmStatus("Invalid input. Please input a valid token address and price threshold.");
                      return;
                    }

                    setAlarmCreating(true);
                    setCustomAlarmStatus(null);
                    try {
                      let resolvedSymbol = "CUSTOM";
                      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
                      if (res.ok) {
                        const data = await res.json();
                        if (data.pairs && data.pairs.length > 0) {
                          resolvedSymbol = data.pairs[0].baseToken.symbol || "ERC20";
                        }
                      }
                      addAlert(addr, resolvedSymbol, target * 0.95, target, customAlarmCondition);
                      setCustomAlarmStatus(`Subscribed successfully for ${resolvedSymbol} price trigger at $${target}!`);
                      setCustomAlarmAddress("");
                      setCustomAlarmTarget("");
                    } catch {
                      addAlert(addr, "CUSTOM", target * 0.95, target, customAlarmCondition);
                      setCustomAlarmStatus(`Subscribed successfully for customized token price target at $${target}!`);
                    } finally {
                      setAlarmCreating(false);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3"
                >
                  <input 
                    type="text"
                    placeholder="Token contract address..."
                    required
                    value={customAlarmAddress}
                    onChange={(e) => setCustomAlarmAddress(e.target.value)}
                    className="md:col-span-2 bg-slate-950 border border-slate-805 rounded-lg p-2 text-xs text-white placeholder-slate-705 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <input 
                    type="text"
                    placeholder="Target price (USD)..."
                    required
                    value={customAlarmTarget}
                    onChange={(e) => setCustomAlarmTarget(e.target.value)}
                    className="bg-slate-950 border border-slate-805 rounded-lg p-2 text-xs text-white placeholder-slate-705 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <select
                      value={customAlarmCondition}
                      onChange={(e) => setCustomAlarmCondition(e.target.value as "above" | "below")}
                      className="bg-slate-950 border border-slate-805 rounded-lg p-2 text-xs text-white font-bold cursor-pointer flex-1"
                    >
                      <option value="above">CROSS ABOVE</option>
                      <option value="below">CROSS BELOW</option>
                    </select>
                    <button
                      type="submit"
                      disabled={alarmCreating}
                      className="px-4 bg-indigo-650 hover:bg-indigo-550 border border-indigo-500 rounded-lg text-xs font-black text-white shrink-0 duration-150 cursor-pointer disabled:opacity-50"
                    >
                      {alarmCreating ? "Checking..." : "Set Trigger"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-[#11161d] p-4 rounded-xl border border-slate-800">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-bold">
                    No price threshold alerts configured yet. Open a token pair details layout to assemble price alarms.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60 font-medium">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm">{alert.tokenSymbol}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${alert.condition === "above" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                              PRICE CLIMBS {alert.condition.toUpperCase()}
                            </span>
                            {alert.isTriggered && (
                              <span className="bg-amber-500/10 text-amber-400 font-bold text-[9px] px-1 rounded">
                                TRIGGERED
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            Created at: {new Date(alert.createdAt).toLocaleString()} • Target: ${alert.targetPrice}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-300 font-bold">Target: ${alert.targetPrice}</span>
                          <button 
                            onClick={() => removeAlert(alert.id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded transition"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "admin" ? (
            /* SECURE PASSWORD PROMPT ENCRYPTION PORT FOR CENTRAL ADMIN PANEL */
            !adminUnlocked ? (
              <div className="py-20 flex items-center justify-center max-w-sm mx-auto animate-in zoom-in duration-200">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAdminError(null);
                    try {
                      const encoder = new TextEncoder();
                      const bytes = encoder.encode(adminPassword);
                      const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
                      const hashArray = Array.from(new Uint8Array(hashBuffer));
                      const hexHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

                      if (hexHash === "c52b1b3bfa096df3f2bf8fbc2e7f3b890f55d048aa463a8a37910e53a9926d7c") {
                        setAdminUnlocked(true);
                        sessionStorage.setItem("dex_admin_unlocked", "true");
                        setAdminPassword("");
                      } else {
                        setAdminError("Invalid master decrypter authorization code.");
                      }
                    } catch {
                      setAdminError("SHA-256 decryption buffers failed.");
                    }
                  }}
                  className="bg-[#0b0f15] border border-slate-800 p-6 rounded-2xl w-full text-center space-y-4 shadow-2xl"
                >
                  <div className="inline-flex p-3.5 bg-rose-950/20 border border-rose-500/20 text-rose-500 rounded-full mb-1 animate-pulse">
                    <Cpu className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-black uppercase tracking-widest font-mono">Decryption Gate</h3>
                    <p className="text-slate-500 text-[10px] font-mono mt-1">Enter decryption password to unlock Master SYS terminals</p>
                  </div>

                  {adminError && (
                    <div className="p-2 bg-rose-950/30 border border-rose-500/10 rounded text-rose-455 text-[10.5px] font-bold font-mono">
                      {adminError}
                    </div>
                  )}

                  <input 
                    type="password"
                    placeholder="Enter admin password (hint: admin123)..."
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 text-xs text-white font-black p-2 rounded-lg text-center placeholder-slate-700 font-mono focus:outline-none focus:border-rose-550"
                  />

                  <button
                    type="submit"
                    className="w-full py-2 bg-rose-650 hover:bg-rose-550 hover:opacity-95 text-white font-extrabold text-xs rounded-lg transition"
                  >
                    Authorize Decrypter
                  </button>
                </form>
              </div>
            ) : (
              /* SYS PANEL */
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setAdminUnlocked(false);
                      sessionStorage.removeItem("dex_admin_unlocked");
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 font-bold font-mono text-[10px] rounded"
                  >
                    Logout Admin
                  </button>
                </div>
                <AdminPanel />
              </div>
            )
          ) : activeTab === "settings" ? (
            /* CONFIGURATIONS & PREFERENCES PANEL */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 bg-[#11161d] rounded-xl border border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-indigo-400 text-indigo-400" />
                  Munachi Settings Preferences
                </h2>

                <div className="space-y-6 text-xs max-w-xl">
                  {/* Default Chain */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Startup Network Default Focus</label>
                    <select 
                      value={defaultChain}
                      onChange={(e) => setDefaultChain(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-505"
                    >
                      <option value="all">Display All Chains combined</option>
                      {SUPPORTED_CHAINS.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Refresh interval settings */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Screener API Poll Interval</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "High Frequency (3s)", val: 3000 },
                        { label: "Standard (5s)", val: 5000 },
                        { label: "Conserve CPU (10s)", val: 10000 },
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setRefreshInterval(item.val)}
                          className={`py-2 px-1 text-center font-bold rounded transition border ${refreshInterval === item.val ? "bg-[#312e81]/40 border-indigo-505 text-white shadow-sm" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Currency settings */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Base Pricing Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-505 font-bold"
                    >
                      <option value="USD">United States Dollar ($ USD)</option>
                      <option value="EUR">Euro Union (€ EUR)</option>
                      <option value="BTC">Bitcoin (₿ BTC)</option>
                    </select>
                  </div>

                  {/* Local Storage database summary */}
                  <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-850 space-y-2">
                    <h4 className="font-bold text-slate-300">Scout Workspace Storage Information</h4>
                    <p className="text-slate-500 font-medium leading-relaxed">
                      Munachi securely stores your watches, alerts, and preferred configurations locally within your browser sandbox. Your personal keys remain completely secure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD DATA GRID: Screener, Trending, New, Gainers, Watchlists */
            <div className="space-y-6">
              
              {/* SPONSORED ACTIVE BIDDING / CAMPAIGN BANNER ADVERTISEMENTS */}
              {sponsoredTokens.length > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-[#101721] to-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <span className="bg-indigo-500/10 text-indigo-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded font-mono border border-indigo-500/20 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                      Sponsored Ad
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {sponsoredTokens.map((ad, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 font-bold">
                          <span 
                            className="text-[#f3ba2f] hover:underline uppercase cursor-pointer" 
                            onClick={() => {
                              setSelectedPair({
                                chainId: ad.chainId,
                                pairAddress: ad.address,
                                baseToken: { address: ad.address, name: ad.symbol, symbol: ad.symbol },
                                quoteToken: { symbol: "USDT", address: "quote", name: "Tether" },
                                priceUsd: "1.42",
                                priceChange: { h24: 35.8 },
                                volume: { h24: 12500000 },
                                liquidity: { usd: 4200000 }
                              });
                            }}
                          >
                            ${ad.symbol}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold font-mono bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                            {ad.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setAdModalOpen(true)}
                    className="text-[#f3ba2f] hover:text-white text-[10.5px] font-bold font-mono hover:underline flex items-center gap-1"
                  >
                    Promote Token ➜
                  </button>
                </div>
              )}
              
              {/* DEX FILTER HORIZONTAL TAB PILL NAVIGATION (Iconic Dexview screenshot replica) */}
              <div className="flex items-center justify-between border-b border-[#141a24] bg-[#090d13] p-1 rounded-lg">
                <div className="flex items-center gap-0.5 overflow-x-auto select-none no-scrollbar">
                  {[
                    { value: "all", label: "All DEXes", icon: "🌐" },
                    { value: "pancakeswap", label: "PancakeSwap", icon: "🥞" },
                    { value: "raydium", label: "Raydium", icon: "🌀" },
                    { value: "pump-fun", label: "Pump.fun", icon: "💊" },
                    { value: "uniswap", label: "Uniswap", icon: "🦄" },
                  ].map((dex) => {
                    const active = selectedDex === dex.value;
                    return (
                      <button
                        key={dex.value}
                        onClick={() => setSelectedDex(dex.value)}
                        className={`px-4.5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:bg-slate-900/40 rounded-md ${
                          active 
                            ? "text-[#f3ba2f] font-black bg-[#121924]/60" 
                            : "text-slate-405 hover:text-white"
                        }`}
                      >
                        <span>{dex.icon}</span>
                        <span>{dex.label}</span>
                        {active && (
                          <span className="absolute bottom-0 inset-x-4 h-0.5 bg-[#f3ba2f]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* More selection dropdown filter exactly like 'More v' in Dexview */}
                <div className="relative group shrink-0 px-2">
                  <button className="bg-[#121820] hover:bg-[#1a2330] border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1.5 hover:text-white transition cursor-pointer">
                    <span>More</span>
                    <span className="text-[10px] text-slate-500 font-bold">▼</span>
                  </button>
                  {/* Dropdown Options */}
                  <div className="absolute right-2 top-full mt-1.5 bg-[#0e131b] border border-[#1b2533] rounded-lg shadow-2xl py-1 w-36 hidden group-hover:block z-40 animate-in fade-in duration-100">
                    {[
                      { value: "orca", label: "🐋 Orca" },
                      { value: "jupiter", label: "🪐 Jupiter" },
                      { value: "meteora", label: "☄️ Meteora" },
                      { value: "sushiswap", label: "🍣 Sushi" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedDex(opt.value)}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-900 transition flex items-center justify-between ${
                          selectedDex === opt.value ? "text-[#f3ba2f] bg-[#121924]/40" : "text-slate-305"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedDex === opt.value && <span className="text-[#f3ba2f] text-[10px]">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main table data render */}
              <MainTable 
                pairs={filteredPairs}
                onSelectPair={handleSelectPairFromScreener}
                isLoading={loadingPairs}
              />

              {/* Status Indicator bottom label */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2">
                <span>Displaying {filteredPairs.length} matched pools across index sets</span>
                <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
              </div>

            </div>
          )}
        </main>

      </div>

      {/* SECURE BLOCK HANDSHAKE WALLET CONNECTION POPUP */}
      <WalletModal 
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onConnect={(walletType, address, balance) => {
          setWalletConnected(true);
          setWalletAddress(address);
          setWalletType(walletType);
          setWalletBalance(balance);
        }}
      />

      {/* UNIFIED LEFT SLIDE-OUT SIDEBAR NAVIGATION MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          {/* Animated overlay backdrop */}
          <div 
            className="fixed inset-0 bg-[#040608]/85 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Left sliding drawer body */}
          <div 
            style={{ backgroundColor: "#1E232F" }}
            className="relative w-full max-w-sm h-full border-r border-[#2C3241] shadow-[5px_0_50px_rgba(0,0,0,0.6)] flex flex-col p-6 overflow-y-auto no-scrollbar z-10 animate-in slide-in-from-left duration-250 text-white"
          >
            
            {/* Drawer Header with Logo & Connect Button */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 gap-3">
              {/* DEXMOONA Official Round Logo image */}
              <div className="flex items-center shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-cyan-400 bg-white" title="DEXMOONA Logo">
                <img 
                  src="https://raw.githubusercontent.com/DexMoona/Doc/refs/heads/main/Moona%20logo.jpg" 
                  alt="DEXMOONA Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Prominent Wide Rectangular Connect Button */}
              {walletConnected ? (
                <button 
                  onClick={() => {
                    setWalletConnected(false);
                    setWalletAddress("");
                    setWalletType("");
                    setWalletBalance("");
                  }}
                  className="flex-1 py-2 px-3 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 text-rose-200 font-extrabold rounded-lg text-xs truncate flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                  title="Disconnect Wallet"
                >
                  <Wallet className="w-3.5 h-3.5 text-rose-450 shrink-0" />
                  <span className="truncate">{truncateAddress(walletAddress)}</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setWalletModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-[#22d3ee] hover:from-cyan-450 hover:to-cyan-300 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_4px_12px_rgba(34,211,238,0.25)] whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  <span>Connect Wallet</span>
                </button>
              )}

              {/* Close Drawer Button */}
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Sidebar Contents */}
            <div className="space-y-6 flex-1">
              
              {/* 1. Core Navigation Items */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">
                  Analytics & Intelligence
                </span>

                {/* DEX Pair Screener */}
                <button 
                  onClick={() => {
                    setActiveTab("screener");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "screener" && !selectedPair ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>DEX Pair Screener</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Trending Tokens */}
                <button 
                  onClick={() => {
                    setActiveTab("trending");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "trending" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Trending Tokens</span>
                  </div>
                  <span className="bg-amber-500/15 text-amber-400 text-[9px] font-black px-1.5 rounded-sm">HOT</span>
                </button>

                {/* Newly Listed Pools */}
                <button 
                  onClick={() => {
                    setActiveTab("new-pairs");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "new-pairs" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Newly Listed Pools</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Gainers & Losers */}
                <button 
                  onClick={() => {
                    setActiveTab("gainers");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "gainers" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Gainers & Losers</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Starred Watchlist */}
                <button 
                  onClick={() => {
                    setActiveTab("watchlist");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "watchlist" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Starred Watchlist</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[10px] font-bold">{watchPairs.length}</span>
                </button>

                {/* Portfolio Tracker */}
                <button 
                  onClick={() => {
                    setActiveTab("portfolio");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "portfolio" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Portfolio Tracker</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Price Target Alarms */}
                <button 
                  onClick={() => {
                    setActiveTab("alerts");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "alerts" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-amber-505 shrink-0" />
                    <span>Price Target Alarms</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[10px] font-bold">
                    {alerts.filter(a => !a.isTriggered).length}
                  </span>
                </button>

                {/* Sponsor Promotion Campaign */}
                <button 
                  onClick={() => {
                    setAdModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 transition border border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>Advertise Campaign</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* System Admin Override Control */}
                <button 
                  onClick={() => {
                    setActiveTab("admin");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "admin" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Cpu className="w-4 h-4 text-[#22d3ee] shrink-0 animate-pulse" />
                    <span>Admin Control Override</span>
                  </div>
                  <span className="bg-indigo-500/10 text-[#22d3ee] text-[9.5px] font-black px-1.5 rounded">SYS</span>
                </button>

                {/* Mempool Refresh Data View */}
                <button 
                  onClick={() => {
                    setActiveTab("mempool");
                    setSelectedPair(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-transparent ${activeTab === "mempool" ? "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <div className="flex items-center gap-3">
                    <Radio className="w-4 h-4 text-cyan-405 shrink-0 select-none animate-pulse" />
                    <span>Mempool Refresh Data</span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-slate-500 bg-slate-900 px-1 rounded">LIVE</span>
                </button>
              </div>

              {/* 2. Blockchain Networks Selectors with their official logo designs */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">
                  Blockchain Networks
                </span>

                <div className="space-y-1">
                  {[
                    { id: "ethereum", name: "Ethereum Mainnet", symbol: "ETH" },
                    { id: "bsc", name: "BNB Chain", symbol: "BNB" },
                    { id: "solana", name: "Solana", symbol: "SOL" },
                    { id: "base", name: "Base", symbol: "BASE" },
                    { id: "polygon", name: "Polygon", symbol: "POL" },
                    { id: "xlayer", name: "X Layer Mainnet", symbol: "XOL" },
                    { id: "sui", name: "Sui", symbol: "SUI" }
                  ].map((chain) => {
                    const isXLayer = chain.id === "xlayer";
                    const active = activeChainIdFilter === chain.id;
                    
                    // Highlight logic
                    // X Layer Mainnet uses a unique prominent darker active background state as requested
                    let customBGClass = "";
                    if (isXLayer) {
                      customBGClass = "bg-[#10141e] border-[#343c51] text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] border";
                    } else if (active) {
                      customBGClass = "bg-white/10 border-white/20 text-white border";
                    } else {
                      customBGClass = "bg-[#252C3D]/30 hover:bg-[#252C3D]/60 border-transparent text-slate-300 border hover:border-white/5";
                    }

                    return (
                      <button 
                        key={chain.id}
                        onClick={() => {
                          if (isXLayer) {
                            setActiveChainIdFilter("xlayer");
                          } else {
                            setActiveChainIdFilter(chain.id);
                          }
                          setSelectedPair(null);
                          setActiveTab("screener");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${customBGClass}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Vector logo svg */}
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {chain.id === "ethereum" && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4">
                                <path d="M12 2L4.5 12 12 16.5 19.5 12 12 2z" fill="#627EEA" />
                                <path d="M12 16.5L4.5 12 12 21.5 19.5 12 12 16.5z" fill="#3C51A6" />
                                <path d="M12 2v14.5L19.5 12 12 2z" fill="#8C9EF2" opacity="0.8" />
                                <path d="M12 16.5v5L19.5 12 12 16.5z" fill="#5066C0" opacity="0.8" />
                              </svg>
                            )}
                            {chain.id === "bsc" && (
                              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5">
                                <path d="M12 2l4 4-4 4-4-4 4-4zm0 14l4 4-4 4-4-4 4-4zm-6-7l4 4-4 4-4-4 4-4zm12 0l4 4-4 4-4-4 4-4z" fill="#F3BA2F" />
                              </svg>
                            )}
                            {chain.id === "solana" && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4">
                                <path d="M3 17.5h18l-3.5 4H3zm3.5-8H21l-3.5 4H6.5zM3 3.5h18l-3.5 4H3z" fill="url(#solana-drawer)" />
                                <defs>
                                  <linearGradient id="solana-drawer" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#14F195" />
                                    <stop offset="100%" stopColor="#9945FF" />
                                  </linearGradient>
                                </defs>
                              </svg>
                            )}
                            {chain.id === "base" && (
                              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5">
                                <circle cx="12" cy="12" r="10" fill="#0052FF" />
                                <circle cx="12" cy="12" r="5.5" fill="none" stroke="white" strokeWidth="2.5" />
                              </svg>
                            )}
                            {chain.id === "polygon" && (
                              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor">
                                <path d="M8 4.5l8 2.5v10l-8 2.5-5-5v-5l5-5z" fill="#8247E5" stroke="white" strokeWidth="0.75" />
                                <circle cx="12" cy="12" r="2.5" fill="white" />
                              </svg>
                            )}
                            {chain.id === "xlayer" && (
                              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M4 4l16 16M20 4L4 20" stroke="white" strokeLinecap="round" />
                                <circle cx="12" cy="12" r="3" fill="#10141e" stroke="#F3BA2F" strokeWidth="1.5" />
                              </svg>
                            )}
                            {chain.id === "sui" && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4">
                                <path d="M12 2C7 8 4 12 4 15c0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-3-7-8-13z" fill="#6FBCDF" />
                              </svg>
                            )}
                          </div>
                          <span className="font-bold tracking-wide">{chain.name}</span>
                        </div>

                        {/* Status trigger info badge */}
                        {isXLayer ? (
                          <span className="bg-[#f3ba2f]/10 text-[#F3BA2F] text-[9px] font-black px-1.5 py-0.5 rounded border border-[#f3ba2f]/20 font-mono tracking-tight uppercase">Featured</span>
                        ) : active ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] shadow-[0_0_8px_rgba(20,241,149,0.7)] shrink-0" />
                        ) : (
                          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">{chain.symbol}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* 3. Drawer Footer with small country flag icons next to light/dark mode trigger */}
            <div className="pt-4 mt-auto border-t border-white/10 flex items-center justify-between select-none">
              
              {/* Country Flag Language selection */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">Lang:</span>
                <div className="flex items-center gap-1.5 bg-black/25 px-1.5 py-1 rounded-lg border border-white/5">
                  <button 
                    onClick={() => setSelectedLanguage("US")}
                    className={`text-base transition-all duration-150 cursor-pointer focus:outline-none ${selectedLanguage === "US" ? "scale-125 filter drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] opacity-100" : "opacity-35 hover:opacity-80"}`}
                    title="English (US)"
                  >
                    🇺🇸
                  </button>
                  <button 
                    onClick={() => setSelectedLanguage("CN")}
                    className={`text-base transition-all duration-150 cursor-pointer focus:outline-none ${selectedLanguage === "CN" ? "scale-125 filter drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] opacity-100" : "opacity-35 hover:opacity-80"}`}
                    title="Chinese (简体中文)"
                  >
                    🇨🇳
                  </button>
                </div>
                <span className="text-[10px] font-mono font-black text-[#f3ba2f] tracking-wide w-5">
                  {selectedLanguage === "US" ? "EN" : "ZH"}
                </span>
              </div>

              {/* Minimalist Sun/Moon light/dark mode switch */}
              <button 
                onClick={() => toggleTheme()}
                className="flex items-center gap-1.5 bg-[#252C3D]/50 hover:bg-[#252C3D]/85 border border-white/5 px-2.5 py-1 rounded-full transition cursor-pointer text-xs font-bold"
                title="Toggle Light/Dark"
              >
                {theme === "dark" ? (
                  <>
                    <Moon className="w-3 h-3 text-sky-405 fill-sky-450/10 shrink-0" />
                    <span className="text-slate-300 font-mono text-[9px] uppercase tracking-wider">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3 h-3 text-amber-505 fill-amber-500/10 shrink-0" />
                    <span className="text-slate-300 font-mono text-[9px] uppercase tracking-wider">Light</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVERTISING PROMOTION CAMPAIGN CONFIGURATION FORM MODAL */}
      {adModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f15] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2 text-[#f3ba2f]">
                <Megaphone className="w-5 h-5" />
                <h3 className="font-extrabold tracking-tight text-white">Promote Your Token Project</h3>
              </div>
              <button 
                onClick={() => {
                  setAdModalOpen(false);
                  setAdSuccessFull(false);
                }}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adSuccessFull ? (
              <div className="space-y-4 text-center py-6 animate-in zoom-in duration-200">
                <div className="w-12 h-12 bg-emerald-950/55 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
                  ✓
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-sm uppercase">Campaign request has been sent!</h4>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                    We'll contact you within 24 hours to coordinate placements and wallet signoffs. Thank you!
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setAdModalOpen(false);
                    setAdSuccessFull(false);
                  }}
                  className="w-full py-2 bg-indigo-650 hover:bg-indigo-550 text-white font-bold text-xs rounded-lg transition mt-2 cursor-pointer border border-indigo-500/20 uppercase font-mono"
                >
                  Return to Screener
                </button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  
                  const subject = encodeURIComponent(`DEXMOONA Ad Campaign Proposal: ${adProjectName}`);
                  const body = encodeURIComponent(
                    `DEXMOONA ADVERTISEMENT PROPOSAL\n` +
                    `==============================\n` +
                    `Project Name: ${adProjectName}\n` +
                    `Token Contract Address: ${adTokenAddress}\n` +
                    `Website URL: ${adWebsiteUrl}\n` +
                    `Twitter/X Handle: ${adTwitterHandle}\n` +
                    `Budget (USD): $${adBudgetUsd}\n` +
                    `Campaign Duration: ${adDurationDays} Days\n` +
                    `Contact Email: ${adContactEmail}\n` +
                    `==============================\n` +
                    `Submitted via secure DEXMOONA platform portal.`
                  );

                  // Open encoded mailto links
                  window.location.href = `mailto:ads@yourplatform.com?subject=${subject}&body=${body}`;
                  setAdSuccessFull(true);
                }}
                className="space-y-3 font-semibold text-xs text-slate-350"
              >
                <p className="text-[10px] text-slate-500 font-mono italic leading-relaxed">
                  Provide campaign properties below. Confirming triggers client-side pre-filled mail handshakes directly to are placement administrators.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9.5px] uppercase font-bold text-slate-500 font-mono">Project Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. MOONA"
                      value={adProjectName}
                      onChange={(e) => setAdProjectName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs font-bold text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9.5px] uppercase font-bold text-slate-500 font-mono">Contact Email</label>
                    <input 
                      type="email"
                      required
                      placeholder="marketing@project.com"
                      value={adContactEmail}
                      onChange={(e) => setAdContactEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs font-bold text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9.5px] uppercase font-bold text-slate-500 font-mono">Token Contract Address</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 0x..., SolMintSignature..."
                    value={adTokenAddress}
                    onChange={(e) => setAdTokenAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f] font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9.5px] uppercase font-bold text-slate-500 font-mono">Website URL</label>
                    <input 
                      type="url"
                      required
                      placeholder="https://moona.com"
                      value={adWebsiteUrl}
                      onChange={(e) => setAdWebsiteUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9.5px] uppercase font-bold text-slate-500 font-mono">Twitter / X Handle</label>
                    <input 
                      type="text"
                      required
                      placeholder="@MoonaToken"
                      value={adTwitterHandle}
                      onChange={(e) => setAdTwitterHandle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9.5px] uppercase font-bold text-slate-400 font-mono">Budget (USD)</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 2500"
                      value={adBudgetUsd}
                      onChange={(e) => setAdBudgetUsd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9.5px] uppercase font-bold text-slate-400 font-mono">Duration (days)</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 7"
                      value={adDurationDays}
                      onChange={(e) => setAdDurationDays(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white placeholder-slate-705 focus:outline-none focus:border-[#f3ba2f]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-[#f3ba2f] text-slate-955 font-black rounded-lg text-xs hover:opacity-95 transition shadow-lg cursor-pointer uppercase font-mono tracking-wider"
                  >
                    Open Mailer proposal form
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
