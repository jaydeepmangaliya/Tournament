import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  // If already logged in as admin, redirect directly to /admin
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (token && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please enter both admin email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      if (res.data.status) {
        const { token, user } = res.data;

        // Verify that this account is an administrator
        if (user?.role !== 'admin') {
          setError('Access Denied: This account is not an authorized administrator.');
          setLoading(false);
          return;
        }

        // Save admin session
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        setSuccess('Authentication successful! Redirecting to Organizer Console...');
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 800);
      } else {
        setError(res.data.message || 'Invalid administrator credentials.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex items-center justify-center p-4 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 block">
              Organizer Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Admin <span className="text-silver">Authentication</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Restricted access. Only verified tournament organizers and room administrators may sign in.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-700 text-red-300 text-xs font-semibold flex items-start space-x-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-600 text-emerald-200 text-xs font-semibold flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="admin@localesport.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#121218] border border-zinc-700 focus:border-zinc-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Security Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121218] border border-zinc-700 focus:border-zinc-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg disabled:opacity-50 mt-2 flex items-center justify-center space-x-1.5"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>Access Admin Console</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500">
            Player or Affiliate?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-zinc-300 font-bold hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

