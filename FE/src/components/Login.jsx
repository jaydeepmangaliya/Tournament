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
      const response = await axios.post('http://localhost:2000/auth/login', {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg text-white">

        {isLoggedIn ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">You are already logged in</h2>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 transition-colors py-3 rounded font-semibold text-lg"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-6 text-center">Login to GameArena</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block mb-2 font-semibold">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-green-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 font-semibold">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-green-500"
                  placeholder="Your password"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 transition-colors py-3 rounded font-semibold text-lg"
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
