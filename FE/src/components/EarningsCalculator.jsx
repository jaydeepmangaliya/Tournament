import React, { useState } from 'react';

export default function EarningsCalculator() {
  const [calcTab, setCalcTab] = useState('player'); // 'player' | 'affiliate'

  // Player state
  const [matchesPerWeek, setMatchesPerWeek] = useState(7);
  const [killsPerMatch, setKillsPerMatch] = useState(4);
  const [friendsReferred, setFriendsReferred] = useState(5);

  // Affiliate state
  const [onboardedPlayers, setOnboardedPlayers] = useState(50);
  const [matchesPerPlayerWeek, setMatchesPerPlayerWeek] = useState(3);
  const [avgEntryFee, setAvgEntryFee] = useState(50);

  // Calculations for Player
  const monthlyMatches = matchesPerWeek * 4;
  const estimatedWins = Math.round(monthlyMatches * 0.35);
  const estimatedPrizeWinnings = estimatedWins * 120;
  const estimatedKillBounties = monthlyMatches * killsPerMatch * 12;
  const estimatedReferralIncome = friendsReferred * 8 * 2.5;
  const totalPlayerMonthly = estimatedPrizeWinnings + estimatedKillBounties + estimatedReferralIncome;

  // Calculations for Affiliate
  const monthlyTotalTickets = onboardedPlayers * matchesPerPlayerWeek * 4;
  const monthlyGrossEntry = monthlyTotalTickets * avgEntryFee;
  const affiliateMonthlyCommission = Math.round(monthlyGrossEntry * 0.10);

  return (
    <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-4 sm:p-8 lg:p-10 shadow-2xl space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 tracking-wider">
          Profit & Revenue Model
        </span>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
          Interactive <span className="text-silver">Earnings Calculator</span>
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto px-2">
          Simulate projected monthly revenue as a tournament competitor or an onboarding affiliate partner.
        </p>
      </div>

      {/* Switcher Tab */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-[#121218] border border-zinc-700 rounded-xl max-w-sm w-full">
          <button
            onClick={() => setCalcTab('player')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
              calcTab === 'player'
                ? 'bg-zinc-200 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Player Winnings
          </button>
          <button
            onClick={() => setCalcTab('affiliate')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
              calcTab === 'affiliate'
                ? 'bg-zinc-200 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Affiliate Revenue
          </button>
        </div>
      </div>

      {calcTab === 'player' ? (
        /* PLAYER CALCULATOR */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Sliders */}
          <div className="space-y-6 bg-[#121218] p-4 sm:p-6 rounded-2xl border border-zinc-800">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-zinc-400 uppercase tracking-wider">Matches Played Per Week:</span>
                <span className="text-white font-mono text-sm">{matchesPerWeek} Matches</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={matchesPerWeek}
                onChange={(e) => setMatchesPerWeek(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-zinc-400 uppercase tracking-wider">Average Frags (Kills) Per Match:</span>
                <span className="text-white font-mono text-sm">{killsPerMatch} Frags</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={killsPerMatch}
                onChange={(e) => setKillsPerMatch(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-zinc-400 uppercase tracking-wider">Friends You Invited:</span>
                <span className="text-white font-mono text-sm">{friendsReferred} Friends</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={friendsReferred}
                onChange={(e) => setFriendsReferred(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="bg-gradient-to-b from-[#14141c] to-[#0e0e14] p-4 sm:p-6 rounded-2xl border border-zinc-700/80 space-y-5">
            <div className="space-y-3 divide-y divide-zinc-800 text-xs">
              <div className="flex justify-between items-center pb-2">
                <span className="text-zinc-400">Match Placement & Prize Pool Share</span>
                <strong className="text-white font-mono text-sm">₹{estimatedPrizeWinnings.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400">Per-Frag Bounty Cash (Avg ₹12/frag)</span>
                <strong className="text-white font-mono text-sm">₹{estimatedKillBounties.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400">P2P Referral Rewards (5% per friend match)</span>
                <strong className="text-white font-mono text-sm">₹{estimatedReferralIncome.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-700 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block mb-1">
                Estimated Monthly Player Income
              </span>
              <h4 className="text-4xl font-black text-silver">
                ₹{totalPlayerMonthly.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-zinc-500"> / month</span>
              </h4>
              <p className="text-[11px] text-zinc-500 mt-2">
                Withdrawable directly to your UPI ID or usable for tournament entry fees
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* AFFILIATE CALCULATOR */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Sliders */}
          <div className="space-y-6 bg-[#121218] p-4 sm:p-6 rounded-2xl border border-zinc-800">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-zinc-400 uppercase tracking-wider">Active Onboarded Players:</span>
                <span className="text-white font-mono text-sm">{onboardedPlayers} Players</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={onboardedPlayers}
                onChange={(e) => setOnboardedPlayers(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-zinc-400 uppercase tracking-wider">Matches Played Per Player / Week:</span>
                <span className="text-white font-mono text-sm">{matchesPerPlayerWeek} Matches</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={matchesPerPlayerWeek}
                onChange={(e) => setMatchesPerPlayerWeek(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-zinc-400 uppercase tracking-wider">Average Match Entry Fee:</span>
                <span className="text-white font-mono text-sm">₹{avgEntryFee}</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="10"
                value={avgEntryFee}
                onChange={(e) => setAvgEntryFee(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Affiliate Breakdown Card */}
          <div className="bg-gradient-to-b from-[#14141c] to-[#0e0e14] p-6 rounded-2xl border border-zinc-700/80 space-y-5">
            <div className="space-y-3 divide-y divide-zinc-800 text-xs">
              <div className="flex justify-between items-center pb-2">
                <span className="text-zinc-400">Total Monthly Match Entries by Players</span>
                <strong className="text-white font-mono text-sm">{monthlyTotalTickets.toLocaleString('en-IN')} entries</strong>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400">Gross Monthly Ticket Volume</span>
                <strong className="text-white font-mono text-sm">₹{monthlyGrossEntry.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400">Guaranteed Affiliate Commission Rate</span>
                <strong className="text-silver font-mono text-sm">10% per ticket</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-700 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block mb-1">
                Your Monthly Passive Affiliate Commission
              </span>
              <h4 className="text-4xl font-black text-silver">
                ₹{affiliateMonthlyCommission.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-zinc-500"> / month</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                No withdrawal thresholds, no lock-in. Direct payout to UPI or Bank Account.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
