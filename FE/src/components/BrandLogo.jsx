import React from 'react';

export default function BrandLogo({ size = 'md', showTagline = false, className = '' }) {
  // Size presets
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm tracking-widest',
    md: 'text-base sm:text-lg tracking-widest',
    lg: 'text-xl sm:text-2xl tracking-widest',
  };

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* 1. HIGH-TIER ESPORTS CREST EMBLEM */}
      <div className={`relative ${iconSizes[size] || iconSizes.md} flex-shrink-0 group`}>
        {/* Ambient Back Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 via-sky-500/20 to-transparent rounded-xl blur-sm group-hover:blur-md transition-all duration-300" />

        {/* Outer Shield Frame */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Metallic Chrome Rim Gradient */}
            <linearGradient id="crestRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="25%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Deep Obsidian Body Gradient */}
            <linearGradient id="crestBg" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Electric Cyan Neon Gradient */}
            <linearGradient id="cyanCore" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            {/* Silver Chrome Monogram Gradient */}
            <linearGradient id="crestSilver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Hexagonal Shield Body */}
          <path
            d="M20 2.5 L35.5 8.5 V23.5 C35.5 31.5 20 37.5 20 37.5 C20 37.5 4.5 31.5 4.5 23.5 V8.5 L20 2.5 Z"
            fill="url(#crestBg)"
            stroke="url(#crestRim)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* Top Glass Highlight Refraction */}
          <path
            d="M20 4.2 L33 9.3 V16 L20 10.5 L7 16 V9.3 L20 4.2 Z"
            fill="#ffffff"
            fillOpacity="0.07"
          />

          {/* 'L' Monogram Stem & Base */}
          <path
            d="M12 11.5 H16.5 V24 H26.5 L24.2 27.8 H12 V11.5 Z"
            fill="url(#crestSilver)"
            filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
          />

          {/* 'E' Top Aerodynamic Wing */}
          <path
            d="M18.8 11.5 H28 L25.5 15.2 H18.8 V11.5 Z"
            fill="url(#cyanCore)"
            filter="drop-shadow(0px 0px 3px rgba(34,211,238,0.8))"
          />

          {/* 'E' Middle Aerodynamic Wing */}
          <path
            d="M18.8 17.5 H26 L23.8 21.2 H18.8 V17.5 Z"
            fill="url(#cyanCore)"
            filter="drop-shadow(0px 0px 3px rgba(34,211,238,0.8))"
          />

          {/* Cybernetic Bottom Accent */}
          <polygon points="20,33.5 18.8,35.2 21.2,35.2" fill="#22d3ee" opacity="0.9" />
        </svg>
      </div>

      {/* 2. STYLIZED ESPORTS BRAND TYPOGRAPHY */}
      <div className="flex flex-col justify-center">
        <div className={`font-black uppercase flex items-center leading-none ${textSizes[size] || textSizes.md}`}>
          {/* "LOCAL" - Razor sharp arctic white */}
          <span className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] font-black">
            LOCAL
          </span>

          {/* Clean Neon Slash Accent */}
          <span className="mx-1.5 text-cyan-400 font-mono text-xs font-black select-none">
            /
          </span>

          {/* "ESPORT" - High-energy Electric Cyan */}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] font-black">
            ESPORT
          </span>
        </div>

        {/* Optional Sub-tagline */}
        {showTagline && (
          <span className="text-[8px] font-bold tracking-[0.22em] uppercase text-zinc-400 mt-0.5">
            Competitive Gaming Arena
          </span>
        )}
      </div>
    </div>
  );
}
