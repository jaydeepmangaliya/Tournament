import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Terms() {
  const [activeTab, setActiveTab] = useState('terms'); // 'terms' | 'fairplay' | 'refund' | 'states'

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-20 px-3 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-zinc-800 pb-6 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Legal Compliance & Official Rules</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            Terms of Service & <span className="text-silver">Fair Play Policy</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
            LocalEsport operates exclusively as a competitive skill-based esports platform in accordance with the laws of the Republic of India. Participation in any contest or tournament requires strict adherence to these terms.
          </p>
          <div className="text-[11px] font-mono text-zinc-500">
            Last Updated: November 2026 • Effective for all Free Fire & BGMI Tournaments
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-zinc-800/80 text-xs font-bold uppercase tracking-wider">
          {[
            { id: 'terms', label: '1. Terms of Service' },
            { id: 'states', label: '2. State Restrictions (18+)' },
            { id: 'fairplay', label: '3. Fair Play & Anti-Cheat' },
            { id: 'refund', label: '4. Refunds & Withdrawals' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-silver-gradient text-black font-black shadow-md'
                  : 'bg-[#0e0e13] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Terms of Service */}
        {activeTab === 'terms' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">01</span>
                <span>Legal Status — 100% "Game of Skill"</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-3 leading-relaxed">
                <p>
                  LocalEsport organizes esports competitions for popular multiplayer mobile video games, specifically <strong>Garena Free Fire</strong> and <strong>Battlegrounds Mobile India (BGMI)</strong>.
                </p>
                <p>
                  Under the landmark rulings of the <strong>Supreme Court of India</strong> (including <em>State of Bombay v. R.M.D. Chamarbaugwala, AIR 1957 SC 628</em> and <em>Dr. K.R. Lakshmanan v. State of Tamil Nadu, 1996 2 SCC 226</em>), competitions where success depends predominantly upon the superior knowledge, training, experience, reflexes, and adroitness of the player are legally classified as <strong>"Games of Skill"</strong>.
                </p>
                <div className="p-3.5 bg-zinc-900/90 rounded-xl border border-zinc-800 text-zinc-300">
                  <strong className="text-white block mb-1">Constitutional Protection:</strong>
                  The right to operate and participate in paid skill-based competitions is protected under <strong>Article 19(1)(g)</strong> of the Constitution of India as a legitimate trade, occupation, and business activity.
                </div>
              </div>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">02</span>
                <span>Third-Party Game Publisher Disclaimers</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-3 leading-relaxed">
                <p>
                  LocalEsport is an independent, community-driven esports tournament organizer and technology platform.
                </p>
                <div className="p-4 bg-[#121218] rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 space-y-2">
                  <p>
                    • <strong>Garena Free Fire:</strong> LocalEsport is not affiliated with, sponsored, authorized, or endorsed by Garena International or Sea Limited. Free Fire is a registered trademark of Garena.
                  </p>
                  <p>
                    • <strong>Krafton / BGMI:</strong> LocalEsport is not affiliated with, sponsored, or endorsed by Krafton, Inc. Battlegrounds Mobile India is a registered trademark of Krafton.
                  </p>
                  <p>
                    • All game titles, assets, and trademarks remain the sole intellectual property of their respective creators and publishers.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">03</span>
                <span>Zero Spectator Betting Policy</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  LocalEsport <strong>strictly prohibits any form of spectator betting, wagering, or bookmaking</strong>. Non-participating spectators are never permitted to bet on match outcomes.
                </p>
                <p>
                  Entry fees are collected solely from active participating players who compete directly with their own game accounts. Winnings are distributed strictly according to documented in-game skill metrics (survival rank placement and verified kill tallies).
                </p>
              </div>
            </div>

          </motion.div>
        )}

        {/* Tab 2: State Restrictions & Age */}
        {activeTab === 'states' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-red-950/20 border-2 border-red-500/40 rounded-2xl p-5 sm:p-7 space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-[11px] font-black uppercase tracking-wider border border-red-500/40">
                <span>STRICT JURISDICTION NOTICE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Prohibited Indian States for Paid Tournaments
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                While skill gaming is legal across the vast majority of India under federal law, certain state-level legislations prohibit pay-to-play gaming irrespective of whether the contest is skill or chance.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {['Assam', 'Odisha', 'Telangana', 'Andhra Pradesh'].map((state) => (
                  <div key={state} className="bg-black/60 border border-red-500/50 p-3.5 rounded-xl text-center">
                    <span className="text-red-400 font-mono font-black text-xs block uppercase">RESTRICTED</span>
                    <strong className="text-white text-sm block mt-1">{state}</strong>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-black/40 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-2">
                <p>
                  Residents of <strong>Assam, Odisha, Telangana, Andhra Pradesh, Nagaland, and Sikkim</strong> are strictly forbidden from depositing funds or entering paid cash tournaments on LocalEsport.
                </p>
                <p>
                  If an account is discovered to be accessed by a resident of a restricted state, their tournament entry will be cancelled and any deposited balance will be returned.
                </p>
              </div>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">18+</span>
                <span>Age Requirement</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                You must be at least <strong>18 years of age</strong> to deposit money, join real-money tournaments, or withdraw earnings. By creating an account or paying an entry fee, you represent and warrant that you are 18 or older.
              </p>
            </div>

          </motion.div>
        )}

        {/* Tab 3: Fair Play & Anti-Cheat */}
        {activeTab === 'fairplay' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">01</span>
                <span>Zero Tolerance for Hacks, Scripts & Emulators</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-3 leading-relaxed">
                <p>
                  To preserve competitive integrity for all honest gamers, LocalEsport enforces automated and referee-assisted anti-cheat surveillance.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-1">
                    <strong className="text-red-300 block uppercase font-bold">Strictly Prohibited:</strong>
                    <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
                      <li>Auto-Aim, Headshot scripts, Aimlock</li>
                      <li>Wallhacks, ESP, Location tracking tools</li>
                      <li>PC Emulators (BlueStacks, LDPlayer, Nox) unless explicitly tagged as an PC/Emulator match</li>
                      <li>Teaming up with opponent squads in Battle Royale</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                    <strong className="text-emerald-300 block uppercase font-bold">Penalty & Enforcement:</strong>
                    <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
                      <li>Immediate match disqualification</li>
                      <li>Permanent device & account ban</li>
                      <li>Forfeiture of all entry fees and prizepools</li>
                      <li>Reported directly to Garena/Krafton security teams</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">02</span>
                <span>Room Entry & Slot Protocol</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  • <strong>Assigned Slots:</strong> Players must sit strictly in their assigned Slot number in the custom lobby (e.g., Slot #3). Sitting in an opponent's slot or spectator slot will result in immediate kick by the room referee.
                </p>
                <p>
                  • <strong>On-Time Arrival:</strong> Room ID and Password are published 15 minutes before match start. The room match starts promptly at the listed time. Players who fail to enter before the match starts will not be refunded.
                </p>
              </div>
            </div>

          </motion.div>
        )}

        {/* Tab 4: Refunds & Withdrawals */}
        {activeTab === 'refund' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">01</span>
                <span>Automated Cancellation & Instant Refunds</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-3 leading-relaxed">
                <p>
                  If a match is cancelled by an administrator, server failure, or unfilled capacity, <strong>100% of the tournament entry fee is immediately refunded</strong> directly into the players' withdrawable wallet balances.
                </p>
                <p>
                  Players can choose to use refunded balances to enter another tournament immediately or request a direct cashout to their UPI account.
                </p>
              </div>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-800 rounded-2xl p-5 sm:p-7 space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-silver font-mono">02</span>
                <span>Withdrawals & Payout Timelines</span>
              </h2>
              <div className="text-xs sm:text-sm text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  • <strong>Payout Methods:</strong> Withdrawals are processed via verified UPI (PhonePe, Google Pay, Paytm, BHIM) and direct IMPS Bank Transfer.
                </p>
                <p>
                  • <strong>Minimum Cashout:</strong> ₹30.00.
                </p>
                <p>
                  • <strong>Processing Speed:</strong> Verified payout requests are disbursed within 2 to 4 hours of submission.
                </p>
                <p>
                  • <strong>Taxation Compliance:</strong> Under Section 194BA of the Indian Income Tax Act, net winnings are subject to applicable government tax withholdings upon withdrawal.
                </p>
              </div>
            </div>

          </motion.div>
        )}

        {/* Bottom CTA & Support */}
        <div className="bg-[#0e0e13] border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">Have Questions or Need Help?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Our tournament dispute and referee team is available on WhatsApp and email.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/tournaments"
              className="px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow"
            >
              Back to Tournaments
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
