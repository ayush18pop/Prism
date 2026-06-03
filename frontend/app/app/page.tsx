"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PoolStats } from "@/components/pool/PoolStats";
import { StandingBidForm } from "@/components/lpd/StandingBidForm";
import { PositionCard } from "@/components/position/PositionCard";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { usePositionLogs } from "@/hooks/usePrismHook";
import { ADDRESSES } from "@/lib/addresses";

const DEMO_POOL_ID: `0x${string}` = '0x7f52e4ac938f61a7213250a221d1bb8a9344d1103be8333943bbec041b55b408'
  "0xd38cf08b590551581aedd2b2cfb733c0599a92bf85204b44626818dd09c64a97";

const POOL_MANAGER_ABI = [
  {
    name: "getSlot0",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
] as const;

// ROYGBIV — 7 colors, correct prism physics
const SPECTRUM = [
  { color: "#ef4444", y: 18 },
  { color: "#f97316", y: 36 },
  { color: "#eab308", y: 54 },
  { color: "#22c55e", y: 70 },
  { color: "#3b82f6", y: 86 },
  { color: "#6366f1", y: 104 },
  { color: "#8b5cf6", y: 122 },
];

function PrismMascot() {
  // Classic equilateral triangle prism — apex UP, base DOWN
  // Light enters left face, exits right face as ROYGBIV
  // Triangle: apex (150,12), bottom-left (55,148), bottom-right (245,148)
  // Left face midpoint (entry): ~(102,80)
  // Right face midpoint (exit): ~(197,80)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 px-3 py-6">
      <svg viewBox="0 0 300 160" className="w-full max-w-[320px]">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="glass-grad" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.15)" />
            <stop offset="50%"  stopColor="rgba(139,92,246,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>

        {/* Equilateral triangle — apex at top */}
        <polygon
          points="150,12 55,148 245,148"
          fill="url(#glass-grad)"
        />
        {/* Left face — brightest edge (light enters here) */}
        <line x1="150" y1="12" x2="55" y2="148"
          stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        {/* Right face — exit face */}
        <line x1="150" y1="12" x2="245" y2="148"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {/* Base — bottom face */}
        <line x1="55" y1="148" x2="245" y2="148"
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* White input beam — enters from LEFT, hits left face diagonally */}
        {/* Entry on left face at roughly (102, 80) — diagonal beam from far left */}
        {[0, 2, 4].map((offset, i) => (
          <line key={i}
            x1="0" y1={68 + offset}
            x2="102" y2={80 + offset * 0.5}
            stroke="white" strokeWidth={2 - i * 0.5}
            strokeLinecap="round" filter="url(#glow)">
            <animate attributeName="opacity"
              values={`${0.6 - i * 0.15};${0.95 - i * 0.1};${0.6 - i * 0.15}`}
              dur="3s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
          </line>
        ))}

        {/* 7 ROYGBIV beams — exit from right face at (197, 80), fan out to right */}
        {SPECTRUM.map(({ color, y }, i) => (
          <line key={color}
            x1="197" y1="80"
            x2="300" y2={y}
            stroke={color} strokeWidth="1.8"
            strokeLinecap="round" filter="url(#glow)">
            <animate attributeName="opacity"
              values="0.2;1;0.2"
              dur="3s" begin={`${i * 0.14}s`} repeatCount="indefinite" />
          </line>
        ))}

        {/* Refraction point on right face — glowing dot */}
        <circle cx="197" cy="80" r="3" fill="white" filter="url(#glow)">
          <animate attributeName="r"       values="2;4;2"     dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div className="text-center">
        <p className="font-display text-3xl italic text-white leading-none tracking-tight">Prism</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-400 font-medium tracking-wide">LP-Y</span>
          <span className="text-white/15 text-xs">·</span>
          <span className="px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/5 text-xs text-violet-400 font-medium tracking-wide">LP-D</span>
        </div>
        <p className="text-[11px] text-white/20 mt-2 tracking-widest uppercase">One deposit · Two tokens</p>
      </div>
    </div>
  );
}

export default function AppPage() {
  const { address, isConnected, chainId } = useAccount();
  const { data: posLogs } = usePositionLogs();

  const isCorrectNetwork = chainId === 1301;
  const contractsDeployed = !!ADDRESSES.PrismHook;

  const { data: slot0 } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: POOL_MANAGER_ABI,
    functionName: "getSlot0",
    args: [DEMO_POOL_ID],
    chainId: 1301,
    query: { enabled: !!ADDRESSES.PoolManager, refetchInterval: 5_000 },
  });

  const currentSqrtPrice = slot0?.[0] ?? 0n;
  const positions = posLogs?.map((log) => log.args.posId as `0x${string}`) ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="font-display text-xl text-white tracking-tight">
            Prism
          </a>
          <div className="liquid-glass rounded-full px-1 py-1">
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
        </div>
      </nav>

      {!ADDRESSES.PrismHook && <DemoBanner />}

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-violet-600/[0.05] blur-[100px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[350px] h-[350px] rounded-full bg-emerald-500/[0.025] blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-12 gap-3">

          {/* ── Row 1 ── */}

          {/* Prism mascot */}
          <div
            className="col-span-4 liquid-glass rounded-2xl relative overflow-hidden"
            style={{ minHeight: 300 }}
          >
            <div
              className="absolute inset-0 animate-spin-slow rounded-2xl opacity-70"
              style={{
                background:
                  "conic-gradient(from 180deg at 30% 70%, rgba(139,92,246,0.08) 0deg, transparent 60deg, rgba(16,185,129,0.05) 160deg, transparent 220deg, rgba(245,158,11,0.04) 300deg, transparent 360deg)",
              }}
            />
            <div className="relative z-10 h-full">
              <PrismMascot />
            </div>
          </div>

          {/* Pool stats */}
          <div className="col-span-5">
            <PoolStats poolId={DEMO_POOL_ID} />
          </div>

          {/* Stat tiles */}
          <div className="col-span-3 flex flex-col gap-3">
            {/* $0 IL tile */}
            <div className="liquid-glass rounded-2xl px-5 py-6 flex flex-col justify-between flex-1 relative overflow-hidden">
              {/* Shield art — visible watermark */}
              <svg className="absolute bottom-0 right-0 opacity-[0.12] pointer-events-none" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="0.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {/* Animated ring decoration */}
              <svg className="absolute top-3 right-3 opacity-20 pointer-events-none" width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#4ade80" strokeWidth="0.8" strokeDasharray="4 3">
                  <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="12s" repeatCount="indefinite" />
                </circle>
                <circle cx="18" cy="18" r="9" fill="none" stroke="#4ade80" strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite" />
                </circle>
              </svg>
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-[0.2em] relative z-10">IL on exit</p>
              <p className="font-mono text-5xl text-white mt-2 relative z-10">$0</p>
            </div>

            {/* 1s blocks tile */}
            <div className="liquid-glass rounded-2xl px-5 py-6 flex flex-col justify-between flex-1 relative overflow-hidden">
              {/* Lightning art — visible watermark */}
              <svg className="absolute bottom-0 right-0 opacity-[0.12] pointer-events-none" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="0.8">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {/* Pulsing dot grid decoration */}
              <svg className="absolute top-2 right-2 opacity-20 pointer-events-none" width="40" height="40" viewBox="0 0 40 40">
                {[10,20,30].map(x => [10,20,30].map(y => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#a78bfa">
                    <animate attributeName="opacity" values="0.2;1;0.2" dur={`${1.5 + (x+y)*0.02}s`} repeatCount="indefinite" />
                  </circle>
                )))}
              </svg>
              <p className="text-[10px] text-violet-400/60 uppercase tracking-[0.2em] relative z-10">Unichain blocks</p>
              <p className="font-mono text-5xl text-white mt-2 relative z-10">1s</p>
            </div>
          </div>

          {/* ── Row 2 ── */}

          {isConnected ? (
            <>
              <div className="col-span-7">
                {!isCorrectNetwork && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-3">
                    <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-0.5">
                      Wrong Network
                    </p>
                    <p className="text-xs text-white/40">
                      Switch to{" "}
                      <span className="text-white/60">Unichain Sepolia</span>{" "}
                      (chain 1301)
                    </p>
                  </div>
                )}
                {isCorrectNetwork ? (
                  <StandingBidForm poolId={DEMO_POOL_ID} />
                ) : contractsDeployed ? (
                  <div className="liquid-glass rounded-2xl p-5">
                    <p className="text-xs text-white/40">
                      Switch to Unichain Sepolia to set a standing bid.
                    </p>
                  </div>
                ) : (
                  <div className="liquid-glass rounded-2xl p-5">
                    <p className="text-xs text-white/40">
                      Connect to Unichain Sepolia to use the protocol.
                    </p>
                  </div>
                )}
              </div>

              {/* RSC Status */}
              <div className="col-span-5 liquid-glass rounded-2xl px-6 py-6 flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <div className="h-px w-4 bg-white/15" />
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">
                    Reactive Network
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <div
                      className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping"
                      style={{ animationDuration: "2s" }}
                    />
                    <div className="absolute inset-1.5 rounded-full bg-emerald-400/15 animate-pulse" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400 relative" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">PrismRSC</p>
                    <p className="text-xs text-white/35">Lasna testnet · live</p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-white/5 pt-4 mt-auto">
                  <div className="flex gap-3">
                    <span className="text-emerald-400/50 text-[10px] font-mono mt-0.5 flex-shrink-0 tracking-wider">
                      C1
                    </span>
                    <p className="text-xs text-white/35 leading-relaxed">
                      Price reverts ±1% of entry → settle LP-D, return collateral
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-amber-400/50 text-[10px] font-mono mt-0.5 flex-shrink-0 tracking-wider">
                      C3
                    </span>
                    <p className="text-xs text-white/35 leading-relaxed">
                      Vault reaches 90% drawdown → force settle
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-12 liquid-glass rounded-2xl px-6 py-5 flex items-center gap-8">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                  <div className="w-3 h-3 rounded-full bg-emerald-400 relative" />
                </div>
                <div>
                  <p className="text-sm text-white">PrismRSC</p>
                  <p className="text-xs text-white/30">Lasna testnet</p>
                </div>
              </div>
              <div className="h-5 w-px bg-white/8 flex-shrink-0" />
              <div className="flex gap-8 text-xs text-white/30">
                <span>
                  <span className="text-emerald-400/50 font-mono mr-2">C1</span>
                  Price reversion ±1% → auto-settle
                </span>
                <span>
                  <span className="text-amber-400/50 font-mono mr-2">C3</span>
                  90% drawdown → force settle
                </span>
              </div>
            </div>
          )}

          {/* ── Row 3: Active Positions ── */}
          <div className="col-span-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-4 bg-white/15" />
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">
                Active Positions
              </p>
              {positions.length > 0 && (
                <span className="text-[10px] text-white/20 font-mono">
                  {positions.length}
                </span>
              )}
            </div>

            {positions.length === 0 ? (
              <div className="border border-white/[0.06] rounded-2xl py-14 text-center">
                <p className="text-sm text-white/25">No active positions.</p>
                <a
                  href="https://app.uniswap.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-glass inline-block mt-4 rounded-full px-6 py-2 text-xs text-white hover:scale-[1.03] transition-transform"
                >
                  Deposit on Uniswap v4 →
                </a>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {positions.map((posId) => (
                  <PositionCard
                    key={posId}
                    posId={posId}
                    currentSqrtPrice={currentSqrtPrice}
                    account={address ?? "0x0000000000000000000000000000000000000000"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
