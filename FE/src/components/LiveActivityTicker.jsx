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

  // Duplicate the array so marquee loops seamlessly without blank gaps
  const marqueeItems = [...items, ...items, ...items];

  return (
    <div className="w-full bg-[#08080c]/95 border-b border-zinc-800/70 overflow-hidden py-2 backdrop-blur-md z-30 select-none">
      <div className="flex items-center">
        {/* Left Fixed Badge */}
        <div className="flex items-center space-x-1.5 px-3 sm:px-4 py-0.5 bg-zinc-950 border-r border-zinc-800 z-10 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-wider text-white">
            LIVE ARENA
          </span>
        </div>

        {/* Scrolling Continuous Marquee Track */}
        <div className="overflow-hidden whitespace-nowrap flex flex-1">
          <div className="flex items-center space-x-8 animate-marquee hover:[animation-play-state:paused]">
            {marqueeItems.map((item, idx) => (
              <div key={`${item.id || idx}-${idx}`} className="inline-flex items-center space-x-2 text-xs font-medium">
                {item.type === 'winning' ? (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
                    WINNER
                  </span>
                ) : item.type === 'withdrawal' ? (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider">
                    PAYOUT
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black uppercase tracking-wider">
                    INFO
                  </span>
                )}
                <span className="text-zinc-300 text-[11px] sm:text-xs">
                  {item.text}
                </span>
                <span className="text-zinc-600 text-xs">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
