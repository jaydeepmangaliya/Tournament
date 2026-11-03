import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SquadRegisterModal from './SquadRegisterModal';
import WalletModal from './WalletModal';
import LiveActivityTicker from './LiveActivityTicker';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState('all'); // 'all' | 'free-fire' | 'pubg-mobile'
  const [formatFilter, setFormatFilter] = useState('all'); // 'all' | '1v1' | '2v2' | '4v4' | 'squad' | 'solo'
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.total_balance !== undefined && u.total_balance !== null) {
          return parseFloat(u.total_balance) || 0;
        }
        const dep = parseFloat(u.deposit_balance || 0);
        const win = parseFloat(u.winning_balance || 0);
        const ref = parseFloat(u.referral_balance || 0);
        return dep + win + ref;
      }
    } catch (e) {}
    return 0;
  });
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchTournaments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = {};
      if (gameFilter !== 'all') params.gameSlug = gameFilter;
      if (formatFilter !== 'all') params.format = formatFilter;

      const res = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/tournaments`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.data.status) {
        setTournaments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchWallet = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/wallet/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.data?.status && res.data?.data?.balances) {
        const bal = parseFloat(res.data.data.balances.total || 0);
        setWalletBalance(bal);
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.total_balance = bal.toFixed(2);
            u.deposit_balance = res.data.data.balances.deposit;
            u.winning_balance = res.data.data.balances.winning;
            u.referral_balance = res.data.data.balances.referral;
            localStorage.setItem('user', JSON.stringify(u));
          }
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: bal }));
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
  };

  useEffect(() => {
    const handleWalletUpdated = (e) => {
      if (e.detail !== undefined && e.detail !== null) {
        setWalletBalance(parseFloat(e.detail) || 0);
      }
    };
    window.addEventListener('wallet_updated', handleWalletUpdated);
    return () => window.removeEventListener('wallet_updated', handleWalletUpdated);
  }, []);

  useEffect(() => {
    fetchTournaments();
    fetchWallet();

    // Auto-refresh match lobbies every 7 seconds so newly spawned matches appear instantly
    const interval = setInterval(() => {
      fetchTournaments(true);
    }, 7000);
    return () => clearInterval(interval);
  }, [gameFilter, formatFilter]);

  const handleJoinClick = (tournament) => {
    if (!token) {
      alert('Please log in first to register for tournaments.');
      navigate('/login');
      return;
    }
    setSelectedTournament(tournament);
  };

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 sm:pb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                  <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </span>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white">
                Tournament <span className="text-silver">Arena</span>
              </h1>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Official Free Fire & PUBG Mobile competitions: 1v1, 2v2, 4v4 Clash Squads, and 48-Player Battle Royale
            </p>
          </div>

          {/* Quick Wallet Bar */}
          {token && (
            <div className="flex items-center justify-between sm:justify-start space-x-4 bg-[#0d0d12] border border-zinc-800 rounded-2xl p-2.5 px-4 shadow-sm">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block font-bold tracking-wider">
                  Wallet Balance
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  ₹{walletBalance.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="px-3.5 py-1.5 bg-silver-gradient hover:brightness-110 text-black rounded-lg text-xs font-black uppercase tracking-wider transition"
              >
                + Top Up
              </button>
            </div>
          )}
        </div>

        {/* Live Winners & Payouts Ticker */}
        <div className="rounded-xl overflow-hidden border border-zinc-800/80 shadow-md">
          <LiveActivityTicker />
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3.5 sm:gap-4 items-start justify-between">
          {/* Game Selector */}
          <div className="flex items-center space-x-1.5 bg-[#0e0e13] p-1.5 rounded-xl border border-zinc-800 w-full sm:w-auto">
            <button
              onClick={() => setGameFilter('all')}
              className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center ${
                gameFilter === 'all'
                  ? 'bg-zinc-200 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => setGameFilter('free-fire')}
              className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center ${
                gameFilter === 'free-fire'
                  ? 'bg-zinc-200 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Free Fire
            </button>
            <button
              onClick={() => setGameFilter('pubg-mobile')}
              className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center ${
                gameFilter === 'pubg-mobile'
                  ? 'bg-zinc-200 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              PUBG Mobile
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs w-full">
            <span className="text-zinc-500 text-xs mr-1 font-bold uppercase tracking-wider hidden sm:inline">Format:</span>
            {[
              { id: 'all', label: 'All Modes' },
              { id: '1v1', label: '1v1 Clash' },
              { id: '2v2', label: '2v2 Clash' },
              { id: '4v4', label: '4v4 Clash Squad' },
              { id: 'solo', label: 'BR 48 Solo' },
              { id: 'duo', label: 'BR 48 Duo' },
              { id: 'squad', label: 'BR 48 Squad' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormatFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition border ${
                  formatFilter === f.id
                    ? 'bg-white text-black border-white'
                    : 'bg-[#0e0e13] border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500 font-medium">Loading competitive matches...</div>
        ) : (() => {
          const joinableTournaments = tournaments.filter(
            (t) => t.status === 'open' && !t.is_full && t.filled_teams < t.total_teams
          );

          if (joinableTournaments.length === 0) {
            return (
              <div className="py-20 text-center text-zinc-500 bg-[#0e0e13] rounded-2xl border border-zinc-800 space-y-2">
                <p className="text-base font-bold text-zinc-300">All current lobbies are full or in progress</p>
                <p className="text-xs text-zinc-500">Auto-Lobby Rebirth is initializing fresh rounds right now. Please wait a moment...</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinableTournaments.map((t) => {
                const totalSlots = t.total_teams;
                const filled = t.filled_teams;
                const percent = Math.min(100, Math.round((filled / totalSlots) * 100));
                const isBR = t.match_type === 'battle_royale';

                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -3 }}
                    className="bg-[#0e0e13] border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition duration-300"
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-6 pb-3 sm:pb-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {t.game_name}
                        </span>
                        {t.is_registered ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
                            <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>SLOT #{t.my_slot_number || '1'} BOOKED</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white text-black">
                            {t.format.toUpperCase()} {isBR ? '• BR 48' : '• Clash'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white leading-snug">{t.title}</h3>
                      <div className="flex items-center space-x-3 text-xs text-zinc-400 mt-2 font-mono">
                        <span>Map: <strong className="text-zinc-200">{t.map_name}</strong></span>
                        <span>•</span>
                        <span>
                          {new Date(t.match_start_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Pricing Specs */}
                    <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-zinc-950/80 border-y border-zinc-800/80 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">Entry Fee</span>
                        <span className="text-sm font-black text-zinc-100">₹{t.entry_fee}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">Prize Pool</span>
                        <span className="text-sm font-black text-white">₹{t.prize_pool}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
                          {t.per_kill_prize > 0 ? 'Per Kill' : '1st Prize'}
                        </span>
                        <span className="text-sm font-black text-silver">
                          ₹{t.per_kill_prize > 0 ? t.per_kill_prize : t.first_prize}
                        </span>
                      </div>
                    </div>

                    {/* Slots Progress & Action */}
                    <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-3 sm:space-y-3.5">
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-semibold">
                          <span>Slots Filled</span>
                          <span className="text-zinc-200 font-mono">
                            {filled} / {totalSlots} {t.players_per_team > 1 ? 'Squads' : 'Players'}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-silver-gradient h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>

                      {t.is_registered ? (
                        <button
                          onClick={() => navigate('/yourmatches')}
                          className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>ALREADY JOINED • VIEW IN MY MATCHES</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinClick(t)}
                          className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition bg-silver-gradient hover:brightness-110 text-black shadow-md cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <span>{`Register ${t.players_per_team > 1 ? 'Squad' : 'Now'}`}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Squad / Team Registration Modal */}
      <SquadRegisterModal
        isOpen={Boolean(selectedTournament)}
        onClose={() => setSelectedTournament(null)}
        tournament={selectedTournament}
        walletBalance={walletBalance}
        onRegistrationSuccess={() => {
          fetchTournaments();
          fetchWallet();
        }}
        onOpenWallet={() => setWalletModalOpen(true)}
      />

      {/* Wallet Management Modal */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onBalanceUpdate={(balances) => {
          setWalletBalance(balances.total);
          window.dispatchEvent(new CustomEvent('wallet_updated', { detail: balances.total }));
        }}
      />
    </div>
  );
}
