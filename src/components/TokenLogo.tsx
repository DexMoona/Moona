/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

interface TokenLogoProps {
  chainId?: string;
  address?: string;
  symbol?: string;
  imageUrl?: string;
  className?: string;
  sizeClass?: string;
  fallbackColor?: string;
}

export default function TokenLogo({
  chainId = "",
  address = "",
  symbol = "",
  imageUrl,
  className = "",
  sizeClass = "w-8 h-8",
  fallbackColor = "#312e81"
}: TokenLogoProps) {
  const [srcIndex, setSrcIndex] = useState<number>(0);
  const [failed, setFailed] = useState<boolean>(false);

  // Generate source candidates list
  const srcCandidates: string[] = [];

  if (imageUrl) {
    srcCandidates.push(imageUrl);
  }

  const cleanChain = chainId.trim().toLowerCase();
  const cleanAddr = address.trim();

  if (cleanChain && cleanAddr) {
    // 0. Solana specialized proxies for robust image availability
    if (cleanChain === "sol" || cleanChain === "solana") {
      srcCandidates.push(`https://logo.key.app/t/${cleanAddr}`);
      srcCandidates.push(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${cleanAddr}/logo.png`);
    }

    // 1. DexScreener dynamic CDN candidate
    srcCandidates.push(`https://dd.dexscreener.com/ds-data/tokens/${cleanChain}/${cleanAddr}.png`);

    // 2. Trust Wallet Assets candidates mapping
    let trustChain = cleanChain;
    if (cleanChain === "eth" || cleanChain === "ethereum_main") {
      trustChain = "ethereum";
    } else if (cleanChain === "bsc") {
      trustChain = "smartchain";
    } else if (cleanChain === "sol" || cleanChain === "solana") {
      trustChain = "solana";
    } else if (cleanChain === "arb") {
      trustChain = "arbitrum";
    } else if (cleanChain === "avax") {
      trustChain = "avalanchec";
    }

    if (trustChain) {
      srcCandidates.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustChain}/assets/${cleanAddr}/logo.png`);
    }
  }

  // Reset indices on trigger changes
  useEffect(() => {
    setSrcIndex(0);
    setFailed(false);
  }, [imageUrl, chainId, address]);

  const handleError = () => {
    if (srcIndex < srcCandidates.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setFailed(true);
    }
  };

  const currentSrc = srcCandidates[srcIndex];

  if (!failed && currentSrc) {
    return (
      <img
        src={currentSrc}
        alt={symbol}
        onError={handleError}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-lg object-contain shrink-0 bg-slate-900 border border-slate-800/40 ${className}`}
      />
    );
  }

  // Elegant fallback circle with character abbreviation
  const text = symbol ? symbol.substring(0, 2).toUpperCase() : "?";

  return (
    <div
      className={`${sizeClass} rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none text-white ${className}`}
      style={{ backgroundColor: fallbackColor }}
    >
      {text}
    </div>
  );
}
