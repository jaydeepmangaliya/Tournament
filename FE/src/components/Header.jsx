import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import WalletModal from './WalletModal';
import BrandLogo from './BrandLogo';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return u.total_balance !== undefined ? parseFloat(u.total_balance) : null;
      }
    } catch (e) {}
    return null;
  });
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [copiedCode, setCopiedCode] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const fetchProfile = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setUser(null);
      setWalletBalance(null);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.data.status) {
        setUser(res.data.data);
        const bal = parseFloat(res.data.data.total_balance || 0);
        setWalletBalance(bal);
        localStorage.setItem('user', JSON.stringify(res.data.data));
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: bal }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [location.pathname, token]);

  useEffect(() => {
    const handleWalletUpdated = (e) => {
      if (e.detail !== undefined && e.detail !== null) {
        setWalletBalance(parseFloat(e.detail));
      }
    };
    window.addEventListener('wallet_updated', handleWalletUpdated);
    return () => window.removeEventListener('wallet_updated', handleWalletUpdated);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setWalletBalance(null);
    navigate('/login');
  };

  const handleCopyCode = () => {
    const code = user?.my_code || user?.referral_code || user?.affiliate_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // CLEAN DYNAMIC NAVIGATION BASED ON USER ROLE
  const isAffiliate = user?.role === 'affiliate';
  const isGuest = !user;

  let navLinks = [];
  if (isGuest) {
    navLinks = [
      { label: 'Home', path: '/' },
      { label: 'Tournaments', path: '/tournaments' },
      { label: 'Leaderboard', path: '/leaderboard' },
    ];
  } else if (isAffiliate) {
    navLinks = [
      { label: 'Partner Dashboard', path: '/affiliate' },
      { label: 'All Tournaments', path: '/tournaments' },
      { label: 'Leaderboard', path: '/leaderboard' },
    ];
  } else {
    // Player / regular user
    navLinks = [
      { label: 'Tournaments', path: '/tournaments' },
      { label: 'Leaderboard', path: '/leaderboard' },
      { label: 'My Matches', path: '/yourmatches' },
      { label: 'Refer & Earn', path: '/refer-and-earn' },
    ];
  }

  const userCode = user?.my_code || user?.referral_code || user?.affiliate_code;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-40 bg-[#07070a]/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <BrandLogo size="md" />
            {isAffiliate && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 tracking-wider">
                Partner
              </span>
            )}
          </Link>

          {/* Desktop Nav - Focused & Clean */}
          <nav className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-zinc-200 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {isGuest ? (
              <>
                <Link
                  to="/affiliate"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white px-3 py-1.5 transition"
                >
                  Become an Affiliate
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-2 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(255,255,255,0.12)]"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                {/* Code Pill */}
                {userCode && (
                  <button
                    onClick={handleCopyCode}
                    title="Click to copy your code"
                    className="flex items-center space-x-1.5 bg-[#0e0e13] hover:bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl transition text-xs font-mono"
                  >
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                      {isAffiliate ? 'AFF' : 'REF'}:
                    </span>
                    <strong className="text-zinc-200">{userCode}</strong>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{copiedCode ? 'COPIED' : 'COPY'}</span>
                  </button>
                )}

                {/* Wallet Chip */}
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span className="text-xs font-extrabold text-white font-mono">
                    ₹{walletBalance !== null ? parseFloat(walletBalance).toFixed(2) : '0.00'}
                  </span>
                </button>

                {/* User Info & Logout */}
                <div className="flex items-center space-x-2 pl-2 border-l border-zinc-800">
                  <div className="text-left text-xs max-w-[100px] truncate">
                    <span className="font-bold text-zinc-200 block truncate">{user.name || user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 rounded-lg transition text-xs cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger & Quick Wallet */}
          <div className="flex items-center space-x-2 md:hidden">
            {user && (
              <button
                onClick={() => setWalletModalOpen(true)}
                className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white font-mono active:scale-95 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>₹{walletBalance !== null ? parseFloat(walletBalance).toFixed(2) : '0.00'}</span>
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-zinc-300 hover:text-white focus:outline-none rounded-lg bg-zinc-900/60 border border-zinc-800"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-zinc-800 space-y-2 bg-[#0c0c10] p-4 rounded-2xl shadow-2xl border border-zinc-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-zinc-800 active:bg-zinc-700 transition"
              >
                {link.label}
              </Link>
            ))}

            {isGuest && (
              <Link
                to="/affiliate"
                onClick={() => setMobileOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                Affiliate Program (10% Cut)
              </Link>
            )}

            {/* Mobile User Details & Quick Actions */}
            <div className="pt-3 border-t border-zinc-800 space-y-2.5">
              {user ? (
                <>
                  <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-white truncate">{user.name || user.email}</p>
                      <span className="text-zinc-400 font-mono text-[10px] block truncate">
                        {isAffiliate ? 'Partner Code' : 'Referral Code'}: {userCode}
                      </span>
                    </div>
                    {userCode && (
                      <button
                        onClick={handleCopyCode}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-zinc-700 flex-shrink-0"
                      >
                        {copiedCode ? 'COPIED' : 'COPY'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setWalletModalOpen(true);
                      }}
                      className="py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition"
                    >
                      Wallet (₹{walletBalance !== null ? parseFloat(walletBalance).toFixed(2) : '0.00'})
                    </button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      className="py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                  >
                    Sign In / Register
                  </Link>
                  <Link
                    to="/login?role=affiliate"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center py-2.5 border border-zinc-700 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl"
                  >
                    Join as Affiliate Partner
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Wallet Modal */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onBalanceUpdate={(balances) => {
          setWalletBalance(balances.total);
          window.dispatchEvent(new CustomEvent('wallet_updated', { detail: balances.total }));
        }}
      />
    </>
  );
};

export default Header;
