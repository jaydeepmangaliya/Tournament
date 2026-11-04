import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

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

/**
 * Global Real-Time Match Notification & Push Alert Manager
 * - Native Browser & Mobile OS Push Notifications (VAPID / WebPush protocol)
 * - 1-Click "Copy Room ID & Pass" Floating Banner (shown on non-/yourmatches pages, easily dismissible)
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
  const [stickyMatch, setStickyMatch] = useState(null);
  const [cancelledAlert, setCancelledAlert] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [dismissedRoomIds, setDismissedRoomIds] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dismissed_room_alerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

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

  const subscribeToPushServer = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/notifications/vapid-key`);
      const vapidPublicKey = keyRes.data?.publicKey;
      if (!vapidPublicKey) return;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      if (token) {
        await axios.post(
          `${import.meta.env.VITE_API_URL || ""}/api/notifications/subscribe`,
          { subscription: sub },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.warn('[Push Notification] Push subscription error:', err);
    }
  };

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
    } else if ('Notification' in window && Notification.permission === 'granted') {
      subscribeToPushServer();
    }
  }, [token]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      setShowPrompt(false);
      if (perm === 'granted') {
        await subscribeToPushServer();
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('⚡ LocalEsport Notifications Enabled!', {
            body: 'You will receive instant phone alerts with 1-tap Copy buttons when your Room ID & Password are ready!',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'welcome-notification',
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

  const handleDismissRoom = (matchId) => {
    setDismissedRoomIds((prev) => {
      const next = new Set(prev).add(matchId);
      try {
        sessionStorage.setItem('dismissed_room_alerts', JSON.stringify([...next]));
      } catch {}
      return next;
    });
    setStickyMatch(null);
  };

  // Play Futuristic Gaming Chime Sound
  const playGamingAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
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

  // Trigger Native Operating System Push Notification with 1-Tap Copy Actions
  const triggerNativePushNotification = async (match) => {
    const cleanRoom = (match.room_id || '').trim();
    const cleanPass = (match.room_password || '').trim();
    const title = `⚡ Match Room Ready! ${match.title}`;
    const body = `Room ID: ${cleanRoom} | Pass: ${cleanPass}\nMatch starts soon. Tap to copy!`;

    const options = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `match-room-${match.id}`,
      requireInteraction: true,
      data: {
        url: `/yourmatches?copied=id&val=${encodeURIComponent(cleanRoom)}`,
        roomId: cleanRoom,
        roomPassword: cleanPass,
      },
      actions: [
        { action: 'copy-id', title: `📋 Copy Room: ${cleanRoom}` },
        { action: 'copy-pass', title: `🔑 Copy Pass: ${cleanPass}` },
      ],
    };

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, options);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          window.location.href = `/yourmatches?copied=id&val=${encodeURIComponent(cleanRoom)}`;
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
          `${import.meta.env.VITE_API_URL || ""}/api/tournaments/my-matches`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status && isMounted) {
          const matches = res.data.data || [];

          // Find active match with live room credentials that has not been dismissed
          const activeRoomMatch = matches.find(
            (m) =>
              m.has_room_credentials &&
              m.room_id &&
              m.room_password &&
              m.status !== 'completed' &&
              m.status !== 'cancelled' &&
              !dismissedRoomIds.has(m.id)
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
    const interval = setInterval(checkMatches, 7000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, dismissedRoomIds]);

  const copyText = (text, type) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // If user is already on "/yourmatches", don't render the floating sticky bar (they already see their match list)
  const isMatchesPage = location.pathname === '/yourmatches';

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
                    Enable push notifications to receive instant Room ID &amp; Password alerts directly on your phone lock screen.
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
                    Match Cancelled &amp; Refunded!
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

      {/* 3. MOBILE-OPTIMIZED DISMISSIBLE FLOATING ROOM BAR (Shown on non-match pages only) */}
      <AnimatePresence>
        {!isMatchesPage && stickyMatch && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            className="fixed top-16 sm:top-20 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 sm:w-[94vw] sm:max-w-2xl"
          >
            <div className="bg-[#0e0e16]/98 border border-amber-500/70 rounded-2xl p-2.5 sm:p-3 shadow-[0_10px_35px_rgba(245,158,11,0.35)] backdrop-blur-xl text-white">
              {/* Header row: Status + Match title + Close Button */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black uppercase text-amber-300 tracking-wider flex-shrink-0">
                    ROOM LIVE • SLOT #{stickyMatch.my_slot_number}
                  </span>
                  <span className="text-xs font-bold text-white truncate hidden sm:inline">
                    — {stickyMatch.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/yourmatches')}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-wider rounded-lg transition shadow-sm cursor-pointer"
                  >
                    My Matches
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissRoom(stickyMatch.id)}
                    className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 transition cursor-pointer"
                    title="Close room notification"
                    aria-label="Close notification"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Action row: Clean, responsive ID & Pass pills */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {/* Room ID Pill */}
                <div className="flex items-center justify-between bg-black/70 border border-zinc-700/80 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-center space-x-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">ID:</span>
                    <span className="font-mono font-black text-amber-300 truncate select-all">{stickyMatch.room_id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(stickyMatch.room_id, 'id')}
                    className={`ml-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer flex-shrink-0 ${
                      copiedId
                        ? 'bg-emerald-500 text-black'
                        : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40'
                    }`}
                  >
                    {copiedId ? 'COPIED!' : 'COPY'}
                  </button>
                </div>

                {/* Password Pill */}
                <div className="flex items-center justify-between bg-black/70 border border-zinc-700/80 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-center space-x-1 min-w-0">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">PASS:</span>
                    <span className="font-mono font-black text-amber-300 truncate select-all">{stickyMatch.room_password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(stickyMatch.room_password, 'pass')}
                    className={`ml-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer flex-shrink-0 ${
                      copiedPass
                        ? 'bg-emerald-500 text-black'
                        : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40'
                    }`}
                  >
                    {copiedPass ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
