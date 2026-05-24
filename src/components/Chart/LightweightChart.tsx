/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { CandleData } from "../../services/dexscreener";

interface LightweightChartProps {
  candles: CandleData[];
  priceColor?: string;
}

export default function LightweightChart({ candles, priceColor = "#3b82f6" }: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candeSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container contents
    containerRef.current.innerHTML = "";

    // 1. Initialize Chart styling with deep dark tones
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#0e1115" },
        textColor: "#cbd5e1",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "rgba(38, 50, 68, 0.4)" },
        horzLines: { color: "rgba(38, 50, 68, 0.4)" },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: "#475569",
          width: 1,
          style: 1, // Dashed
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "#475569",
          width: 1,
          style: 1, // Dashed
          labelBackgroundColor: "#1e293b",
        },
      },
      rightPriceScale: {
        borderColor: "#263244",
        autoScale: true,
      },
      timeScale: {
        borderColor: "#263244",
        timeVisible: true,
        secondsVisible: false,
      },
    }) as any;

    // 2. Add Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // 3. Add Volume Series in secondary scale / pane format
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(59, 130, 246, 0.35)",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Overlay over the standard candles scale
    });

    // Configure overlay height inside scale
    chart.priceScale("").applyOptions({
      scaleMargins: {
        top: 0.75, // Volume occupies bottom 25% of chart
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candeSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // 4. Update candle data streams
    if (candles && candles.length > 0) {
      candlestickSeries.setData(candles);

      const volumeData = candles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)"
      }));
      volumeSeries.setData(volumeData);
      
      chart.timeScale().fitContent();
    }

    // 5. Setup ResizeObserver for responsive resizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width } = entries[0].contentRect;
      chart.resize(width, 400);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles]);

  return (
    <div className="w-full relative bg-[#0e1115] rounded-xl border border-slate-800 overflow-hidden p-2">
      {/* Top Chart Navigation Labels */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3 text-xs bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-800">
        <span className="text-emerald-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Candle Feed
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400 font-mono">Precision Tracking</span>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: "400px" }} />
    </div>
  );
}
