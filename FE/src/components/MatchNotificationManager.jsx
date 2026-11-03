import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Global Real-Time Match Notification & Push Alert Manager
 * - Native Browser Push Notifications (OS level) when Room ID & Password are released
 * - In-app high-visibility alert banner with 1-click copy
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
        // Small delay so page loads smoothly first
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
        // Test notification so user sees it works!
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('LocalEsport Notifications Enabled!', {
            body: 'You will receive instant alerts when your tournament room ID & password are ready.',
            icon: '/vite.svg',
            tag: 'welcome-notification',
          });
        } else {
          new Notification('LocalEsport Notifications Enabled!', {
            body: 'You will receive instant alerts when your tournament room ID & password are ready.',
            icon: '/vite.svg',
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
      icon: '/vite.svg',
      badge: '/vite.svg',
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
    if (!token) return;

    let isMounted = true;

    const checkMatches = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tournaments/my-matches`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status && isMounted) {
          const matches = res.data.data || [];
          for (const m of matches) {
            // If match has credentials and is not completed
            if (
              m.has_room_credentials &&
              m.room_id &&
              m.room_password &&
              m.status !== 'completed' &&
              m.status !== 'cancelled'
            ) {
              const alertKey = `room_alert_${m.id}_${m.room_id}`;
              const alreadyNotified =
                seenMatchesRef.current.has(alertKey) ||
                sessionStorage.getItem(alertKey);

              if (!alreadyNotified) {
                // MARK AS NOTIFIED
                seenMatchesRef.current.add(alertKey);
                sessionStorage.setItem(alertKey, 'true');

                // 1. Play loud gaming chime
                playGamingAlertSound();

                // 2. Fire Native Browser Push Notification
                triggerNativePushNotification(m);

                // 3. Set In-App Visual Alert Banner
                setActiveAlert(m);
              }
            }
          }
        }
      } catch (err) {
        // Silently continue polling
      }
    };

    // Run immediately, then poll every 6 seconds
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
      {/* 1. PERMISSION PROMPT BANNER (Top of page) */}
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
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-bold px-2 py-1"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MATCH STARTING NOW - IN-APP FLASHING ALERT BANNER */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] w-[95vw] max-w-2xl bg-gradient-to-br from-[#1a0f0a] via-[#120a06] to-[#0a0503] border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-[0_15px_60px_rgba(245,158,11,0.45)] backdrop-blur-2xl text-white overflow-hidden"
          >
            {/* Pulsing glow background */}
            <div className="absolute inset-0 bg-amber-500/10 animate-pulse pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center flex-shrink-0 text-amber-300 animate-bounce">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </span>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    MATCH STARTING NOW!
                  </div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    {activeAlert.title}
                  </h3>
                </div>
              </div>

              {/* Room ID and Password 1-click Copy */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => copyText(activeAlert.room_id, 'id')}
                  className="flex-1 sm:flex-none px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/60 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span className="text-zinc-400 text-[10px] uppercase">ID:</span>
                  <span className="text-amber-300">{copiedId ? 'COPIED!' : activeAlert.room_id}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyText(activeAlert.room_password, 'pass')}
                  className="flex-1 sm:flex-none px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/60 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span className="text-zinc-400 text-[10px] uppercase">PASS:</span>
                  <span className="text-amber-300">{copiedPass ? 'COPIED!' : activeAlert.room_password}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAlert(null);
                    if (location.pathname !== '/yourmatches') {
                      navigate('/yourmatches');
                    }
                  }}
                  className="px-3.5 py-2 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-md cursor-pointer"
                >
                  View Match
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="text-zinc-400 hover:text-white p-1.5 text-base leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
