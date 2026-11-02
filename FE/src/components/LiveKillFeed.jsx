import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LIVE_EVENTS = [
  {
    id: 1,
    type: 'kill',
    game: 'Free Fire',
    killerTeam: 'SOUL',
    killer: 'Viper_FF',
    weapon: 'M1014 Shotgun',
    victimTeam: 'GODL',
    victim: 'Shadow99',
    bounty: '₹25 Bounty',
    time: 'Just now',
  },
  {
    id: 2,
    type: 'payout',
    game: 'System',
    player: 'SniperKing_99',
    amount: '₹850.00',
    method: 'UPI (PhonePe)',
    time: '30s ago',
  },
  {
    id: 3,
    type: 'kill',
    game: 'PUBG Mobile',
    killerTeam: 'TX',
    killer: 'Jonathan_007',
    weapon: 'AWM Headshot',
    victimTeam: 'BLIND',
    victim: 'Hydra_Flick',
    bounty: '₹50 Bounty',
    time: '1m ago',
  },
  {
    id: 4,
    type: 'match_ready',
    game: 'Free Fire',
    title: '48-Player BR Bermuda #104',
    status: 'ROOM OPEN - 48/48 Filled',
    time: '2m ago',
  },
  {
    id: 5,
    type: 'kill',
    game: 'Free Fire',
    killerTeam: 'APEX',
    killer: 'Mortal_One',
    weapon: 'Desert Eagle',
    victimTeam: 'TEAM 8',
    victim: 'CyberGhoul',
    bounty: 'Clutch ACE (Round 7/7)',
    time: '2m ago',
  },
  {
    id: 6,
    type: 'payout',
    game: 'System',
    player: 'Rohan_Affiliate',
    amount: '₹1,420.00',
    method: 'Bank Transfer (10% Commission)',
    time: '3m ago',
  },
];

export default function LiveKillFeed() {
  const [events, setEvents] = useState(LIVE_EVENTS);
  const [activeIdx, setActiveIdx] = useState(0);

  // Rotate items smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const current = events[activeIdx];

  return (
    <div className="w-full bg-[#07070a] border-y border-zinc-800/80 px-3 sm:px-6 py-2 relative">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 min-h-[38px]">
        {/* Left Live Indicator Badge */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-700/80 px-2.5 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">LIVE BATTLE FEED</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono hidden md:inline">Real-time match frags & automated UPI cashouts</span>
        </div>

        {/* Dynamic Event Ticker */}
        <div className="flex-1 w-full flex items-center justify-center sm:justify-end min-h-[34px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2 text-xs"
            >
              {current.type === 'kill' && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#0e0e14] border border-zinc-700 px-3 py-1.5 rounded-xl shadow-sm">
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {current.game}
                  </span>
                  <span className="font-bold text-white font-mono">
                    [{current.killerTeam}] {current.killer}
                  </span>
                  
                  {/* Weapon Vector SVG */}
                  <div className="flex items-center space-x-1 px-1 text-silver font-mono text-[10px]">
                    <svg className="w-3.5 h-3.5 inline text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="18" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                    </svg>
                    <span>{current.weapon}</span>
                  </div>

                  <span className="text-zinc-400 font-mono text-xs">
                    [{current.victimTeam}] {current.victim}
                  </span>

                  <span className="text-[10px] font-black text-silver bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    {current.bounty}
                  </span>
                </div>
              )}

              {current.type === 'payout' && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#0e0e14] border border-zinc-700 px-3 py-1.5 rounded-xl shadow-sm">
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-silver border border-zinc-700 font-mono">
                    CASHOUT VERIFIED
                  </span>
                  <span className="font-bold text-white font-mono">{current.player}</span>
                  <span className="text-zinc-400 text-xs">withdrew</span>
                  <strong className="text-silver font-black font-mono text-sm">{current.amount}</strong>
                  <span className="text-zinc-500 text-[10px] hidden sm:inline">via {current.method}</span>
                </div>
              )}

              {current.type === 'match_ready' && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#0e0e14] border border-zinc-700 px-3 py-1.5 rounded-xl shadow-sm">
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white text-black font-mono">
                    ROOM LIVE
                  </span>
                  <span className="font-bold text-white text-xs">{current.title}</span>
                  <span className="text-silver text-[11px] font-mono font-bold">{current.status}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
