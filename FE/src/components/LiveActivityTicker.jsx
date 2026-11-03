import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function LiveActivityTicker() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (isMounted) setLoading(false);
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
            {marqueeItems.map((item, idx) => (
              <div
                key={`${item.id || idx}-${idx}`}
                className="inline-flex items-center space-x-2 text-xs"
              >
                {item.type === 'winning' ? (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                    <svg className="w-3 h-3 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                      <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                    <span>WINNER</span>
                  </span>
                ) : item.type === 'withdrawal' ? (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>PAYOUT</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                    <svg className="w-3 h-3 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>{item.category || 'INFO'}</span>
                  </span>
                )}

                <span className="text-zinc-200 text-[11px] sm:text-xs font-medium">
                  {item.text}
                </span>

                <span className="text-zinc-700 select-none font-bold mx-1">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
