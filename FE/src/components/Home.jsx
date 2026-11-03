import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as THREE from 'three';
import BIRDS from 'vanta/dist/vanta.birds.min';
import EarningsCalculator from './EarningsCalculator';
import LiveActivityTicker from './LiveActivityTicker';
import GameplayVideoHero from './GameplayVideoHero';
import CinematicYouTube from './CinematicYouTube';

// 1. Interactive Three.js Vanta 3D Particle Background
const ParticleBackground = () => {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && vantaRef.current && THREE && BIRDS) {
      try {
        if (!vantaEffect.current) {
          vantaEffect.current = BIRDS({
            el: vantaRef.current,
            THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            backgroundColor: 0x000000,
            color1: 0xffffff,
            color2: 0xaaaaaa,
            wingSpan: 40.0,
            separation: 42.0,
            alignment: 100.0,
            cohesion: 63.0,
            quantity: 5.0,
          });

          const handleResize = () => {
            if (vantaEffect.current && typeof vantaEffect.current.resize === 'function') {
              vantaEffect.current.resize();
            }
          };
          window.addEventListener('resize', handleResize);
          window.addEventListener('orientationchange', handleResize);
        }
      } catch (err) {
        console.error('[VANTA] Three.js init error:', err);
      }
    }

    return () => {
      if (vantaEffect.current) {
        try {
          vantaEffect.current.destroy();
          vantaEffect.current = null;
        } catch (err) {
          console.error('[VANTA] Three.js destroy error:', err);
        }
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className="absolute inset-0"
      style={{ width: '100%', height: '100%', zIndex: 0 }}
    />
  );
};

export default function Home() {
  const [featuredTournaments, setFeaturedTournaments] = useState([]);
  const [modeTab, setModeTab] = useState('player'); // 'player' | 'affiliate'
  const [gameTab, setGameTab] = useState('free-fire'); // 'free-fire' | 'pubg'
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  // Fetch Live Tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tournaments`);
        if (res.data.status && res.data.data.length > 0) {
          setFeaturedTournaments(res.data.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load tournaments', err);
      }
    };
    fetchTournaments();
  }, []);

  // Testimonials Carousel
  const testimonials = [
    {
      id: 1,
      name: 'Aman "Viper" Sharma',
      role: 'Team Captain, Soul Predators',
      game: 'Free Fire 4v4 Clash Squad',
      content:
        'The automated room credential distribution and instantaneous UPI settlements set LocalEsport apart. We have won over ₹24,000 across weekend custom cups with zero payment delay.',
    },
    {
      id: 2,
      name: 'Rohan "Ghost" Verma',
      role: 'Esports Guild Leader & Partner',
      game: 'PUBG Mobile & Free Fire',
      content:
        'Managing our 400-member community through the Affiliate Portal is completely frictionless. The 10% lifetime ticket commission is tracked per player and settled straight into our bank account.',
    },
    {
      id: 3,
      name: 'Vikram "SniperX" Patel',
      role: 'Competitive Solo Fragger',
      game: 'PUBG Mobile Battle Royale',
      content:
        'The 48-player Battle Royale structure with individual frag bounties is brilliant. Even in tough lobbies where you finish top 5, high frag counts still net substantial prize money.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // Hall of Fame Leaderboard
  const topPlayers = [
    { rank: '01', name: 'TotalGamer_07', game: 'Free Fire 4v4 CS', kills: 148, winRate: '68%', points: '₹18,400' },
    { rank: '02', name: 'Soul_Mortal99', game: 'PUBG Mobile BR Squad', kills: 132, winRate: '64%', points: '₹14,900' },
    { rank: '03', name: 'Apex_SniperX', game: 'Free Fire 1v1 Duel', kills: 119, winRate: '72%', points: '₹12,200' },
    { rank: '04', name: 'Vicious_Clasher', game: 'Free Fire 2v2 Duo', kills: 104, winRate: '61%', points: '₹9,800' },
    { rank: '05', name: 'GhostRider_Pubg', game: 'PUBG Solo Survival', kills: 92, winRate: '58%', points: '₹8,100' },
  ];

  // 5 Step Process
  const startSteps = [
    {
      step: '01',
      title: 'Identity & Wallet Setup',
      desc: 'Create an account to generate your unique tracking identity (REF-XXXX for players or AFF-XXXX for affiliates) with an instant welcome balance.',
    },
    {
      step: '02',
      title: 'Tournament & Format Selection',
      desc: 'Choose between 1v1 Duels, 2v2 Duos, 4v4 Clash Squads, or complete 48-Player Battle Royale lobbies across Free Fire and PUBG Mobile.',
    },
    {
      step: '03',
      title: 'Squad Roster Registration',
      desc: 'Captain inputs in-game IGN and Character UIDs. Reserve your designated lobby slot number (Slot #1 through #12 in Battle Royale).',
    },
    {
      step: '04',
      title: 'Encrypted Room Credentials',
      desc: 'Custom Room ID and password unlock automatically on your private match dashboard exactly 15 minutes prior to the scheduled start time.',
    },
    {
      step: '05',
      title: 'Automated Payout & UPI Cashout',
      desc: 'Match ranks and per-frag bounties are credited directly to your withdrawable ledger with instant withdrawals to UPI or Bank Account.',
    },
  ];

  // Daily Schedule Matrix
  const dailySchedule = [
    { slot: 'Morning Cup', time: '11:00 AM IST', game: 'Free Fire', mode: '1v1 & 2v2 Custom Clash', fee: '₹30', pool: '₹500' },
    { slot: 'Midday Showdown', time: '03:00 PM IST', game: 'PUBG Mobile', mode: '4v4 Warehouse TDM', fee: '₹50', pool: '₹900' },
    { slot: 'Prime Evening', time: '07:30 PM IST', game: 'Free Fire', mode: '4v4 Clash Squad (CS)', fee: '₹100', pool: '₹1,800' },
    { slot: 'Midnight Warfare', time: '10:00 PM IST', game: 'PUBG / Free Fire', mode: '48-Player Battle Royale', fee: '₹120', pool: '₹3,000+' },
  ];

  // FAQs
  const faqs = [
    {
      q: 'How and when do I receive the custom room credentials?',
      a: 'The Custom Room ID and Password are automatically updated on your "My Matches" page exactly 15 minutes before match start time. Ensure all squad members join the room and sit in their assigned slot number.',
    },
    {
      q: 'How does the Affiliate Partner commission structure operate?',
      a: 'When you sign up as an Affiliate, you receive a dedicated AFF-XXXX link. Every player onboarded through your link is permanently attributed to your profile. You earn a guaranteed 10% commission on every tournament entry fee they purchase, with no lock-in or withdrawal thresholds.',
    },
    {
      q: 'Can regular players also refer friends and earn?',
      a: 'Yes. Every player receives a REF-XXXX code. When your referred friend participates in paid tournaments, you earn a 5% bonus credit directly in your wallet, which can be withdrawn to UPI or used for tournament entries.',
    },
    {
      q: 'What is the withdrawal process and how long does it take?',
      a: 'You can request a payout anytime directly to your UPI ID (PhonePe, Google Pay, Paytm) or Bank Account. Payouts are verified and settled within 2 to 4 business hours.',
    },
    {
      q: 'What are the rules regarding emulators and third-party software?',
      a: 'All tournaments on LocalEsport are strictly Mobile-Only unless a tournament title explicitly indicates PC/Emulator allowed. Players detected using emulators or unauthorized modifications face immediate disqualification and permanent platform ban.',
    },
    {
      q: 'How are match results and kills verified?',
      a: 'Match referees spectate custom lobbies and record official placement and kill tallies. In case of discrepancies, captains can submit post-match screenshot proof directly to dispute resolution.',
    },
  ];

  return (
    <div className="bg-[#050507] text-[#e4e4e7] min-h-screen overflow-x-hidden">
      {/* 1. HERO SECTION WITH 3D THREE.JS PARTICLES */}
      <section className="relative pt-28 pb-16 sm:pt-40 sm:pb-32 px-3 sm:px-6 lg:px-8 border-b border-zinc-900 overflow-hidden min-h-[90vh] sm:min-h-[92vh] flex items-center justify-center">
        {/* Three.js 3D Vanta Background */}
        <ParticleBackground />

        {/* Ambient Silver Glow Overlays */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[650px] h-[280px] sm:h-[400px] bg-gradient-to-b from-white/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10 w-full">
          {/* Top Pill */}
          <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-full border border-zinc-700/80 bg-[#0e0e13]/85 backdrop-blur-md text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-300 shadow-xl max-w-full truncate">
            <span className="w-2 h-2 rounded-full bg-zinc-200 animate-pulse flex-shrink-0"></span>
            <span className="truncate">Free Fire & PUBG Mobile Esports Infrastructure</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.15] sm:leading-[1.1] drop-shadow-lg px-2">
            Competitive Esports Tournaments. <br className="hidden sm:inline" />
            <span className="text-silver">Daily Cash Prizepools.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed drop-shadow-md font-medium px-2">
            Join custom 1v1 Duels, 2v2 Duos, 4v4 Clash Squads, and 48-Player Battle Royale lobbies. Real-time bracket assignment, automated room security, and instant UPI payouts.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 px-4 sm:px-0">
            <Link
              to="/tournaments"
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-[0_0_30px_rgba(255,255,255,0.2)] text-center cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Explore Tournaments</span>
              <span>&rarr;</span>
            </Link>
            <button
              onClick={() => {
                setModeTab('affiliate');
                const el = document.getElementById('platform-roles');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 border border-zinc-600 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition text-center cursor-pointer backdrop-blur-sm"
            >
              Affiliate Partner Portal (10% Cut)
            </button>
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-6 sm:pt-8 text-center max-w-4xl mx-auto px-2">
            <div className="bg-[#0e0e13]/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-zinc-800">
              <span className="text-xl sm:text-2xl font-black text-white font-mono block">₹1,50,000+</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Monthly Prize Volume</span>
            </div>
            <div className="bg-[#0e0e13]/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-zinc-800">
              <span className="text-xl sm:text-2xl font-black text-silver font-mono block">48 Players</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Battle Royale Lobbies</span>
            </div>
            <div className="bg-[#0e0e13]/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-zinc-800">
              <span className="text-xl sm:text-2xl font-black text-white font-mono block">10.0%</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Guaranteed Partner Cut</span>
            </div>
            <div className="bg-[#0e0e13]/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-zinc-800">
              <span className="text-xl sm:text-2xl font-black text-zinc-100 font-mono block">&lt; 4 Hours</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-wider">UPI Settlement Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE ACTIVITY TICKER (100% REAL DATABASE WINNINGS & PAYOUTS) */}
      <LiveActivityTicker />

      {/* 2. HOW TO START & WIN (STREAMLINED TIMELINE) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#08080b]">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Workflow Overview
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Five Stages to <span className="text-silver">Victory & Cashout</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              A transparent, automated platform designed for fair competitive integrity from signup to withdrawal.
            </p>
          </div>

          {/* Desktop Timeline Flow (Clean, streamlined single card - NO 5 heavy boxes) */}
          <div className="hidden lg:block bg-[#0c0c10] border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-xl">
            {/* Step Line */}
            <div className="relative flex items-center justify-between mb-8 px-6">
              <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700" />
              {startSteps.map((s, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-zinc-900 border-2 border-zinc-400 flex items-center justify-center font-mono font-black text-xs text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    0{s.step}
                  </div>
                </div>
              ))}
            </div>

            {/* Step Content Columns without heavy box outlines */}
            <div className="grid grid-cols-5 gap-6 text-center">
              {startSteps.map((s, idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-silver block">
                    STAGE 0{s.step}
                  </span>
                  <h3 className="font-bold text-white text-sm leading-snug">{s.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet View (Connected vertical timeline) */}
          <div className="block lg:hidden space-y-3">
            {startSteps.map((s, idx) => (
              <div key={idx} className="flex space-x-3.5 items-start bg-[#0e0e13] border border-zinc-800/80 p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-white flex-shrink-0">
                  0{s.step}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm">{s.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. GAMEPLAY VIDEO HERO — local MP4 cinematic, no YouTube */}
      <GameplayVideoHero />

      {/* ── BRIDGE STRIP between two video sections ── */}
      <section className="relative z-10 bg-[#050507] border-y border-zinc-900 overflow-hidden">
        {/* Subtle top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Label */}
          <p className="text-center text-[10px] font-black uppercase tracking-[0.28em] text-zinc-600 mb-8">
            Platform at a Glance
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-800/60">
            {[
              {
                value: '12,400+',
                label: 'Registered Players',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-zinc-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                ),
              },
              {
                value: 'Rs. 2.4L',
                label: 'Prize Pool Today',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-zinc-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                  </svg>
                ),
              },
              {
                value: '48 Live',
                label: 'Active Tournaments',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-zinc-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 4v2H4v4H2V4h5zm15 0v6h-2V6h-3V4h5zM7 20H2v-6h2v4h3v2zm15 0h-5v-2h3v-4h2v6zM12 8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/>
                  </svg>
                ),
              },
              {
                value: 'Instant',
                label: 'UPI Cashout Speed',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-zinc-400" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93s-3.05 7.44-7 7.93v2.02c5.05-.5 9-4.76 9-9.95S18.05 2.55 13 2.05zM11 2.05C5.95 2.55 2 6.81 2 12s3.95 9.45 9 9.95v-2.02C7.05 19.44 4 16.08 4 12s3.05-7.44 7-7.93V2.05zM12 6l-4 6h3v4l4-6h-3z"/>
                  </svg>
                ),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#070709] flex flex-col items-center gap-2 py-7 px-4 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  {stat.icon}
                </div>
                <span className="text-xl sm:text-2xl font-black text-white">{stat.value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Tagline below */}
          <p className="text-center mt-8 text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed">
            Verified competitive lobbies. Automated payouts. Zero manual intervention.
          </p>
        </div>
      </section>

      {/* 4. TOURNAMENT HIGHLIGHT — YouTube cinematic player */}
      <CinematicYouTube />

      {/* 4. SUPPORTED GAMES & TOURNAMENT FORMATS DEEP DIVE */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#050507]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Match Modes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Official Competitive Formats
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Select your primary title to inspect verified competitive structures, map rotations, and team sizing.
            </p>

            <div className="inline-flex p-1 bg-[#101015] border border-zinc-800 rounded-xl mt-4">
              <button
                onClick={() => setGameTab('free-fire')}
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  gameTab === 'free-fire'
                    ? 'bg-zinc-200 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Free Fire Formats
              </button>
              <button
                onClick={() => setGameTab('pubg')}
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  gameTab === 'pubg'
                    ? 'bg-zinc-200 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                PUBG Mobile Formats
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {gameTab === 'free-fire' ? (
              <>
                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      SOLO CLASH
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">2 Players (1v1)</span>
                  </div>
                  <h3 className="text-base font-bold text-white">1v1 Custom Duel</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    First to 7 rounds in Bermuda / Iron Cage custom map. Winner takes entire duel prize pool.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Mobile Only • No Grenades</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      DUO CLASH
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">4 Players (2v2)</span>
                  </div>
                  <h3 className="text-base font-bold text-white">2v2 Duo Clash Showdown</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Team up with your duo partner. High coordination 2v2 rounds against challenging opponents.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Best of 13 • Fast Paced</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      SQUAD CLASH
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">8 Players (4v4)</span>
                  </div>
                  <h3 className="text-base font-bold text-white">4v4 Clash Squad (CS)</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Full 4-man roster battle. Captain registers team name and all 4 in-game character UIDs.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Competitive Store • 500 Coin</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      SOLO BR 48
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">48 Solo Players</span>
                  </div>
                  <h3 className="text-base font-bold text-white">48-Player BR Solo Survival</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Pure survival on Purgatory / Bermuda. Every solo operative fights for themselves. Per-kill bounties + placement rewards.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Slot #1 to #48 • Cash Per Frag</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-700 bg-gradient-to-br from-zinc-900 to-[#0e0e13] rounded-2xl p-6 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white text-black font-black">
                      DUO BR 48
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">24 Duos (48 Players)</span>
                  </div>
                  <h3 className="text-base font-bold text-white">48-Player BR Duo War</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    24 two-player squads clash in Bermuda. Shared tactical revives, designated duo slot picking, and instant UPI payouts.
                  </p>
                  <span className="text-[11px] text-zinc-300 block pt-1 font-mono">Slot #1 to #24 • High Bounty</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-700 bg-gradient-to-br from-zinc-900 to-[#0e0e13] rounded-2xl p-6 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white text-black font-black">
                      SQUAD BR 48
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">12 Squads (48 Players)</span>
                  </div>
                  <h3 className="text-base font-bold text-white">48-Player BR Squad Mega War</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Full custom lobby war on Bermuda / Kalahari. Dedicated slot picking (#1 to #12) and per-frag bounties.
                  </p>
                  <span className="text-[11px] text-zinc-300 block pt-1 font-mono">Placement + Frag Points</span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      TDM
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">8 Players</span>
                  </div>
                  <h3 className="text-base font-bold text-white">4v4 Warehouse TDM</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    First to 40 eliminations in Warehouse. Fast reflexes, clean gunplay, instant winner determination.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">No M24 / Slide Toggle</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      SQUAD
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">12 Squads</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Erangel Squad War</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    12 dedicated squads in full custom room. Choose slot numbers 1 to 12. Points for placement and kills.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Official PMCO Point System</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      SOLO
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">48 Players</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Solo Survival Royale</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Drop alone into Erangel or Sanhok. Eliminating opponents rewards individual cash bounty per frag.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Per-Kill Multiplier</span>
                </div>

                <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl p-6 space-y-3 hover:border-zinc-600 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      DUO
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">24 Duos</span>
                  </div>
                  <h3 className="text-base font-bold text-white">24-Duo Battle Royale</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Intense duo synergy. 24 teams dropping across Miramar or Erangel for strategic placement cash.
                  </p>
                  <span className="text-[11px] text-zinc-400 block pt-1 font-mono">Shared Team Prizepool</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 4. DEDICATED ROLE PATHWAYS: PLAYER VS AFFILIATE */}
      <section id="platform-roles" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#08080b]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Role Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Two Distinct Participation Models
            </h2>
          </div>

          {/* Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex p-1.5 bg-[#0e0e13] border border-zinc-800 rounded-2xl shadow-inner max-w-md w-full">
              <button
                onClick={() => setModeTab('player')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  modeTab === 'player'
                    ? 'bg-zinc-200 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                For Competitors
              </button>
              <button
                onClick={() => setModeTab('affiliate')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  modeTab === 'affiliate'
                    ? 'bg-zinc-200 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                For Affiliates
              </button>
            </div>
          </div>

          {/* Player Pathway */}
          {modeTab === 'player' ? (
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl">
              <div className="max-w-2xl">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Player Ecosystem
                </span>
                <h3 className="text-2xl font-black text-white mt-2">
                  Compete in Daily Tournaments & Win Direct UPI Cash
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                  Join with your wallet balance. Win placement prizes and per-kill bounty cash. Plus, refer friends to earn passive bonuses every time they compete.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <div className="bg-[#121218] p-5 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-mono font-black text-zinc-500">BOUNTIES</span>
                  <h4 className="text-sm font-bold text-white">Kill Bounty Multipliers</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Earn ₹10 to ₹25 cash on every elimination you secure, credited even if your team does not take 1st place.
                  </p>
                </div>

                <div className="bg-[#121218] p-5 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-mono font-black text-zinc-500">REFERRALS</span>
                  <h4 className="text-sm font-bold text-white">P2P Referral Rewards</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Invite squad mates with your REF-XXXX code. Earn a 5% bonus on every ticket purchased by your referrals.
                  </p>
                </div>

                <div className="bg-[#121218] p-5 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-mono font-black text-zinc-500">PAYOUT</span>
                  <h4 className="text-sm font-bold text-white">Instant UPI Settlement</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Direct transfer to PhonePe, Google Pay, or Paytm within 2 to 4 hours with full ledger transaction logs.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Ready to test your squad against verified competitors?
                </span>
                <Link
                  to="/tournaments"
                  className="w-full sm:w-auto px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 text-center"
                >
                  Browse Tournaments &rarr;
                </Link>
              </div>
            </div>
          ) : (
            /* Affiliate Pathway */
            <div className="bg-[#0c0c10] border border-zinc-700 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl bg-gradient-to-b from-[#101015] to-[#0c0c10]">
              <div className="max-w-2xl">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-white text-black font-bold">
                  Official Partner Program
                </span>
                <h3 className="text-2xl font-black text-white mt-2">
                  Onboard Gamers & Earn a 10% Cut on Every Match
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                  Run a gaming guild, college tournament network, or WhatsApp community? Onboard players with your AFF-XXXX link and earn lifetime commissions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <div className="bg-[#14141c] p-5 rounded-2xl border border-zinc-700/80 space-y-2">
                  <span className="text-xs font-mono font-black text-zinc-400">TRACKING</span>
                  <h4 className="text-sm font-bold text-white">Verified Attribution</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Players who register with your AFF-XXXX code are permanently linked to your profile in the database.
                  </p>
                </div>

                <div className="bg-[#14141c] p-5 rounded-2xl border border-zinc-700/80 space-y-2">
                  <span className="text-xs font-mono font-black text-zinc-400">EARNINGS</span>
                  <h4 className="text-sm font-bold text-white">10% Lifetime Cut</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Every ticket purchased by your onboarded players automatically credits a 10% cut into your withdrawable balance.
                  </p>
                </div>

                <div className="bg-[#14141c] p-5 rounded-2xl border border-zinc-700/80 space-y-2">
                  <span className="text-xs font-mono font-black text-zinc-400">DASHBOARD</span>
                  <h4 className="text-sm font-bold text-white">Dedicated Workspace</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Inspect individual player matches, entry spend, generated revenue, and request instant UPI cashouts.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800">
                <span className="text-xs text-zinc-300">
                  Turn your gaming community into a sustainable monthly revenue stream.
                </span>
                <Link
                  to="/affiliate"
                  className="w-full sm:w-auto px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 text-center"
                >
                  Join Partner Portal &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. INTERACTIVE EARNINGS & PROFIT CALCULATOR */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#050507]">
        <div className="max-w-5xl mx-auto">
          <EarningsCalculator />
        </div>
      </section>

      {/* 6. DAILY TOURNAMENT SCHEDULE MATRIX */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#08080b]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
                Timetable
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                Daily Match <span className="text-silver">Schedule</span>
              </h2>
            </div>
            <Link
              to="/tournaments"
              className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white underline underline-offset-4"
            >
              Inspect Live Lobbies &rarr;
            </Link>
          </div>

          <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black text-[10px] tracking-wider bg-[#101015]">
                    <th className="py-4 px-6">Match Window</th>
                    <th className="py-4 px-6">Start Time</th>
                    <th className="py-4 px-6">Game Title</th>
                    <th className="py-4 px-6">Format</th>
                    <th className="py-4 px-6 text-center">Entry Ticket</th>
                    <th className="py-4 px-6 text-right">Prize Pool</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {dailySchedule.map((s, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/60 transition">
                      <td className="py-4 px-6 font-bold text-white text-sm">{s.slot}</td>
                      <td className="py-4 px-6 font-mono text-zinc-400">{s.time}</td>
                      <td className="py-4 px-6 font-semibold text-zinc-300">{s.game}</td>
                      <td className="py-4 px-6 text-zinc-400">{s.mode}</td>
                      <td className="py-4 px-6 text-center font-bold text-white font-mono">{s.fee}</td>
                      <td className="py-4 px-6 text-right font-black text-silver font-mono text-sm">{s.pool}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-zinc-800">
              {dailySchedule.map((s, idx) => (
                <div key={idx} className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {s.slot}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1">{s.game}</h4>
                      <p className="text-zinc-400 text-xs">{s.mode}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-silver block">{s.time}</span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block">{s.pool}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-xs">
                    <span className="text-zinc-500 font-mono">Entry: <strong className="text-zinc-200">{s.fee}</strong></span>
                    <Link
                      to="/tournaments"
                      className="px-3 py-1 bg-silver-gradient text-black font-black text-[10px] uppercase tracking-wider rounded-lg"
                    >
                      Enter Slot
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. TOP PLAYERS LEADERBOARD SECTION */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#050507]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Hall of Fame
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Top Tournament <span className="text-silver">Competitors</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Verified competitors ranked by total match winnings and elimination tallies.
            </p>
          </div>

          <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black text-[10px] tracking-wider bg-[#101015]">
                    <th className="py-4 px-6">Rank</th>
                    <th className="py-4 px-6">Player Handle</th>
                    <th className="py-4 px-6">Primary Game</th>
                    <th className="py-4 px-6 text-center">Eliminations</th>
                    <th className="py-4 px-6 text-center">Win Rate</th>
                    <th className="py-4 px-6 text-right">Total Winnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {topPlayers.map((player) => (
                    <tr key={player.rank} className="hover:bg-zinc-900/60 transition">
                      <td className="py-4 px-6 font-mono font-bold text-white text-sm">
                        #{player.rank}
                      </td>
                      <td className="py-4 px-6 font-black text-white text-sm">
                        {player.name}
                      </td>
                      <td className="py-4 px-6 text-zinc-400 font-medium">
                        {player.game}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-silver font-mono text-sm">
                        {player.kills}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-zinc-300 font-mono text-sm">
                        {player.winRate}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-white text-sm font-mono">
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-zinc-800">
              {topPlayers.map((player) => (
                <div key={player.rank} className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-white">
                        #{player.rank}
                      </span>
                      <div>
                        <h4 className="font-black text-white text-sm">{player.name}</h4>
                        <span className="text-[11px] text-zinc-400">{player.game}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-silver text-sm block">{player.points}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Earnings</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono text-zinc-400 bg-[#121218] p-2 rounded-xl border border-zinc-800">
                    <div>Eliminations: <strong className="text-white">{player.kills}</strong></div>
                    <div className="text-right">Win Rate: <strong className="text-white">{player.winRate}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. ANTI-CHEAT & FAIR PLAY INTEGRITY GUARANTEE */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#08080b]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Integrity System
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Anti-Cheat & Fair Play Policy
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Strict rules enforced across every lobby to ensure skill and strategy decide the winner.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0e0e13] border border-zinc-800 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-mono font-bold text-zinc-400">MOBILE ONLY</span>
              <h4 className="text-sm font-bold text-white">Emulator Ban</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Matches are strictly smartphone-only. Emulators and external keyboard scripts are banned on detection.
              </p>
            </div>

            <div className="bg-[#0e0e13] border border-zinc-800 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-mono font-bold text-zinc-400">UID LOCK</span>
              <h4 className="text-sm font-bold text-white">Character Verification</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Players must enter custom rooms using the exact in-game UID registered during squad submission.
              </p>
            </div>

            <div className="bg-[#0e0e13] border border-zinc-800 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-mono font-bold text-zinc-400">SECURITY</span>
              <h4 className="text-sm font-bold text-white">Automated Room Keys</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Room credentials unlock only for verified team captains exactly 15 minutes before match countdown.
              </p>
            </div>

            <div className="bg-[#0e0e13] border border-zinc-800 p-5 rounded-2xl space-y-2">
              <span className="text-xs font-mono font-bold text-zinc-400">ARBITRATION</span>
              <h4 className="text-sm font-bold text-white">Screenshot Dispute Panel</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Disputed results are investigated via in-game spectator logs and post-match score screenshots.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#050507]">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Community Reviews
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Player & Partner Feedback
            </h2>
          </div>

          <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <p className="text-base sm:text-lg text-zinc-200 font-medium italic max-w-2xl mx-auto leading-relaxed">
                  "{testimonials[activeTestimonial].content}"
                </p>
                <div>
                  <h4 className="font-black text-white text-sm">{testimonials[activeTestimonial].name}</h4>
                  <span className="text-xs text-zinc-400">{testimonials[activeTestimonial].role} • {testimonials[activeTestimonial].game}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center space-x-2 pt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    activeTestimonial === i ? 'bg-white w-6' : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#08080b]">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              Knowledge Base
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-[#0e0e13] border border-zinc-800 rounded-2xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left text-sm font-bold text-white flex justify-between items-center hover:bg-zinc-900/50 transition"
                >
                  <span>{faq.q}</span>
                  <span className="text-zinc-500 text-lg font-mono ml-4">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. READY TO COMPETE CTA BANNER */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-[#050507]">
        <div className="max-w-4xl mx-auto bg-[#0e0e13] border border-zinc-700 rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-2xl">
          <span className="text-xs uppercase font-mono tracking-widest text-zinc-400 border border-zinc-700 px-3 py-1 rounded-full bg-zinc-900">
            COMPETITIVE ESPORTS ENGINE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Ready to Enter the Arena?
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Create your account today, claim your welcome signup cash, and register your squad for upcoming Free Fire & PUBG tournaments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              to="/tournaments"
              className="w-full sm:w-auto px-8 py-3.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg text-center"
            >
              Browse Tournaments
            </Link>
            <Link
              to="/affiliate"
              className="w-full sm:w-auto px-8 py-3.5 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition text-center"
            >
              Become an Affiliate Partner
            </Link>
          </div>
        </div>
      </section>

      {/* 12. CLEAN ESPORTS FOOTER */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-[#040406] text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="font-black text-white text-base">GAME<span className="text-silver">ARENA</span></span>
            <p className="text-[11px] text-zinc-500">Competitive Tournament Infrastructure for Free Fire & PUBG Mobile.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-zinc-400 font-semibold text-xs">
            <Link to="/tournaments" className="hover:text-white transition">Tournaments</Link>
            <Link to="/yourmatches" className="hover:text-white transition">My Matches</Link>
            <Link to="/refer-and-earn" className="hover:text-white transition">Refer & Earn</Link>
            <Link to="/affiliate" className="hover:text-white transition">Affiliate Portal</Link>
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-8 pt-8 border-t border-zinc-900/80 flex flex-col sm:flex-row justify-between items-center text-[10px] text-zinc-600 gap-2">
          <span>&copy; {new Date().getFullYear()} LocalEsport Esports Platform. All rights reserved.</span>
          <span>Free Fire & PUBG Mobile trademarks belong to their respective publishers.</span>
        </div>
      </footer>
    </div>
  );
}
