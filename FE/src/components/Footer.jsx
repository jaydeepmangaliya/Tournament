import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="w-full bg-[#040406] border-t border-zinc-900 text-zinc-400 text-xs">
      {/* Top Banner: Trust & Compliance Badges */}
      <div className="border-b border-zinc-900/80 bg-[#07070a]/60 py-3.5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="font-bold text-zinc-200 uppercase tracking-wider">
              100% Recognized Game of Skill
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline">Protected under Article 19(1)(g) of Constitution of India</span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              18+ ONLY
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
              INSTANT UPI CASHOUTS
            </span>
            <span className="px-2 py-0.5 rounded bg-red-950/40 border border-red-800/40 text-red-400 hidden md:inline">
              RESTRICTED IN ASSAM, OD, TS, AP
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <BrandLogo size="md" />
            <p className="text-zinc-400 text-xs leading-relaxed">
              India's premier competitive esports arena for Free Fire & BGMI. Daily custom lobbies, automated room ID dispatch, and instant UPI payouts.
            </p>
            <div className="pt-1">
              <a
                href="https://www.instagram.com/localesports.india"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-500/30 text-pink-300 hover:text-white hover:border-pink-500/60 transition text-xs font-bold shadow-sm group"
              >
                <svg className="w-4 h-4 fill-current text-pink-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>@localesports.india</span>
              </a>
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              Built by Gamers, for Gamers.
            </div>
          </div>

          {/* Col 2: Arena & Matches */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Competitions</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/tournaments" className="hover:text-white transition">Tournaments Arena</Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-white transition">Weekly Leaderboard</Link>
              </li>
              <li>
                <Link to="/yourmatches" className="hover:text-white transition">My Registered Matches</Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-white transition">1v1 Solo Duels</Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-white transition">4v4 Clash Squads</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Programs & Rewards */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Earnings & Squad</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/refer-and-earn" className="hover:text-white transition">Refer & Earn Program</Link>
              </li>
              <li>
                <Link to="/affiliate" className="hover:text-white transition">Affiliate Partner Portal (10% Cut)</Link>
              </li>
              <li>
                <Link to="/tournaments" className="hover:text-white transition">Solo Auto-Matchmaking</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Fair Play */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Legal & Compliance</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="hover:text-white transition text-zinc-300 font-semibold">
                  Terms of Service & Rules
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition">
                  State Restrictions (Assam, TS, AP, OD)
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition">
                  Fair Play & Anti-Cheat Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition">
                  Automated Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Publisher Disclaimer Strip */}
        <div className="mt-8 pt-6 border-t border-zinc-900/90 text-[11px] text-zinc-500 leading-relaxed space-y-2">
          <p>
            <strong className="text-zinc-400">Third-Party Intellectual Property Disclaimer:</strong> LocalEsport is an independent, community-driven esports competition organizer and technology platform. LocalEsport is not affiliated with, sponsored by, authorized by, or endorsed by Garena International (Free Fire) or Krafton, Inc. (Battlegrounds Mobile India / BGMI). All game trademarks, copyrights, character names, and logos belong exclusively to their respective owners.
          </p>
          <p>
            <strong className="text-zinc-400">Jurisdiction Warning:</strong> Participation in real-money contests is prohibited for residents of Assam, Odisha, Telangana, Andhra Pradesh, Nagaland, and Sikkim in compliance with respective state gaming laws.
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} LocalEsport. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://www.instagram.com/localesports.india"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 transition flex items-center space-x-1 font-medium"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram</span>
            </a>
            <Link to="/terms" className="hover:text-zinc-400 transition">Terms</Link>
            <Link to="/terms" className="hover:text-zinc-400 transition">Fair Play</Link>
            <Link to="/terms" className="hover:text-zinc-400 transition">Refunds</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

