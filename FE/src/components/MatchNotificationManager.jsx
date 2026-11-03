import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Global Real-Time Match Notification & Push Alert Manager
 * - Native Browser Push Notifications (OS level) when Room ID & Password are released
 * - 1-Click "Copy Room ID & Pass" Sticky Notification Bar staying at the top of the screen
 * - Instant Cancelled Match Refund Banner
 * - High-pitched gaming audio chime synthesized via Web Audio API
 */
export default function MatchNotificationManager() {
  const [permission, setPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied';
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [stickyMatch, setStickyMatch] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [cancelledAlert, setCancelledAlert] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const seenMatchesRef = useRef(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  // Register Service Worker for background push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('[Push Notification] Service worker active'))
        .catch((err) => console.log('[Push Notification] SW error:', err));
    }
  }, []);

  // Show permission prompt if logged in and not yet requested
  useEffect(() => {
    if (!token) {
      setShowPrompt(false);
      return;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('notif_prompt_dismissed');
      if (!dismissed) {
        const t = setTimeout(() => setShowPrompt(true), 2500);
        return () => clearTimeout(t);
      }
    }
  }, [token]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      setShowPrompt(false);
      if (perm === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('LocalEsport Notifications Enabled!', {
            body: 'You will receive instant alerts when your tournament room ID & password are ready.',
            icon: '/favicon.svg',
            tag: 'welcome-notification',
          });
        } else {
          new Notification('LocalEsport Notifications Enabled!', {
            body: 'You will receive instant alerts when your tournament room ID & password are ready.',
            icon: '/favicon.svg',
          });
        }
      }
    } catch (e) {
      console.log('Notification permission error:', e);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem('notif_prompt_dismissed', 'true');
  };

  // Play Futuristic Gaming Chime Sound
  const playGamingAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      // 4-tone triumphant alert chime (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.35);
      });
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  // Trigger Native Operating System Push Notification
  const triggerNativePushNotification = async (match) => {
    const title = `⚡ Match Starting Now! ${match.title}`;
    const body = `Room ID: ${match.room_id} | Password: ${match.room_password}\nClick to join the custom room immediately!`;

    const options = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `match-room-${match.id}`,
      requireInteraction: true,
      data: { url: '/yourmatches' },
    };

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, options);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          window.location.href = '/yourmatches';
        };
      }
    } catch (err) {
      console.log('Push notification trigger error:', err);
    }
  };

  // Background Match Polling: Runs on any page when player is logged in
  useEffect(() => {
    if (!token) {
      setStickyMatch(null);
      return;
    }

    let isMounted = true;

    const checkMatches = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tournaments/my-matches`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status && isMounted) {
          const matches = res.data.data || [];

          // Find if there is an active match with live room credentials
          const activeRoomMatch = matches.find(
            (m) =>
              m.has_room_credentials &&
              m.room_id &&
              m.room_password &&
              m.status !== 'completed' &&
              m.status !== 'cancelled'
          );

          if (activeRoomMatch) {
            setStickyMatch(activeRoomMatch);

            const alertKey = `room_alert_${activeRoomMatch.id}_${activeRoomMatch.room_id}`;
            const alreadyNotified =
              seenMatchesRef.current.has(alertKey) ||
              sessionStorage.getItem(alertKey);

            if (!alreadyNotified) {
              seenMatchesRef.current.add(alertKey);
              sessionStorage.setItem(alertKey, 'true');

              // 1. Play loud gaming chime
              playGamingAlertSound();

              // 2. Fire Native Browser Push Notification
              triggerNativePushNotification(activeRoomMatch);

              // 3. Set In-App Visual Alert Banner
              setActiveAlert(activeRoomMatch);
            }
          } else {
            setStickyMatch(null);
          }

          // Check if any match was recently cancelled by Admin to notify player of wallet refund
          const recentlyCancelled = matches.find((m) => m.status === 'cancelled');
          if (recentlyCancelled) {
            const cancelKey = `cancelled_seen_${recentlyCancelled.id}`;
            if (!sessionStorage.getItem(cancelKey)) {
              sessionStorage.setItem(cancelKey, 'true');
              setCancelledAlert(recentlyCancelled);
              setTimeout(() => {
                if (isMounted) setCancelledAlert(null);
              }, 12000);
            }
          }
        }
      } catch (err) {
        // Silently continue polling
      }
    };

    checkMatches();
    const interval = setInterval(checkMatches, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <>
      {/* 1. PERMISSION PROMPT BANNER */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-xl bg-gradient-to-r from-[#0c1524] via-[#09111b] to-[#0c1524] border border-cyan-500/40 rounded-2xl p-3 sm:p-4 shadow-[0_10px_35px_rgba(6,182,212,0.25)] backdrop-blur-xl text-white"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 text-cyan-300">
                  <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Never Miss A Match!
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-medium">
                    Enable push notifications to receive instant Room ID & Password alerts directly on your screen.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={requestPermission}
                  className="px-3.5 py-1.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-md cursor-pointer"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={dismissPrompt}
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-bold px-2 py-1 cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MATCH CANCELLED & REFUNDED BANNER */}
      <AnimatePresence>
        {cancelledAlert && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[99998] w-[94vw] max-w-xl bg-gradient-to-r from-rose-950 via-[#180a0e] to-rose-950 border border-rose-500/60 rounded-2xl p-3 sm:p-4 shadow-[0_10px_35px_rgba(244,63,94,0.3)] backdrop-blur-xl text-white"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center flex-shrink-0 text-rose-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                    Match Cancelled & Refunded!
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-medium">
                    "{cancelledAlert.title}" was cancelled by Admin. ₹{parseFloat(cancelledAlert.entry_fee_paid || cancelledAlert.entry_fee).toFixed(2)} has been credited to your <strong className="text-white">Withdrawable Wallet Balance</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/yourmatches')}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => setCancelledAlert(null)}
                  className="text-zinc-500 hover:text-white text-base leading-none px-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. STICKY TOP "COPY ROOM ID & PASS" NOTIFICATION BAR */}
      <AnimatePresence>
        {stickyMatch && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-[58px] sm:top-[64px] left-1/2 -translate-x-1/2 z-40 w-[96vw] max-w-4xl"
          >
            {isMinimized ? (
              // MINIMIZED COMPACT FLOATING PILL
              <div className="flex items-center justify-between bg-[#0e0e14]/95 border border-amber-500/70 rounded-full px-3.5 py-1.5 shadow-[0_6px_25px_rgba(245,158,11,0.35)] backdrop-blur-xl">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    Room Live:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-white">
                    ID: {stickyMatch.room_id}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => copyText(stickyMatch.room_id, 'id')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      copiedId
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700'
                    }`}
                  >
                    {copiedId ? 'COPIED!' : 'COPY ID'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(stickyMatch.room_password, 'pass')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      copiedPass
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700'
                    }`}
                  >
                    {copiedPass ? 'COPIED!' : 'COPY PASS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMinimized(false)}
                    title="Expand Room Details"
                    className="p-1 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              // FULL HIGH-VISIBILITY STICKY BAR
              <div className="relative bg-[#0b0b12]/95 border-2 border-amber-500/80 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_12px_40px_rgba(245,158,11,0.38)] backdrop-blur-2xl text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none" />

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                  {/* Left: Match Info & Live Badge */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center flex-shrink-0 text-amber-300">
                      <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span>ROOM LIVE</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">
                          Slot #{stickyMatch.my_slot_number}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-white truncate max-w-[190px] sm:max-w-xs md:max-w-sm">
                        {stickyMatch.title}
                      </h4>
                    </div>
                  </div>

                  {/* Center & Right: 1-Click Room ID & Pass Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
                    {/* Room ID Pill */}
                    <div className="flex items-center bg-black/70 border border-zinc-700/80 rounded-xl px-2.5 py-1 space-x-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Room:</span>
                      <span className="text-xs font-mono font-black text-amber-300">{stickyMatch.room_id}</span>
                      <button
                        type="button"
                        onClick={() => copyText(stickyMatch.room_id, 'id')}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          copiedId
                            ? 'bg-emerald-500 text-black shadow-sm'
                            : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40'
                        }`}
                      >
                        {copiedId ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>

                    {/* Pass Pill */}
                    <div className="flex items-center bg-black/70 border border-zinc-700/80 rounded-xl px-2.5 py-1 space-x-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Pass:</span>
                      <span className="text-xs font-mono font-black text-amber-300">{stickyMatch.room_password}</span>
                      <button
                        type="button"
                        onClick={() => copyText(stickyMatch.room_password, 'pass')}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          copiedPass
                            ? 'bg-emerald-500 text-black shadow-sm'
                            : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40'
                        }`}
                      >
                        {copiedPass ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>

                    {/* View Match */}
                    <button
                      type="button"
                      onClick={() => navigate('/yourmatches')}
                      className="hidden sm:inline-flex px-3 py-1.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow cursor-pointer"
                    >
                      My Matches
                    </button>

                    {/* Minimize Button */}
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      title="Minimize Sticky Bar"
                      className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
