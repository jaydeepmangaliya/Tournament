import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Helper to strip cartoon unicode emojis and legacy prefixes so icons are 100% SVG
const sanitizeTickerText = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/^(LIVE ARENA|GUARANTEED CASHOUTS|FAST CREDENTIALS|SOLO AUTO-MATCH|COMPETITIVE ARENA|TOURNAMENTS|CASHOUTS):\s*/i, '')
    .trim();
};

export default function LiveActivityTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTicker = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tournaments/live-ticker`);
        if (res.data.status && isMounted) {
          setItems(res.data.data || []);
        }
      } catch (err) {
        // Silently continue
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  // Duplicate items for a continuous, seamless marquee loop without blank jumps
  const marqueeItems = [...items, ...items, ...items];

  const renderBadge = (item) => {
    if (item.type === 'winning') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
            <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span>WINNER</span>
        </span>
      );
    }

    if (item.type === 'withdrawal') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>PAYOUT</span>
        </span>
      );
    }

    const cat = (item.category || '').toUpperCase();

    if (cat.includes('TOURNAMENT') || cat.includes('ARENA')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          <span>ARENA</span>
        </span>
      );
    }

    if (cat.includes('CASHOUT')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>INSTANT UPI</span>
        </span>
      );
    }

    if (cat.includes('CREDENTIAL') || cat.includes('ROOM')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m21 2-9.6 9.6" />
            <path d="m15.5 7.5 3 3" />
          </svg>
          <span>ROOM ACCESS</span>
        </span>
      );
    }

    if (cat.includes('SOLO') || cat.includes('MATCH')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>AUTO-MATCH</span>
        </span>
      );
    }

    if (cat.includes('LEADERBOARD')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
          <svg className="w-3 h-3 text-yellow-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>RANKINGS</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-wider flex-shrink-0">
        <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{item.category || 'INFO'}</span>
      </span>
    );
  };

  return (
    <div className="w-full bg-[#08080c]/95 border-b border-zinc-800/80 overflow-hidden py-2 backdrop-blur-md z-30 select-none">
      <div className="flex items-center">
        {/* Left Fixed Badge */}
        <div className="flex items-center space-x-2 px-3 sm:px-4 py-0.5 bg-[#0e0e14] border-r border-zinc-800 z-10 flex-shrink-0 shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-200">
            LIVE ARENA
          </span>
        </div>

        {/* Scrolling Continuous Marquee Track */}
        <div className="overflow-hidden whitespace-nowrap flex flex-1">
          <div className="flex items-center space-x-7 animate-marquee hover:[animation-play-state:paused]">
            {marqueeItems.map((item, idx) => {
              const cleanText = sanitizeTickerText(item.text);
              return (
                <div
                  key={`${item.id || idx}-${idx}`}
                  className="inline-flex items-center space-x-2 text-xs"
                >
                  {renderBadge(item)}

                  <span className="text-zinc-200 text-[11px] sm:text-xs font-medium">
                    {cleanText}
                  </span>

                  <span className="text-zinc-700 select-none font-bold mx-1">•</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
