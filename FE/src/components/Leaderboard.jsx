import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const [period, setPeriod] = useState('weekly'); // 'weekly' | 'all_time'
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tournaments/leaderboard?period=${period}`
        );
        if (res.data.status && isMounted) {
          setLeaders(res.data.data || []);
        }
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => { isMounted = false; };
  }, [period]);

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                  <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white">
                Weekly <span className="text-silver">Leaderboard</span>
              </h1>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Top platform earners and fraggers. Compete in Free Fire & PUBG Mobile tournaments to climb the ranks and win real cash!
            </p>
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center space-x-1.5 bg-[#0e0e13] p-1.5 rounded-xl border border-zinc-800 self-start md:self-center">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                period === 'weekly'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              This Week (Live)
            </button>
            <button
              onClick={() => setPeriod('all_time')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                period === 'all_time'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All-Time Legends
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-zinc-500 font-medium">Calculating leaderboard rankings...</div>
        ) : (
          <>
            {/* TOP 3 PODIUM */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                {/* 2nd Place (Silver) */}
                {top3[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="order-2 md:order-1 bg-gradient-to-b from-[#14141c] to-[#0c0c10] border border-zinc-700/80 hover:border-zinc-500 rounded-2xl p-5 text-center flex flex-col justify-between shadow-xl transition"
                  >
                    <div>
                      <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-zinc-400/10 border border-zinc-400/30 text-zinc-300 text-[10px] font-black uppercase tracking-wider mb-3">
                        🥈 #2 RUNNER UP
                      </div>
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-800 border-2 border-zinc-400 flex items-center justify-center font-mono font-black text-xl text-white shadow-lg mb-3">
                        {top3[1].playerName.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-base font-black text-white truncate px-2">
                        {top3[1].playerName}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {top3[1].matchesWon} Booyahs • {top3[1].totalKills} Kills
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800 bg-[#0e0e14] rounded-xl p-3">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Cash Won</span>
                      <strong className="text-2xl font-black text-white font-mono">
                        ₹{top3[1].totalEarnings.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place (Gold Champion) */}
                {top3[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="order-1 md:order-2 bg-gradient-to-b from-[#20180a] via-[#141006] to-[#0d0904] border-2 border-amber-500/80 rounded-2xl p-6 text-center flex flex-col justify-between shadow-[0_0_40px_rgba(245,158,11,0.25)] relative overflow-hidden -mt-2 md:-mt-4"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500" />
                    <div>
                      <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-3 animate-pulse">
                        👑 #1 TOURNAMENT CHAMPION
                      </div>
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400 flex items-center justify-center font-mono font-black text-2xl text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-3">
                        {top3[0].playerName.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-lg font-black text-white truncate px-2">
                        {top3[0].playerName}
                      </h3>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        {top3[0].matchesWon} Booyahs • {top3[0].totalKills} Kills • {top3[0].winRate}% Win Rate
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-amber-500/30 bg-black/40 rounded-xl p-3.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400/80 block">Total Cash Won</span>
                      <strong className="text-3xl font-black text-amber-300 font-mono">
                        ₹{top3[0].totalEarnings.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="order-3 bg-gradient-to-b from-[#18110c] to-[#0c0806] border border-amber-700/50 hover:border-amber-600 rounded-2xl p-5 text-center flex flex-col justify-between shadow-xl transition"
                  >
                    <div>
                      <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-700/10 border border-amber-700/30 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-3">
                        🥉 #3 ELITE FRAGGER
                      </div>
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-800 border-2 border-amber-700 flex items-center justify-center font-mono font-black text-xl text-amber-400 shadow-lg mb-3">
                        {top3[2].playerName.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-base font-black text-white truncate px-2">
                        {top3[2].playerName}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {top3[2].matchesWon} Booyahs • {top3[2].totalKills} Kills
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800 bg-[#0e0e14] rounded-xl p-3">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Cash Won</span>
                      <strong className="text-2xl font-black text-white font-mono">
                        ₹{top3[2].totalEarnings.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* RANKS 4 TO 10 TABLE */}
            <div className="bg-[#0e0e13] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#121218] flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  Top Ranked Challengers (Ranks 4 — 10)
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">
                  Refreshes continuously
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#09090d] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800/60 font-bold">
                    <tr>
                      <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                      <th className="py-3.5 px-4">Player</th>
                      <th className="py-3.5 px-4 text-center">Matches</th>
                      <th className="py-3.5 px-4 text-center">Booyahs</th>
                      <th className="py-3.5 px-4 text-center">Total Kills</th>
                      <th className="py-3.5 px-4 text-right">Cash Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {rest.map((p) => (
                      <tr key={p.rank} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono font-bold text-xs leading-6">
                            #{p.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-black text-silver">
                            {p.playerName.charAt(0).toUpperCase()}
                          </span>
                          <span>{p.playerName}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-400">
                          {p.matchesPlayed}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-400 font-bold">
                          {p.matchesWon}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-300">
                          {p.totalKills}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm text-white">
                          ₹{p.totalEarnings.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CALL TO ACTION */}
            <div className="bg-gradient-to-r from-zinc-900 via-[#12121a] to-zinc-900 border border-zinc-700 p-6 sm:p-8 rounded-2xl text-center space-y-3 shadow-xl">
              <h3 className="text-lg sm:text-2xl font-black text-white">
                Want Your Name on the Leaderboard?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                Join our 1v1 Solo Duels, 2v2 Clash, 4v4 Squad, or 48-Player Battle Royale lobbies. Win matches, take home real cash prizes, and withdraw directly to your UPI!
              </p>
              <div className="pt-2">
                <Link
                  to="/tournaments"
                  className="inline-flex items-center space-x-2 px-8 py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg"
                >
                  <span>Enter Live Tournaments Now</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
