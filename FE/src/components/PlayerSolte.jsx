import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPass, setCopiedPass] = useState(null);
  const [activeAlertMatch, setActiveAlertMatch] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => new Set());

  const knownReadyRef = useRef(new Set());
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Web Audio Synthesizer: Plays a crisp, ascending arcade tournament chime
  const playRoomAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // High-pitched 4-tone ascending alert chime: C5 -> E5 -> G5 -> C6
      const frequencies = [523.25, 659.25, 783.99, 1046.50];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  const fetchMyMatches = async (isBackgroundPoll = false) => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      if (!isBackgroundPoll) setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/tournaments/my-matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status) {
        const freshMatches = res.data.data;
        setMatches(freshMatches);

        // Check for matches that newly received Room Credentials
        freshMatches.forEach((m) => {
          if (m.has_room_credentials && m.room_id && m.room_password) {
            if (!knownReadyRef.current.has(m.id) && !dismissedAlerts.has(m.id)) {
              // Trigger audio alert and set banner!
              playRoomAlertChime();
              setActiveAlertMatch(m);
            }
            knownReadyRef.current.add(m.id);
          }
        });
      }
    } catch (err) {
      console.error('Error fetching my matches:', err);
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMyMatches();
  }, []);

  // Live Background Polling every 7 seconds so players never miss credentials
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchMyMatches(true);
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [soundEnabled, dismissedAlerts]);

  const handleDismissAlert = (matchId) => {
    setDismissedAlerts((prev) => new Set(prev).add(matchId));
    setActiveAlertMatch(null);
  };

  const copyText = (text, type, matchId) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(matchId);
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      setCopiedPass(matchId);
      setTimeout(() => setCopiedPass(null), 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex items-center justify-center pt-20">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Loading registered matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2" y="6" width="20" height="12" rx="3" />
                  <path d="M6 12h4m-2-2v4m8-2h.01m3 0h.01" />
                </svg>
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">Your Registered <span className="text-silver">Matches</span></h1>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Access your assigned slot numbers, squad team details, and room credentials
            </p>
          </div>

          {/* Sound Alert Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                playRoomAlertChime();
              }}
              title="Test Match Starting Chime"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>Test Audio Alert</span>
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
              className={`p-2 rounded-xl border text-xs transition ${
                soundEnabled
                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {soundEnabled ? (
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                ) : (
                  <line x1="23" y1="9" x2="17" y2="15" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* FLASHING ROOM CREDENTIALS ALERT BANNER */}
        <AnimatePresence>
          {activeAlertMatch && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-[#1e150a] to-[#121218] border-2 border-amber-500 shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center flex-shrink-0 animate-bounce shadow-lg">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="8" cy="15" r="4" />
                      <path d="M10.85 12.15L19 4" />
                      <path d="M18 5l2 2" />
                      <path d="M15 8l2 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider animate-pulse">
                        ROOM READY NOW
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        Join Slot #{activeAlertMatch.my_slot_number}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                      {activeAlertMatch.title} — Room ID & Password Ready!
                    </h3>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Open Free Fire / BGMI immediately and join custom room. Match starts in &lt;10 minutes!
                    </p>
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center flex-wrap gap-2 font-mono w-full sm:w-auto pt-2 sm:pt-0">
                  <button
                    onClick={() => copyText(activeAlertMatch.room_id, 'id', activeAlertMatch.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition flex items-center space-x-1 shadow-lg"
                  >
                    <span>{copiedId === activeAlertMatch.id ? 'COPIED!' : `ID: ${activeAlertMatch.room_id}`}</span>
                  </button>
                  <button
                    onClick={() => copyText(activeAlertMatch.room_password, 'pass', activeAlertMatch.id)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition flex items-center space-x-1 border border-zinc-700"
                  >
                    <span>{copiedPass === activeAlertMatch.id ? 'COPIED!' : `PASS: ${activeAlertMatch.room_password}`}</span>
                  </button>
                  <button
                    onClick={() => handleDismissAlert(activeAlertMatch.id)}
                    className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                    title="Dismiss Alert"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {matches.length === 0 ? (
          <div className="bg-[#0c0c10] rounded-2xl border border-zinc-800 p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">No Tournaments Registered Yet</h3>
            <p className="text-zinc-400 text-xs max-w-md mx-auto">
              You haven't registered for any Free Fire or PUBG matches yet. Head over to the tournament lobby to join!
            </p>
            <button
              onClick={() => navigate('/tournaments')}
              className="px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110"
            >
              Browse Tournaments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {matches.map((m) => (
              <motion.div
                key={m.id}
                whileHover={{ y: -3 }}
                className="bg-[#0c0c10] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 transition"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {m.game_name} • {m.format.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 leading-snug">{m.title}</h3>
                  </div>
                  <div className="text-right">
                    {m.status === 'cancelled' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-black">
                        CANCELLED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-white text-black text-xs font-black">
                        Slot #{m.my_slot_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Team Info */}
                <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Team Name:</span>
                    <strong className="text-white text-xs">{m.my_team_name}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Match Time:</span>
                    <strong className="text-silver font-mono text-xs">
                      {new Date(m.match_start_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </strong>
                  </div>
                </div>

                {/* Cancelled Notice OR Room ID & Password Box */}
                {m.status === 'cancelled' ? (
                  <div className="bg-gradient-to-r from-rose-950/40 via-[#180a0e] to-rose-950/40 border border-rose-500/50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-rose-300 font-black text-xs uppercase tracking-wider">
                      <svg className="w-4 h-4 text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <span>Match Cancelled by Admin</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      This match was cancelled due to unfilled slots. Your full entry fee of <strong className="text-emerald-400 font-bold">₹{parseFloat(m.entry_fee_paid || m.entry_fee).toFixed(2)}</strong> has been credited to your <strong className="text-white font-bold">Withdrawable Balance</strong>. You can raise a cashout request to your UPI or join another tournament!
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#121218] border border-zinc-700 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                        <svg className="w-3.5 h-3.5 text-silver" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="8" cy="15" r="4" />
                          <path d="M10.85 12.15L19 4" />
                          <path d="M18 5l2 2" />
                          <path d="M15 8l2 2" />
                        </svg>
                        <span>Custom Room Credentials</span>
                      </span>
                      {m.has_room_credentials ? (
                        <span className="text-[10px] bg-zinc-800 border border-zinc-600 text-white px-2 py-0.5 rounded font-black uppercase">
                          ROOM READY
                        </span>
                      ) : (
                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">
                          OPENS 15M BEFORE
                        </span>
                      )}
                    </div>

                    {m.has_room_credentials ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="bg-[#0a0a0e] p-2.5 rounded-lg border border-zinc-800 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Room ID</span>
                            <span className="text-xs font-mono font-bold text-white">{m.room_id}</span>
                          </div>
                          <button
                            onClick={() => copyText(m.room_id, 'id', m.id)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-300 font-bold uppercase tracking-wider cursor-pointer"
                          >
                            {copiedId === m.id ? 'COPIED' : 'COPY'}
                          </button>
                        </div>

                        <div className="bg-[#0a0a0e] p-2.5 rounded-lg border border-zinc-800 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Password</span>
                            <span className="text-xs font-mono font-bold text-white">{m.room_password}</span>
                          </div>
                          <button
                            onClick={() => copyText(m.room_password, 'pass', m.id)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-300 font-bold uppercase tracking-wider cursor-pointer"
                          >
                            {copiedPass === m.id ? 'COPIED' : 'COPY'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 pt-1">
                        Room ID and Password will unlock right here 15 minutes before the match start time. Make sure you enter the custom room in your assigned Slot #{m.my_slot_number}!
                      </p>
                    )}
                  </div>
                )}

                {/* Share with Squad on WhatsApp */}
                {m.status !== 'cancelled' && (
                  <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">
                      {m.is_random_squad ? '🎲 Auto-Match Squad' : '🛡️ Pre-made Squad'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const timeStr = new Date(m.match_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                        const text =
                          `🔥 *SQUAD ASSEMBLE! WE ARE REGISTERED!* 🔥\n\n` +
                          `🏆 *Tournament:* ${m.title} (${m.format.toUpperCase()})\n` +
                          `📍 *Slot:* Slot #${m.my_slot_number} (${m.my_team_name})\n` +
                          `💰 *Prize Pool:* ₹${m.prize_pool}\n` +
                          `⏰ *Match Time:* Today at ${timeStr}\n\n` +
                          (m.has_room_credentials ? `⚡ *Room ID:* ${m.room_id} | *Pass:* ${m.room_password}\n\n` : `⚡ _Room ID will be shared 15 mins before match!_\n\n`) +
                          `👉 *View match & slot details:* ${window.location.origin}/yourmatches`;

                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/70 text-emerald-300 hover:text-white text-[11px] font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                      </svg>
                      <span>Share with Squad</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
