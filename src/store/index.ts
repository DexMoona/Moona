/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";
import { PriceAlert, TokenPair } from "../types";

// Watchlist Store
interface WatchlistState {
  pairs: TokenPair[];
  addPair: (pair: TokenPair) => void;
  removePair: (chainId: string, pairAddress: string) => void;
  isWatchlisted: (chainId: string, pairAddress: string) => boolean;
  updatePairPrices: (updates: Array<{ chainId: string; pairAddress: string; priceUsd: string; priceChange24h: number }>) => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => {
  // Load initial watchlist from localStorage
  const loadSaved = (): TokenPair[] => {
    try {
      const saved = localStorage.getItem("dex_watchlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  return {
    pairs: loadSaved(),
    addPair: (pair) => {
      const current = get().pairs;
      if (current.some(p => p.chainId === pair.chainId && p.pairAddress === pair.pairAddress)) {
        return;
      }
      const updated = [pair, ...current];
      localStorage.setItem("dex_watchlist", JSON.stringify(updated));
      set({ pairs: updated });
    },
    removePair: (chainId, pairAddress) => {
      const updated = get().pairs.filter(p => !(p.chainId === chainId && p.pairAddress === pairAddress));
      localStorage.setItem("dex_watchlist", JSON.stringify(updated));
      set({ pairs: updated });
    },
    isWatchlisted: (chainId, pairAddress) => {
      return get().pairs.some(p => p.chainId === chainId && p.pairAddress === pairAddress);
    },
    updatePairPrices: (updates) => {
      const updated = get().pairs.map(p => {
        const update = updates.find(u => u.chainId === p.chainId && u.pairAddress === p.pairAddress);
        if (update) {
          return {
            ...p,
            priceUsd: update.priceUsd,
            priceChange: {
              ...p.priceChange,
              h24: update.priceChange24h
            }
          };
        }
        return p;
      });
      localStorage.setItem("dex_watchlist", JSON.stringify(updated));
      set({ pairs: updated });
    }
  };
});

// Alerts Store
interface AlertsState {
  alerts: PriceAlert[];
  addAlert: (pairAddress: string, tokenSymbol: string, currentPriceUsd: number, targetPrice: number, condition: "above" | "below") => void;
  removeAlert: (id: string) => void;
  checkAlerts: (pairAddress: string, currentPriceUsd: number) => { triggered: PriceAlert[]; message: string | null };
}

export const useAlertsStore = create<AlertsState>((set, get) => {
  const loadSaved = (): PriceAlert[] => {
    try {
      const saved = localStorage.getItem("dex_alarms");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  return {
    alerts: loadSaved(),
    addAlert: (pairAddress, tokenSymbol, currentPriceUsd, targetPrice, condition) => {
      const newAlert: PriceAlert = {
        id: Math.random().toString(36).substring(2, 9),
        pairAddress,
        tokenSymbol,
        priceUsd: currentPriceUsd,
        condition,
        targetPrice,
        createdAt: Date.now(),
        isTriggered: false
      };
      const updated = [newAlert, ...get().alerts];
      localStorage.setItem("dex_alarms", JSON.stringify(updated));
      set({ alerts: updated });
    },
    removeAlert: (id) => {
      const updated = get().alerts.filter(a => a.id !== id);
      localStorage.setItem("dex_alarms", JSON.stringify(updated));
      set({ alerts: updated });
    },
    checkAlerts: (pairAddress, currentPriceUsd) => {
      const activeAlerts = get().alerts;
      const triggered: PriceAlert[] = [];
      const updated = activeAlerts.map(alert => {
        if (alert.pairAddress !== pairAddress || alert.isTriggered) return alert;

        const isAboveAndMet = alert.condition === "above" && currentPriceUsd >= alert.targetPrice;
        const isBelowAndMet = alert.condition === "below" && currentPriceUsd <= alert.targetPrice;

        if (isAboveAndMet || isBelowAndMet) {
          triggered.push(alert);
          return { ...alert, isTriggered: true };
        }
        return alert;
      });

      if (triggered.length > 0) {
        localStorage.setItem("dex_alarms", JSON.stringify(updated));
        set({ alerts: updated });
        return {
          triggered,
          message: `${triggered.map(a => `${a.tokenSymbol} hit target price of $${a.targetPrice}`).join(", ")}!`
        };
      }

      return { triggered: [], message: null };
    }
  };
});

// Settings Store
export type CurrencyDisplay = "USD" | "EUR" | "BTC";

interface SettingsState {
  theme: "dark" | "light";
  currency: CurrencyDisplay;
  defaultChain: string;
  refreshInterval: number; // in milliseconds, e.g. 5000
  favoriteChains: string[];
  toggleTheme: () => void;
  setCurrency: (currency: CurrencyDisplay) => void;
  setDefaultChain: (chain: string) => void;
  setRefreshInterval: (interval: number) => void;
  toggleFavoriteChain: (chain: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const loadSaved = (): Partial<SettingsState> => {
    try {
      const saved = localStorage.getItem("dex_settings");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const defaults = loadSaved();

  return {
    theme: defaults.theme || "dark",
    currency: defaults.currency || "USD",
    defaultChain: defaults.defaultChain || "all",
    refreshInterval: defaults.refreshInterval || 5000,
    favoriteChains: defaults.favoriteChains || ["ethereum", "bsc", "solana", "base", "arbitrum"],
    toggleTheme: () => {
      const newTheme = get().theme === "dark" ? "light" : "dark";
      // Update HTML class list
      const root = window.document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
      const updated = { ...get(), theme: newTheme };
      localStorage.setItem("dex_settings", JSON.stringify({
        theme: updated.theme,
        currency: updated.currency,
        defaultChain: updated.defaultChain,
        refreshInterval: updated.refreshInterval,
        favoriteChains: updated.favoriteChains
      }));
      set({ theme: newTheme });
    },
    setCurrency: (currency) => {
      const updated = { ...get(), currency };
      localStorage.setItem("dex_settings", JSON.stringify({
        theme: updated.theme,
        currency: updated.currency,
        defaultChain: updated.defaultChain,
        refreshInterval: updated.refreshInterval,
        favoriteChains: updated.favoriteChains
      }));
      set({ currency });
    },
    setDefaultChain: (defaultChain) => {
      const updated = { ...get(), defaultChain };
      localStorage.setItem("dex_settings", JSON.stringify({
        theme: updated.theme,
        currency: updated.currency,
        defaultChain: updated.defaultChain,
        refreshInterval: updated.refreshInterval,
        favoriteChains: updated.favoriteChains
      }));
      set({ defaultChain });
    },
    setRefreshInterval: (refreshInterval) => {
      const updated = { ...get(), refreshInterval };
      localStorage.setItem("dex_settings", JSON.stringify({
        theme: updated.theme,
        currency: updated.currency,
        defaultChain: updated.defaultChain,
        refreshInterval: updated.refreshInterval,
        favoriteChains: updated.favoriteChains
      }));
      set({ refreshInterval });
    },
    toggleFavoriteChain: (chain) => {
      const current = get().favoriteChains;
      const updatedChains = current.includes(chain)
        ? current.filter(c => c !== chain)
        : [...current, chain];
      
      const updated = { ...get(), favoriteChains: updatedChains };
      localStorage.setItem("dex_settings", JSON.stringify({
        theme: updated.theme,
        currency: updated.currency,
        defaultChain: updated.defaultChain,
        refreshInterval: updated.refreshInterval,
        favoriteChains: updated.favoriteChains
      }));
      set({ favoriteChains: updatedChains });
    }
  };
});
