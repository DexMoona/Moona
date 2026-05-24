/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Terminal, 
  ShieldAlert, 
  Database, 
  Megaphone, 
  Trash2, 
  AlertTriangle, 
  Users, 
  Bell, 
  ToggleLeft, 
  ToggleRight 
} from "lucide-react";
import { PriceAlert } from "../../types";

export default function AdminPanel() {
  const [adsEnabled, setAdsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("dex_ads_enabled") !== "false";
  });
  const [activeUsers, setActiveUsers] = useState<number>(() => {
    const stored = localStorage.getItem("dex_active_users");
    if (stored) return parseInt(stored);
    const rand = Math.floor(180 + Math.random() * 80);
    localStorage.setItem("dex_active_users", rand.toString());
    return rand;
  });
  const [allAlarms, setAllAlarms] = useState<PriceAlert[]>([]);
  const [cpuUsage, setCpuUsage] = useState<number>(14);
  const [ramUsage, setRamUsage] = useState<number>(46);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load all alarms across users (dex_alarms namespace)
  const loadAlarms = () => {
    try {
      const saved = localStorage.getItem("dex_alarms");
      if (saved) {
        setAllAlarms(JSON.parse(saved));
      } else {
        setAllAlarms([]);
      }
    } catch {
      setAllAlarms([]);
    }
  };

  useEffect(() => {
    loadAlarms();
    
    // Simulate active system usage ticks
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(10 + Math.random() * 8));
      setRamUsage(Math.floor(42 + Math.random() * 4));
      // Occasionally fluctuate active users slightly
      setActiveUsers(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = Math.max(10, prev + delta);
        localStorage.setItem("dex_active_users", next.toString());
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleToggleAds = () => {
    const nextVal = !adsEnabled;
    setAdsEnabled(nextVal);
    localStorage.setItem("dex_ads_enabled", nextVal.toString());
    triggerUIRefresh();
    showToast(`Campaign Ads ${nextVal ? "ENABLED" : "DISABLED"} for all slots.`);
  };

  const handleClearAllWatchlists = () => {
    localStorage.removeItem("dex_watchlist");
    triggerUIRefresh();
    showToast("Cleared all Watchlists globally!");
  };

  const handleClearAllAlarms = () => {
    localStorage.removeItem("dex_alarms");
    setAllAlarms([]);
    triggerUIRefresh();
    showToast("Cleared all target Price Alarms globally!");
  };

  const triggerUIRefresh = () => {
    // Dispatch a custom storage event to notify other sections of App
    window.dispatchEvent(new Event("storage"));
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Admin Panel Header banner */}
      <div className="p-6 bg-gradient-to-r from-red-950/20 via-[#0a0f18] to-amber-950/15 rounded-xl border border-rose-900/30">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-rose-500" />
          DEXMOONA Master Admin Control Panel (SYS)
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Authorized console to audit connected alarms, moderate system state, toggle advertisements, and clear storage parameters instantly.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg animate-fade-in flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Currently Active Users
          </span>
          <div className="text-3xl font-black text-indigo-400 font-mono mt-2">{activeUsers} sessions</div>
          <span className="text-[10px] text-slate-550 mt-2 block font-mono">Mocked session count (localStorage synced)</span>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-amber-500" /> Cross-User Price Alarms
          </span>
          <div className="text-3xl font-black text-amber-500 font-mono mt-2">{allAlarms.length} Alarms</div>
          <span className="text-[10px] text-slate-550 mt-2 block font-mono">Active thresholds compiled across users</span>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Server Performance Core
          </span>
          <div className="text-xs font-mono text-slate-350 mt-3 space-y-1">
            <div className="flex justify-between">
              <span>CPU Load:</span>
              <span className="text-cyan-400 font-bold">{cpuUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span>RAM Consumption:</span>
              <span className="text-cyan-400 font-bold">{ramUsage}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SYS POLICIES AND SWITCH overrides */}
        <div className="bg-[#11161d] p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#f3ba2f] font-mono border-b border-slate-805 pb-3 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#f3ba2f]" /> Feature Toggle Policies
          </h3>

          <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-850 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">"Advertise Campaign" Button</span>
              <p className="text-[11px] text-slate-550 mt-1">Enable or disable advertisement campaign options for all platform clients.</p>
            </div>
            <button
              onClick={handleToggleAds}
              className="p-1 focus:outline-none transition group"
            >
              {adsEnabled ? (
                <ToggleRight className="w-10 h-10 text-emerald-400 transition cursor-pointer" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-600 transition cursor-pointer" />
              )}
            </button>
          </div>

          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs leading-relaxed text-orange-400 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block mb-0.5">Global Override Mode</span>
              Disabling campaign features propagates instantly, turning off user-side placement forms and the "Promote Your Token" menu buttons.
            </div>
          </div>
        </div>

        {/* RECOVERY CONTROL SHELF */}
        <div className="bg-[#11161d] p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-rose-450 font-mono border-b border-slate-805 pb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-550" /> Database & Storage Clear Shelf
          </h3>

          <p className="text-[11px] hover:text-slate-300 text-slate-450 leading-relaxed font-mono">
            Direct action triggers to inspect and reset database state stored on browser local namespaces.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleClearAllWatchlists}
              className="p-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 text-left rounded-lg text-xs transition cursor-pointer flex flex-col justify-between h-20"
            >
              <Trash2 className="w-4 h-4" />
              <div className="text-right">
                <span className="font-extrabold block">Clear All Watchlists</span>
                <span className="text-[9px] text-slate-500 font-mono">Deletes 'dex_watchlist'</span>
              </div>
            </button>

            <button
              onClick={handleClearAllAlarms}
              className="p-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 text-left rounded-lg text-xs transition cursor-pointer flex flex-col justify-between h-20"
            >
              <Trash2 className="w-4 h-4" />
              <div className="text-right">
                <span className="font-extrabold block">Clear All Alarms</span>
                <span className="text-[9px] text-slate-500 font-mono">Deletes 'dex_alarms'</span>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* COMPILED ALARMS CONSOLE */}
      <div className="bg-[#11161d] p-5 rounded-xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 font-mono border-b border-slate-805 pb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" /> Compiled Active Alarms Audit
        </h3>

        {allAlarms.length === 0 ? (
          <p className="text-slate-550 text-xs py-4 text-center font-mono">No active alarms registered across local sessions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400 border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-850 h-8 text-[11px] uppercase tracking-wider">
                  <th className="font-bold">Symbol</th>
                  <th className="font-bold">Trigger Rule</th>
                  <th className="font-bold">Target Price</th>
                  <th className="font-bold">Status</th>
                  <th className="font-bold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {allAlarms.map((a) => (
                  <tr key={a.id} className="h-10 border-b border-slate-855/40 hover:bg-slate-900/20">
                    <td className="font-bold text-white">{a.tokenSymbol}</td>
                    <td>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${a.condition === "above" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        CRITERIA: CLIMBS {a.condition.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-extrabold text-slate-200">${a.targetPrice.toLocaleString()}</td>
                    <td>
                      <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${a.isTriggered ? "bg-amber-500/10 text-amber-400" : "bg-slate-900 text-slate-505"}`}>
                        {a.isTriggered ? "FIRED" : "WAITING"}
                      </span>
                    </td>
                    <td className="text-slate-505 text-[10px]">{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
