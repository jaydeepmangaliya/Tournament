import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PlayerMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPass, setCopiedPass] = useState(null);
  const [activeAlertMatch, setActiveAlertMatch] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => new Set());
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');

  // Filter & Pagination state
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'completed'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
      const frequencies = [523.25, 659.25, 783.99, 1046.5];
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
        const freshMatches = res.data.data || [];
        setMatches(freshMatches);

        // ONLY trigger room alert banner for matches that are ACTIVE (NOT completed and NOT cancelled)
        freshMatches.forEach((m) => {
          const isFinished = m.status === 'completed' || m.status === 'cancelled';
          if (!isFinished && m.has_room_credentials && m.room_id && m.room_password) {
            if (!knownReadyRef.current.has(m.id) && !dismissedAlerts.has(m.id)) {
              playRoomAlertChime();
              setActiveAlertMatch(m);
            }
            knownReadyRef.current.add(m.id);
          }
        });

        // Failsafe: if the active alert match has finished or been cancelled, dismiss banner immediately
        setActiveAlertMatch((prev) => {
          if (!prev) return null;
          const fresh = freshMatches.find((x) => x.id === prev.id);
          if (!fresh || fresh.status === 'completed' || fresh.status === 'cancelled') {
            return null;
          }
          return fresh;
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

  // Live Background Polling every 7 seconds
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

  const handleTestPhonePush = async () => {
    setTestingPush(true);
    setPushStatusMsg('');
    try {
      if (!('Notification' in window)) {
        setPushStatusMsg('Your browser does not support Web Push notifications.');
        setTestingPush(false);
        return;
      }

      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
      }

      if (perm !== 'granted') {
        setPushStatusMsg('Permission not granted. Please enable notifications in your browser.');
        setTestingPush(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/notifications/vapid-key`);
      const vapidPublicKey = keyRes.data?.publicKey;

      if (vapidPublicKey) {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        await axios.post(
          `${import.meta.env.VITE_API_URL || ""}/api/notifications/subscribe`,
          { subscription: sub },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/api/notifications/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPushStatusMsg(res.data?.message || 'Push sent! Check your phone notification tray.');
      setTimeout(() => setPushStatusMsg(''), 7000);
    } catch (err) {
      console.error('Test phone push error:', err);
      setPushStatusMsg(err.response?.data?.message || err.message || 'Push test failed');
    } finally {
      setTestingPush(false);
    }
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

  // Status Lifecycle Resolver
  const getMatchLifecycle = (m) => {
    if (m.status === 'cancelled') {
      return {
        stage: 'cancelled',
        badgeLabel: 'CANCELLED & REFUNDED',
        badgeClasses: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
        dotColor: 'bg-rose-500',
        detailText: `Refunded ₹${parseFloat(m.entry_fee_paid || m.entry_fee).toFixed(2)} to wallet`,
        winnerName: null,
        isUserWinner: false,
        wonAmount: 0,
      };
    }

    if (m.status === 'completed') {
      const summary = m.winner_summary;
      let winnerName = 'Declared';
      let isUserWinner = false;
      let wonAmount = 0;

      if (summary && summary.winners && summary.winners.length > 0) {
        const top = summary.winners[0];
        winnerName = top.teamName || `Slot #${top.slotNumber || top.teamId}`;

        // Check if current user / team won
        summary.winners.forEach((w) => {
          if (
            (m.my_team_id && w.teamId === m.my_team_id) ||
            (m.my_slot_number && w.slotNumber === m.my_slot_number) ||
            (m.my_team_name && w.teamName === m.my_team_name)
          ) {
            isUserWinner = true;
            wonAmount += parseFloat(w.prize || 0);
          }
        });

        if (summary.killBounties) {
          summary.killBounties.forEach((kb) => {
            if (
              (m.my_team_id && kb.teamId === m.my_team_id) ||
              (m.my_slot_number && kb.slotNumber === m.my_slot_number)
            ) {
              wonAmount += parseFloat(kb.bountyAmount || 0);
            }
          });
        }
      }

      return {
        stage: 'completed',
        badgeLabel: `WINNER IS "${winnerName.toUpperCase()}"`,
        badgeClasses: isUserWinner
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          : 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        dotColor: isUserWinner ? 'bg-emerald-400' : 'bg-amber-400',
        detailText: isUserWinner
          ? `🏆 BOOYAH! You won ₹${wonAmount.toFixed(2)}`
          : `Match finished • Winner: ${winnerName}`,
        winnerName,
        isUserWinner,
        wonAmount,
      };
    }

    if (m.status === 'ongoing' || m.status === 'live') {
      return {
        stage: 'live',
        badgeLabel: 'LIVE IN PROGRESS',
        badgeClasses: 'bg-red-500/15 border-red-500/40 text-red-300 animate-pulse',
        dotColor: 'bg-red-500',
        detailText: 'Match underway in custom room',
        winnerName: null,
        isUserWinner: false,
        wonAmount: 0,
      };
    }

    if (m.has_room_credentials && m.room_id && m.room_password) {
      return {
        stage: 'credentials_announced',
        badgeLabel: 'CREDENTIALS ANNOUNCED',
        badgeClasses: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
        dotColor: 'bg-cyan-400',
        detailText: 'Room ID & Password ready below',
        winnerName: null,
        isUserWinner: false,
        wonAmount: 0,
      };
    }

    return {
      stage: 'pending',
      badgeLabel: 'WAITING FOR ROOM',
      badgeClasses: 'bg-zinc-800/80 border-zinc-700 text-zinc-400',
      dotColor: 'bg-zinc-500',
      detailText: 'Room details unlock 15m before match',
      winnerName: null,
      isUserWinner: false,
      wonAmount: 0,
    };
  };

  // Filtered & Paginated Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (activeTab === 'active') {
        return m.status !== 'completed' && m.status !== 'cancelled';
      }
      if (activeTab === 'completed') {
        return m.status === 'completed' || m.status === 'cancelled';
      }
      return true;
    });
  }, [matches, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / itemsPerPage));
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMatches.slice(start, start + itemsPerPage);
  }, [filteredMatches, currentPage]);

  const activeCount = matches.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').length;
  const completedCount = matches.filter((m) => m.status === 'completed' || m.status === 'cancelled').length;

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
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2" y="6" width="20" height="12" rx="3" />
                  <path d="M6 12h4m-2-2v4m8-2h.01m3 0h.01" />
                </svg>
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">Your Registered <span className="text-silver">Matches</span></h1>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Live status, assigned slot numbers, custom room IDs, and winner results.
            </p>
            {pushStatusMsg && (
              <p className="text-xs font-bold text-cyan-400 mt-1 animate-pulse">
                {pushStatusMsg}
              </p>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
            <button
              onClick={handleTestPhonePush}
              disabled={testingPush}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>{testingPush ? '⏳ Sending Push...' : '📲 Test Phone Push'}</span>
            </button>
            <button
              onClick={playRoomAlertChime}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>🔔 Test Chime</span>
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title={soundEnabled ? 'Mute Alert Sound' : 'Unmute Alert Sound'}
            >
              {soundEnabled ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ACTIVE ALERT BANNER (ONLY for upcoming/live matches with credentials, NEVER for completed) */}
        <AnimatePresence>
          {activeAlertMatch && activeAlertMatch.status !== 'completed' && activeAlertMatch.status !== 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#181308] to-amber-500/15 border border-amber-500/60 shadow-[0_10px_35px_rgba(245,158,11,0.2)]"
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
                      {activeAlertMatch.title} — Room ID &amp; Password Ready!
                    </h3>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Open Free Fire immediately and join custom room. Match starts in &lt;10 minutes!
                    </p>
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center flex-wrap gap-2 font-mono w-full sm:w-auto pt-2 sm:pt-0">
                  <button
                    onClick={() => copyText(activeAlertMatch.room_id, 'id', activeAlertMatch.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition flex items-center space-x-1 shadow-lg cursor-pointer"
                  >
                    <span>{copiedId === activeAlertMatch.id ? 'COPIED!' : `ID: ${activeAlertMatch.room_id}`}</span>
                  </button>
                  <button
                    onClick={() => copyText(activeAlertMatch.room_password, 'pass', activeAlertMatch.id)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition flex items-center space-x-1 border border-zinc-700 cursor-pointer"
                  >
                    <span>{copiedPass === activeAlertMatch.id ? 'COPIED!' : `PASS: ${activeAlertMatch.room_password}`}</span>
                  </button>
                  <button
                    onClick={() => handleDismissAlert(activeAlertMatch.id)}
                    className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
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

        {/* Tab Filters & Count Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex p-1 rounded-xl bg-[#0b0b10] border border-zinc-800">
            <button
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-zinc-800 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Matches ({matches.length})
            </button>
            <button
              onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pending &amp; Live ({activeCount})
            </button>
            <button
              onClick={() => { setActiveTab('completed'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <span className="text-xs text-zinc-500 font-mono">
            Showing {filteredMatches.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredMatches.length)} of {filteredMatches.length}
          </span>
        </div>

        {/* MATCHES LIST VIEW / TABLE */}
        {filteredMatches.length === 0 ? (
          <div className="bg-[#0c0c10] rounded-2xl border border-zinc-800 p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">No registered matches in this view</h3>
            <p className="text-zinc-400 text-xs max-w-sm mx-auto">
              Join custom 1v1 duels, 4v4 clash squads, or 48-player battle royale lobbies to start winning cash prizes!
            </p>
            <button
              onClick={() => navigate('/tournaments')}
              className="px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 cursor-pointer"
            >
              Browse Tournaments
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#09090d]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-[#0e0e14] text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Match &amp; Format</th>
                    <th className="py-3 px-4">Your Slot &amp; Team</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Match Status</th>
                    <th className="py-3 px-4 text-right">Room / Winner Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {paginatedMatches.map((m) => {
                    const status = getMatchLifecycle(m);
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-white/[0.02] transition group"
                      >
                        {/* 1. Match & Format */}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-white font-mono text-xs font-black">
                              #{m.id}
                            </span>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  {m.game_name} • {m.format.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {m.map_name || 'Bermuda'}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-white mt-1 leading-snug">
                                {m.title}
                              </h4>
                              <span className="text-[10px] text-zinc-400 font-medium">
                                Prize Pool: <strong className="text-silver font-mono">₹{m.prize_pool}</strong>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Slot & Team */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 rounded bg-white text-black text-[10px] font-black">
                                Slot #{m.my_slot_number}
                              </span>
                              {m.is_random_squad ? (
                                <span className="text-[9px] text-cyan-400 font-bold uppercase">Random Squad</span>
                              ) : null}
                            </div>
                            <span className="text-xs text-zinc-300 font-bold block truncate max-w-[140px]">
                              {m.my_team_name}
                            </span>
                          </div>
                        </td>

                        {/* 3. Schedule */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5 font-mono">
                            <span className="text-xs text-white font-bold block">
                              {new Date(m.match_start_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              {new Date(m.match_start_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* 4. Match Status Lifecycle */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${status.badgeClasses}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                              <span>{status.badgeLabel}</span>
                            </span>
                            <span className="text-[10px] text-zinc-400 block font-medium">
                              {status.detailText}
                            </span>
                          </div>
                        </td>

                        {/* 5. Credentials / Winner / Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex flex-col items-end gap-1.5">
                            {/* If match is Completed */}
                            {status.stage === 'completed' && (
                              <div className="space-y-1 text-right">
                                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#14141d] border border-zinc-700 text-xs font-mono">
                                  <span className="text-zinc-400 text-[10px] uppercase font-bold">Winner:</span>
                                  <strong className="text-amber-300 font-black">{status.winnerName}</strong>
                                </div>
                                {status.isUserWinner ? (
                                  <span className="text-[10px] font-black text-emerald-400 block">
                                    +₹{status.wonAmount.toFixed(2)} Credited to Wallet
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-zinc-500 block">
                                    Better luck next round!
                                  </span>
                                )}
                              </div>
                            )}

                            {/* If match is Cancelled */}
                            {status.stage === 'cancelled' && (
                              <span className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px] font-bold">
                                Refund Credited
                              </span>
                            )}

                            {/* If Room Credentials Available and Match is Active/Live */}
                            {status.stage !== 'completed' && status.stage !== 'cancelled' && m.has_room_credentials && (
                              <div className="flex items-center space-x-1.5 font-mono">
                                <button
                                  type="button"
                                  onClick={() => copyText(m.room_id, 'id', m.id)}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[10px] font-bold transition cursor-pointer"
                                  title="Copy Room ID"
                                >
                                  {copiedId === m.id ? 'COPIED' : `ID: ${m.room_id}`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyText(m.room_password, 'pass', m.id)}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[10px] font-bold transition cursor-pointer"
                                  title="Copy Password"
                                >
                                  {copiedPass === m.id ? 'COPIED' : `PASS: ${m.room_password}`}
                                </button>
                              </div>
                            )}

                            {/* If Pending without Credentials */}
                            {status.stage === 'pending' && (
                              <span className="text-[10px] text-zinc-500 italic">
                                Waiting for Host
                              </span>
                            )}

                            {/* Share on WhatsApp */}
                            {status.stage !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const timeStr = new Date(m.match_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  const text =
                                    `🔥 *LOCALESPORT MATCH #${m.id}* 🔥\n\n` +
                                    `🏆 *Tournament:* ${m.title} (${m.format.toUpperCase()})\n` +
                                    `📍 *Assigned Slot:* Slot #${m.my_slot_number} (${m.my_team_name})\n` +
                                    `💰 *Prize Pool:* ₹${m.prize_pool}\n` +
                                    `⏰ *Match Time:* ${timeStr}\n\n` +
                                    (m.has_room_credentials && status.stage !== 'completed' ? `⚡ *Room ID:* ${m.room_id} | *Pass:* ${m.room_password}\n\n` : '') +
                                    (status.stage === 'completed' ? `👑 *Winner:* ${status.winnerName}\n\n` : '') +
                                    `👉 *View on LocalEsport:* ${window.location.origin}/yourmatches`;

                                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center space-x-1 cursor-pointer"
                              >
                                <span>Share with Squad</span>
                                <span>&rarr;</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card / Row View (Stacks cleanly on phones) */}
            <div className="md:hidden space-y-3">
              {paginatedMatches.map((m) => {
                const status = getMatchLifecycle(m);
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {m.game_name} • {m.format.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Slot #{m.my_slot_number}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{m.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-[10px] font-black">
                        #{m.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#101016] p-2.5 rounded-xl border border-zinc-800/60 font-mono">
                      <div>
                        <span className="text-[9px] uppercase text-zinc-500 font-bold block">Team:</span>
                        <strong className="text-white text-[11px] truncate block">{m.my_team_name}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase text-zinc-500 font-bold block">Match Time:</span>
                        <strong className="text-silver text-[11px]">
                          {new Date(m.match_start_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </strong>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="space-y-1 pt-1">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${status.badgeClasses}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                        <span>{status.badgeLabel}</span>
                      </span>
                      <p className="text-[11px] text-zinc-400 font-medium">{status.detailText}</p>
                    </div>

                    {/* Room Credentials (if active and available) */}
                    {status.stage !== 'completed' && status.stage !== 'cancelled' && m.has_room_credentials && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 font-mono">
                        <button
                          type="button"
                          onClick={() => copyText(m.room_id, 'id', m.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center justify-between"
                        >
                          <span className="text-[9px] text-zinc-500 uppercase">ID</span>
                          <span>{copiedId === m.id ? 'COPIED' : m.room_id}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(m.room_password, 'pass', m.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center justify-between"
                        >
                          <span className="text-[9px] text-zinc-500 uppercase">PASS</span>
                          <span>{copiedPass === m.id ? 'COPIED' : m.room_password}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
                >
                  &larr; Previous
                </button>

                <div className="flex items-center space-x-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentPage === pg
                          ? 'bg-white text-black font-black'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
