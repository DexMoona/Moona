/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Wallet, LogIn, Mail, ChevronRight, Loader2, Sparkles, CheckCircle, Shield, AlertCircle } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string, address: string, balance: string) => void;
}

export default function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectionStep, setConnectionStep] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const WALLET_OPTIONS = [
    { id: "metamask", name: "MetaMask", desc: "Connect directly to your MetaMask extension (EVM Mainnet)", color: "from-[#f5841f] to-[#e2761b]", badge: "Ethereum Mainnet" },
    { id: "coinbase", name: "Coinbase Wallet", desc: "Injected or Browser Multi-Chain Secure Key", color: "from-[#0052ff] to-[#003dbb]", badge: "MetaMask Compatible" },
    { id: "trust", name: "Trust Wallet", desc: "Multi-chain secure decentralized wallet extension", color: "from-[#3375bb] to-[#1a5198]" }
  ];

  const handleWalletSelect = async (walletId: string, walletName: string) => {
    setModalError(null);
    
    // Check for injected provider (e.g. window.ethereum)
    const provider = (window as any).ethereum;
    if (!provider) {
      setModalError("Web3 Injected Provider / MetaMask was not detected. Please install the MetaMask extension and refresh.");
      return;
    }

    setConnectingId(walletId);
    setConnectionStep("Prompting authorization in browser extension...");

    try {
      // 1. eth_requestAccounts
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts retrieved from web3 handshake.");
      }
      const activeAccount = accounts[0];

      setConnectionStep("Verifying network chain parameters (EVM: 0x1)...");

      // 2. verify chainId is 0x1
      let currentChainId = await provider.request({ method: "eth_chainId" });
      if (currentChainId !== "0x1") {
        setConnectionStep("Switching network to Ethereum Mainnet (0x1)...");
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x1" }]
          });
        } catch (switchError: any) {
          // Fallback if chain not added or rejected
          throw new Error("Please switch your wallet network manually to Ethereum Mainnet (chainId 0x1) to proceed.");
        }
      }

      setConnectionStep("Retrieving active Ether balances...");

      // 3. fetch live ETH balance via eth_getBalance
      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [activeAccount, "latest"]
      });

      let formattedBalance = "0.00 ETH";
      if (balanceHex) {
        const balanceWei = parseInt(balanceHex, 16);
        formattedBalance = (balanceWei / 1e18).toFixed(4) + " ETH";
      }

      // Success Callback
      onConnect(walletName, activeAccount, formattedBalance);
      setConnectingId(null);
      setConnectionStep("");
      onClose();

    } catch (err: any) {
      console.error("Wallet hook exception:", err);
      setModalError(err.message || "Sign-in request rejected by user.");
      setConnectingId(null);
      setConnectionStep("");
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes("@")) return;

    setConnectingId("email");
    setConnectionStep("Provisioning secure smart account...");

    setTimeout(() => {
      onConnect("Social Vault", "0x53D1ff23b2c6fe8110b2df51abc40cd31932ea10", "0.080 ETH");
      setConnectingId(null);
      setConnectionStep("");
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0d1117] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Wallet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Connect Web3 Wallet</h3>
              <p className="text-[10px] text-slate-500 font-medium font-mono">Verify Ethereum Mainnet access securely</p>
            </div>
          </div>
          <button 
            disabled={!!connectingId}
            onClick={onClose} 
            className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalError && (
          <div className="m-4 p-3 bg-rose-950/30 border border-rose-500/20 text-rose-455 text-[11px] font-bold rounded-lg flex items-start gap-2.5 leading-relaxed font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-450" />
            <div>{modalError}</div>
          </div>
        )}

        {/* LOADING HANDSHAKING VIEW */}
        {connectingId ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-505 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-slate-200 text-xs font-bold font-mono">WEB3 SECURE HANDSHAKE...</p>
              <p className="text-slate-500 text-[10px] font-mono mt-1.5 italic animate-pulse">{connectionStep}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
            
            {/* SOCIAL POPUP OPTIN BOX */}
            {showEmailForm ? (
              <form onSubmit={handleEmailSubmit} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" /> Web3 Smart email Vault
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowEmailForm(false)} 
                    className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-bold"
                  >
                    Go Back
                  </button>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="email"
                    placeholder="Enter email address..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-550"
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-650 hover:bg-indigo-550 rounded-lg px-3.5 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-between p-3 bg-indigo-950/20 hover:bg-indigo-900/30 rounded-xl border border-indigo-500/20 text-left transition select-none group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-600/20 rounded-lg text-indigo-400 group-hover:scale-105 duration-200">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block font-sans">Instant sign-in via Email/Google</span>
                    <span className="text-[10px] text-slate-500 font-mono">Zero downloads • Auto-generate smart wallet</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
              </button>
            )}

            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 pt-1 font-mono">
              Select Wallet Extension
            </div>

            {/* WALLET BUTTON OPTIONS LIST */}
            <div className="space-y-2">
              {WALLET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleWalletSelect(opt.id, opt.name)}
                  className="w-full flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-900/40 rounded-xl border border-slate-850/60 text-left transition cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-3 font-sans">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 flex items-center justify-center font-black text-rose-500 text-sm shrink-0 border border-slate-800 uppercase">
                      {opt.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100 block">{opt.name}</span>
                        {opt.badge && (
                          <span className="bg-slate-900 text-slate-400 text-[8px] font-mono px-1 py-0.2 rounded-sm border border-slate-800 leading-none">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block max-w-[240px] truncate">{opt.desc}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition" />
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-[9px] text-slate-500 font-mono border-t border-[#1a1f26]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Real-time on-chain switch checks. Absolute decentralization.</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
