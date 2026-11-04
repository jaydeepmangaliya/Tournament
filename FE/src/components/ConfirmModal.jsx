import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  onConfirm,
  onCancel,
  loading = false,
  promptInput = false,
  promptPlaceholder = '',
  promptValue = '',
  onPromptChange = () => {}
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  const borderColor = isDanger
    ? 'border-red-500/40 shadow-[0_20px_60px_rgba(239,68,68,0.2)]'
    : isWarning
    ? 'border-amber-500/40 shadow-[0_20px_60px_rgba(245,158,11,0.2)]'
    : 'border-cyan-500/40 shadow-[0_20px_60px_rgba(6,182,212,0.2)]';

  const confirmBtnBg = isDanger
    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20'
    : isWarning
    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/20'
    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.18 }}
          className={`relative w-full max-w-md bg-[#0e0e14] border ${borderColor} rounded-2xl p-6 shadow-2xl text-white`}
        >
          {/* Header with Icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDanger
                ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                : isWarning
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
            }`}>
              {isDanger && (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              {isWarning && (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {!isDanger && !isWarning && (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black tracking-wide text-white uppercase mb-1">
                {title}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-medium">
                {message}
              </p>
            </div>
          </div>

          {/* Optional Prompt Input (e.g. withdrawal rejection reason) */}
          {promptInput && (
            <div className="mb-4">
              <input
                type="text"
                autoFocus
                placeholder={promptPlaceholder}
                value={promptValue}
                onChange={(e) => onPromptChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-700 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition font-mono"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition border border-zinc-700/60 disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-50 cursor-pointer ${confirmBtnBg}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

