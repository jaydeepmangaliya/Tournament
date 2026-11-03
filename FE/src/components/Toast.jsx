import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modern floating Toast / Pop-up Notification
 * Supports types: 'error' | 'success' | 'warning' | 'info'
 */
export default function Toast({ toast, onClose, duration = 4500 }) {
  useEffect(() => {
    if (!toast || !toast.message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast || !toast.message) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  const borderColor = isError
    ? 'border-red-500/60 shadow-[0_12px_40px_rgba(239,68,68,0.25)]'
    : isSuccess
    ? 'border-emerald-500/60 shadow-[0_12px_40px_rgba(16,185,129,0.25)]'
    : isWarning
    ? 'border-amber-500/60 shadow-[0_12px_40px_rgba(245,158,11,0.25)]'
    : 'border-cyan-500/60 shadow-[0_12px_40px_rgba(6,182,212,0.25)]';

  const bgGradient = isError
    ? 'from-[#1a0c0e] via-[#12080a] to-[#0c0507]'
    : isSuccess
    ? 'from-[#0b1c14] via-[#07130e] to-[#050b08]'
    : isWarning
    ? 'from-[#1c160a] via-[#140f06] to-[#0c0904]'
    : 'from-[#0a171d] via-[#060f14] to-[#04080b]';

  const iconColor = isError
    ? 'text-red-400 bg-red-500/15 border-red-500/30'
    : isSuccess
    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    : isWarning
    ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    : 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';

  const defaultTitle = isError
    ? 'Action Blocked'
    : isSuccess
    ? 'Success'
    : isWarning
    ? 'Attention'
    : 'Notice';

  return (
    <AnimatePresence>
      <motion.div
        key="toast-popup"
        initial={{ opacity: 0, y: -24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.94 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[92vw] max-w-md bg-gradient-to-br ${bgGradient} border ${borderColor} rounded-2xl p-4 backdrop-blur-xl text-white overflow-hidden pointer-events-auto`}
      >
        <div className="flex items-start space-x-3.5">
          {/* Status Icon */}
          <div className={`w-9 h-9 rounded-xl border ${iconColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            {isError && (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {isSuccess && (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {isWarning && (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {!isError && !isSuccess && !isWarning && (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-0.5">
              {toast.title || defaultTitle}
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              {toast.message}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition leading-none text-base"
          >
            &times;
          </button>
        </div>

        {/* Progress Bar */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`h-0.5 mt-3 rounded-full ${
            isError ? 'bg-red-500/70' : isSuccess ? 'bg-emerald-500/70' : isWarning ? 'bg-amber-500/70' : 'bg-cyan-500/70'
          }`}
        />
      </motion.div>
    </AnimatePresence>
  );
}

