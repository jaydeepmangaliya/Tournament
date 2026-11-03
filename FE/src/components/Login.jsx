import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('player'); // 'player' | 'affiliate'
  const [referralCode, setReferralCode] = useState('');
  const [verifiedInfo, setVerifiedInfo] = useState(null); // { type, ownerName, message }
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref') || params.get('aff');
    const paramRole = params.get('role');

    if (ref) {
      const code = ref.toUpperCase();
      setReferralCode(code);
      setIsRegisterMode(true);
      checkCode(code);
    }
    if (paramRole === 'affiliate') {
      setRole('affiliate');
      setIsRegisterMode(true);
    }
  }, [location.search]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const checkCode = async (code) => {
    if (!code || code.trim().length < 4) {
      setVerifiedInfo(null);
      return;
    }
    try {
      setVerifying(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/verify-code/${code.trim().toUpperCase()}`);
      if (res.data.status) {
        setVerifiedInfo(res.data);
      } else {
        setVerifiedInfo({ status: false, message: res.data.message });
      }
    } catch (err) {
      setVerifiedInfo(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.toUpperCase();
    setReferralCode(val);
    if (val.length >= 4) {
      checkCode(val);
    } else {
      setVerifiedInfo(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (isRegisterMode && !name) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegisterMode
        ? { email, password, name, phone, role, referralCode }
        : { email, password };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, payload);
      const { token, message, user } = response.data;

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setIsLoggedIn(true);
        setSuccess(message || `${isRegisterMode ? 'Registration' : 'Login'} successful!`);

        setTimeout(() => {
          if (user?.role === 'admin') {
            navigate('/admin');
          } else if (user?.role === 'affiliate') {
            navigate('/affiliate');
          } else {
            navigate('/tournaments');
          }
        }, 1200);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || `${isRegisterMode ? 'Registration' : 'Login'} failed. Try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setSuccess('Logged out successfully!');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex items-center justify-center px-3 sm:px-4 pt-24 pb-16">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-4 sm:p-8 shadow-2xl relative"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white">
              GAME<span className="text-silver">ARENA</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Local Esports Tournament & Earnings Platform
            </p>
          </div>

          {isLoggedIn ? (
            <div className="text-center py-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Active Session Detected</h2>
              <p className="text-zinc-400 text-xs">Jump into tournaments or manage your wallet balance.</p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => navigate('/tournaments')}
                  className="w-full py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition"
                >
                  Enter Tournaments
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Logout
                </button>
              </div>
              <div className="pt-2 text-center text-[10px] text-zinc-500">
                <Link to="/terms" target="_blank" className="hover:text-zinc-300 underline transition">
                  Review Official Terms & Rules
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Tab Toggle */}
              <div className="flex border-b border-zinc-800 mb-6 text-xs font-black uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError('');
                  }}
                  className={`flex-1 pb-3 text-center transition ${
                    !isRegisterMode
                      ? 'text-white border-b-2 border-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError('');
                  }}
                  className={`flex-1 pb-3 text-center transition ${
                    isRegisterMode
                      ? 'text-white border-b-2 border-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Role Selector in Register Mode */}
              {isRegisterMode && (
                <div className="mb-5 space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                    Select Role (Determines Your Code Type):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('player')}
                      className={`p-3 rounded-xl border text-left transition ${
                        role === 'player'
                          ? 'bg-zinc-800 border-zinc-400 text-white shadow-md'
                          : 'bg-[#121218] border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="font-black text-xs uppercase tracking-wider block">Player Account</span>
                      <span className="text-[10px] text-zinc-300 font-mono block mt-0.5">
                        Gets: REF-XXXX
                      </span>
                      <span className="text-[9px] text-zinc-400 block mt-0.5">
                        Play & refer friends
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('affiliate')}
                      className={`p-3 rounded-xl border text-left transition ${
                        role === 'affiliate'
                          ? 'bg-zinc-800 border-zinc-400 text-white shadow-md'
                          : 'bg-[#121218] border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="font-black text-xs uppercase tracking-wider block">Affiliate Partner</span>
                      <span className="text-[10px] text-silver font-mono font-bold block mt-0.5">
                        Gets: AFF-XXXX
                      </span>
                      <span className="text-[9px] text-zinc-400 block mt-0.5">
                        Earn 10% on every ticket
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isRegisterMode && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Total Gaming"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                {isRegisterMode && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                      WhatsApp Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 pr-12 text-xs text-white focus:outline-none focus:border-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px] uppercase font-bold"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {isRegisterMode && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        Referral / Affiliate Code (Optional)
                      </label>
                      {verifying && <span className="text-[10px] text-zinc-500 font-mono">Checking...</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. AFF-XXXX or REF-XXXX"
                      value={referralCode}
                      onChange={handleCodeChange}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs uppercase text-zinc-200 font-mono focus:outline-none focus:border-zinc-400"
                    />
                    {verifiedInfo && (
                      <div className="mt-1.5 text-[10px] font-semibold">
                        {verifiedInfo.status ? (
                          <span className="text-zinc-200 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 inline-block"></span>
                            <span>{verifiedInfo.message}</span>
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                            <span>{verifiedInfo.message}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-950/40 border border-red-700 text-red-300 rounded-xl text-xs font-semibold">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-zinc-800 border border-zinc-600 text-white rounded-xl text-xs font-semibold">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading
                    ? 'Processing...'
                    : isRegisterMode
                    ? `Create ${role === 'affiliate' ? 'Affiliate Partner Account' : 'Player Account'}`
                    : 'Sign In to LocalEsport'}
                </button>

                {/* Professional Statutory Compliance & Terms Agreement */}
                <div className="pt-3 text-center space-y-2">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    By continuing, you agree to our{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="text-zinc-200 underline underline-offset-4 hover:text-white font-medium transition"
                    >
                      Terms of Service
                    </Link>
                    {' '}&amp;{' '}
                    <Link
                      to="/fairplay"
                      target="_blank"
                      className="text-zinc-200 underline underline-offset-4 hover:text-white font-medium transition"
                    >
                      Fair Play Policy
                    </Link>
                  </p>

                  <div className="flex items-center justify-center space-x-2 text-[10px] text-zinc-500 font-mono">
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>18+ Adults Only</span>
                    </span>
                    <span>•</span>
                    <span>Skill Gaming</span>
                    <span>•</span>
                    <Link to="/rules" target="_blank" className="hover:text-zinc-300 underline underline-offset-2">
                      Restricted States
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
