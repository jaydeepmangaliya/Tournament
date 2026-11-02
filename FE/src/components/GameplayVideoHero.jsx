import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const GameplayVideoHero = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.play().catch(() => {});
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-black" style={{ minHeight: 'clamp(320px, 56vw, 780px)' }}>

      {/* Background video — always autoplays, no controls */}
      <video
        ref={videoRef}
        src="/videos/videoplayback.mp4"
        poster="/videos/preview_frame.jpg"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.62) saturate(1.1)' }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/70 via-transparent to-[#050507]/30 pointer-events-none" />

      {/* Scan-line texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Content layer */}
      <div
        className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-8 lg:px-16 pb-10 sm:pb-14 lg:pb-20 pt-24 sm:pt-32"
        style={{ minHeight: 'clamp(320px, 56vw, 780px)' }}
      >
        {/* Live pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.55 }}
          className="mb-4 flex items-center gap-2"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-zinc-300 select-none">
            Combat Footage — Free Fire &amp; PUBG Mobile
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight max-w-3xl"
          style={{ textShadow: '0 2px 32px rgba(0,0,0,0.7)' }}
        >
          Where Every Frag<br className="hidden sm:block" />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg,#e4e4e7,#a1a1aa)' }}
          >
            &nbsp;Pays Cash.
          </span>
        </motion.h2>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.55 }}
          className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed"
          style={{ textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}
        >
          Join real competitive lobbies. Per-frag bounties + rank rewards auto-credited to your UPI wallet.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 sm:mt-8 flex flex-wrap gap-3 items-center"
        >
          <Link
            to="/tournaments"
            className="px-6 sm:px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95"
            style={{ backgroundImage: 'linear-gradient(135deg,#e4e4e7,#a1a1aa)', boxShadow: '0 0 24px rgba(228,228,231,0.18)' }}
          >
            Enter Arena
          </Link>
          <Link
            to="/tournaments"
            className="px-6 sm:px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-zinc-200 border border-zinc-600 bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          >
            View Tournaments
          </Link>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-8 sm:mt-10 flex flex-wrap gap-x-8 gap-y-2"
        >
          {[
            { label: 'Active Players', value: '12,400+' },
            { label: 'Tournaments Live', value: '48' },
            { label: 'Prize Pool Today', value: 'Rs. 2.4L' },
            { label: 'UPI Payouts', value: 'Instant' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="text-base sm:text-lg font-black text-white">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-28 bg-gradient-to-t from-[#050507] to-transparent pointer-events-none" />
    </section>
  );
};

export default GameplayVideoHero;
