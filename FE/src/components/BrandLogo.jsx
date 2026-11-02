import React from 'react';

export default function BrandLogo({ size = 'md', showTagline = false, className = '' }) {
  // Size presets
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm tracking-[0.14em]',
    md: 'text-base sm:text-lg tracking-[0.16em]',
    lg: 'text-xl sm:text-2xl tracking-[0.18em]',
  };

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* 1. HIGH-TIER ESPORTS CREST EMBLEM */}
      <div className={`relative ${iconSizes[size] || iconSizes.md} flex-shrink-0 group`}>
        {/* Ambient Back Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-sky-500/10 to-transparent rounded-xl blur-md group-hover:blur-lg transition-all duration-300" />

        {/* Outer Shield Frame */}
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Metallic Silver Rim Gradient */}
            <linearGradient id="shieldRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Deep Obsidian Background */}
            <linearGradient id="shieldBg" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#12141f" />
              <stop offset="100%" stopColor="#08080d" />
            </linearGradient>

            {/* Monogram "L" Metallic Gradient */}
            <linearGradient id="monogramL" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Electric Cyan Lightning Core */}
            <linearGradient id="lightningBolt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Hexagonal Shield Body */}
          <path
            d="M18 2.5 L31.5 8 V21 C31.5 27.5 18 33.5 18 33.5 C18 33.5 4.5 27.5 4.5 21 V8 L18 2.5 Z"
            fill="url(#shieldBg)"
            stroke="url(#shieldRim)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* Faceted Top Reflection Accent */}
          <path
            d="M18 3.5 L30 8.5 V15 L18 10 L6 15 V8.5 L18 3.5 Z"
            fill="white"
            fillOpacity="0.05"
          />

          {/* Bold Monogram "L" Cradle */}
          <path
            d="M9.5 9.5 H13.5 V22.5 H23.5 L21.5 26 H9.5 V9.5 Z"
            fill="url(#monogramL)"
          />

          {/* Electric Neon Apex Lightning Slashing Through Center */}
          <path
            d="M21 7 L13 18.5 H19 L15 28 L25.5 15.5 H19.5 L23 7 Z"
            fill="url(#lightningBolt)"
            className="filter drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"
          />
        </svg>
      </div>

      {/* 2. STYLIZED ESPORTS BRAND TYPOGRAPHY */}
      <div className="flex flex-col justify-center">
        <div className={`font-black uppercase flex items-center leading-none ${textSizes[size] || textSizes.md}`}>
          {/* "LOCAL" - Razor sharp arctic white with custom styled apex 'A' */}
          <span className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] flex items-center">
            <span>LOC</span>
            {/* Styled Apex Character 'A' with cyan cross-notch */}
            <span className="relative inline-block mx-[0.5px]">
              <span className="text-white">A</span>
              <span className="absolute bottom-[3px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-cyan-400 to-sky-300 rounded-full shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
            </span>
            <span>L</span>
          </span>

          {/* Futuristic Micro-Separator */}
          <span className="mx-1 text-cyan-400/50 font-mono text-xs select-none">/</span>

          {/* "ESPORT" - Metallic Silver-Chrome with Electric Ice Sheen */}
          <span className="relative inline-block font-black bg-gradient-to-r from-cyan-300 via-slate-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_1px_6px_rgba(56,189,248,0.25)]">
            <span>E</span>
            <span className="text-zinc-200">S</span>
            <span className="text-zinc-100">P</span>
            <span className="text-zinc-300">O</span>
            <span className="text-zinc-200">R</span>
            <span className="text-zinc-400">T</span>
          </span>
        </div>

        {/* Optional Micro Tagline */}
        {showTagline && (
          <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-zinc-400 mt-0.5">
            Competitive Gaming Arena
          </span>
        )}
      </div>
    </div>
  );
}

