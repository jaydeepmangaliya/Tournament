import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────
   CinematicYouTube
   YouTube video plays as a FULL-SECTION
   background — same layout as GameplayVideoHero.
   The iframe is scaled/centered to cover the
   entire section. Overlays hide all YouTube UI.
───────────────────────────────────────────── */

const VIDEO_ID = 'SAVw-TdDDA0';

const CinematicYouTube = () => {
  const [soundOn, setSoundOn] = useState(false);

  // Rebuild src when user enables sound (forces iframe reload)
  const ytSrc = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=${soundOn ? 0 : 1}&controls=0&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${VIDEO_ID}&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`;

  return (
    <section
      className="relative w-full overflow-hidden bg-black"
      style={{ minHeight: 'clamp(320px, 56vw, 780px)' }}
    >
      {/* ── YouTube iframe as full-bleed background ── */}
      {/* Classic 16:9 cover trick: scale iframe so it always fills the container */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <iframe
          key={soundOn}               /* remount on sound toggle */
          src={ytSrc}
          title="Free Fire Tournament Highlights"
          allow="autoplay; encrypted-media"
          className="absolute border-0"
          style={{
            /* Cover the section like object-fit:cover for an iframe */
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'max(100%, 177.78vh)',   /* 16:9 → width = 16/9 × height */
            height: 'max(100%, 56.25vw)',  /* 16:9 → height = 9/16 × width */
            minWidth: '100%',
            minHeight: '100%',
            filter: 'brightness(0.6) saturate(1.1)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Hard overlays — kill every YouTube UI element ── */}
      {/* Top bar: hides title + YouTube logo */}
      <div className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #000 0%, transparent 100%)' }} />
      {/* Bottom bar: hides progress bar + controls */}
      <div className="absolute bottom-0 left-0 right-0 h-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #000 0%, transparent 100%)' }} />
      {/* Left edge */}
      <div className="absolute top-0 left-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #000 0%, transparent 100%)' }} />
      {/* Right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #000 0%, transparent 100%)' }} />

      {/* ── Design gradients (same as GameplayVideoHero) ── */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#050507]/70 via-transparent to-[#050507]/30 pointer-events-none" />

      {/* ── Scan-line texture ── */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* ── Content layer — identical structure to GameplayVideoHero ── */}
      <div
        className="relative z-20 h-full flex flex-col justify-end px-4 sm:px-8 lg:px-16 pb-10 sm:pb-14 lg:pb-20 pt-24 sm:pt-32"
        style={{ minHeight: 'clamp(320px, 56vw, 780px)' }}
      >
        {/* Live pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.55 }}
          className="mb-4 flex items-center gap-2"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-zinc-300 select-none">
            Tournament Highlights — Free Fire
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight max-w-3xl"
          style={{ textShadow: '0 2px 32px rgba(0,0,0,0.7)' }}
        >
          Real Matches.<br className="hidden sm:block" />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg,#e4e4e7,#a1a1aa)' }}
          >
            &nbsp;Real Stakes.
          </span>
        </motion.h2>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.32, duration: 0.55 }}
          className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed"
          style={{ textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}
        >
          Watch live tournament footage from our Free Fire competitive series. Every kill earns bounties, every rank pays out.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.44, duration: 0.5 }}
          className="mt-6 sm:mt-8 flex flex-wrap gap-3 items-center"
        >
          <Link
            to="/tournaments"
            className="px-6 sm:px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95"
            style={{ backgroundImage: 'linear-gradient(135deg,#e4e4e7,#a1a1aa)', boxShadow: '0 0 24px rgba(228,228,231,0.18)' }}
          >
            Join Tournament
          </Link>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn(s => !s)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-zinc-200 border border-zinc-600 bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          >
            {soundOn ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                Mute
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l1.73 1.73L21 18.46 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
                Sound On
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Bottom fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-28 z-20 bg-gradient-to-t from-[#050507] to-transparent pointer-events-none" />
    </section>
  );
};

export default CinematicYouTube;
