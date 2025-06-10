// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check token on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email,
        password,
      });

      const token = response.data.token;

      if (token) {
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        setEmail('');
        setPassword('');
      } else {
        setError('Token not received.');
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.reload(); // Or redirect to login
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-2 sm:px-4">
      <div className="w-full max-w-xs sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-black p-4 sm:p-8 flex flex-col items-center relative">
        {/* Gaming Logo/Avatar */}
        <div className="mb-3 sm:mb-4 flex justify-center">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black flex items-center justify-center shadow-lg border-2 border-white"
            style={{ boxShadow: '0 0 16px #000, 0 0 4px #fff inset' }}>
            <span className="text-white text-2xl sm:text-3xl font-extrabold">🎮</span>
          </div>
        </div>
        {isLoggedIn ? (
          <>
            <h2
              className="text-lg sm:text-xl font-extrabold mb-3 sm:mb-4 text-center text-black tracking-wide"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Already Logged In
            </h2>
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded bg-black hover:bg-gray-800 text-white font-semibold text-base transition-all shadow focus:outline-none focus:ring-2 focus:ring-black"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <h2
              className="text-xl sm:text-2xl font-extrabold mb-1 text-center text-black tracking-widest"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 8px #000, 0 0 2px #fff'
              }}
            >
              GameArena Login
            </h2>
            <div className="text-xs text-gray-700 font-semibold mb-3 sm:mb-4 text-center tracking-wide">
              Enter the Arena. Compete. Win. Repeat.
            </div>
            <div className="w-8 sm:w-10 border-b-2 border-black mx-auto mb-4 sm:mb-5"></div>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 w-full">
              <div>
                <label htmlFor="email" className="block mb-1 text-xs font-semibold text-gray-800">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-100 border border-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black transition-all text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-1 text-xs font-semibold text-gray-800">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-100 border border-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-black transition-all text-sm"
                  placeholder="Your password"
                  required
                />
              </div>
              {error && (
                <div className="bg-gray-900 border border-black text-white text-center rounded py-2 px-3 text-xs font-medium mb-1">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded bg-black hover:bg-gray-800 text-white font-semibold text-base transition-all shadow focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
