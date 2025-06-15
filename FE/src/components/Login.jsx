// Login Component with Interactive Gaming Background
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [clickEffect, setClickEffect] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse movement for character eyes - optimized with useCallback
  const handleMouseMove = useCallback((e) => {
    const rect = document.querySelector('.character-container')?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / 100; // Normalize movement
      const y = (e.clientY - centerY) / 100;
      setMousePosition({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Check token on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (isRegisterMode && !name) {
      setError('Please enter your name.');
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
      const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
      const payload = isRegisterMode
        ? { email, password, name }
        : { email, password };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, payload);

      const { token, message, user } = response.data;

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setIsLoggedIn(true);
        setSuccess(message || `${isRegisterMode ? 'Registration' : 'Login'} successful!`);

        // Clear form
        setEmail('');
        setPassword('');
        setName('');

        // Redirect after success
        setTimeout(() => {
          window.location.href = '/tournaments';
        }, 1500);
      } else {
        setError('Authentication failed. Please try again.');
      }

    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || `${isRegisterMode ? 'Registration' : 'Login'} failed. Try again.`);
    } finally {
      setLoading(false);
    }
  }, [email, password, name, isRegisterMode]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setSuccess('Logged out successfully!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }, []);

  const toggleMode = useCallback(() => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setName('');
  }, [isRegisterMode]);

  // Handle input focus effects - optimized
  const handleInputFocus = useCallback((fieldName) => {
    setActiveField(fieldName);
    setClickEffect(true);
    setTimeout(() => setClickEffect(false), 1000);
  }, []);

  const handleInputBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  // Simplified - no complex animations needed

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* No background animations - Only logo animates */}

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-black border border-gray-700 rounded-xl p-6 shadow-lg relative overflow-hidden"
        >
          {/* No background animations in form */}

          {/* Enhanced Gaming Controller Logo */}
          <div className="text-center mb-8 relative z-10">
            <motion.div
              className="relative inline-block"
              initial={{ opacity: 0, scale: 0.5, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 1.2,
                ease: "backOut",
                type: "spring",
                stiffness: 100
              }}
            >
              {/* Outer Glow Ring */}
              <motion.div
                className="absolute inset-0 w-20 h-20 rounded-full border-2 border-gray-600"
                style={{ willChange: 'transform' }}
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
              />

              {/* Middle Ring */}
              <motion.div
                className="absolute inset-1 w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-500 rounded-full"
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, -2, 2, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Main Controller Container */}
              <motion.div
                className="character-container relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white via-gray-200 to-gray-100 rounded-full shadow-2xl border-2 border-black/50 overflow-hidden"
                style={{ willChange: 'transform' }}
                animate={{
                  y: [0, -8, 0],
                  boxShadow: [
                    "0 0 30px rgba(255, 255, 255, 0.4)",
                    "0 0 50px rgba(0, 0, 0, 0.3)",
                    "0 0 30px rgba(255, 255, 255, 0.4)"
                  ]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                whileHover={{
                  scale: 1.2,
                  rotate: [0, 15, -15, 0],
                  y: -12,
                  transition: { duration: 0.8, type: "spring" }
                }}
                whileTap={{
                  scale: 0.9,
                  rotate: 25,
                  transition: { duration: 0.2 }
                }}
              >
                {/* Inner Glow Effect */}
                <motion.div
                  className="absolute inset-2 bg-gradient-to-br from-black/10 to-gray-600/20 rounded-full blur-sm"
                  animate={{
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Gaming Controller */}
                <motion.div
                  className="text-3xl relative z-10 filter drop-shadow-lg"
                  animate={{
                    rotate: [0, 8, -8, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  whileHover={{
                    scale: 1.3,
                    rotate: [0, 20, -20, 0],
                    transition: { duration: 0.6 }
                  }}
                >
                  🎮
                </motion.div>

                {/* Floating Particles */}
                <motion.div
                  className="absolute -top-2 -right-2 text-lg"
                  animate={{
                    rotate: [0, 360],
                    scale: [0.8, 1.4, 0.8],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  ⚡
                </motion.div>

                <motion.div
                  className="absolute -bottom-2 -left-2 text-lg"
                  animate={{
                    rotate: [360, 0],
                    scale: [1, 1.5, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                >
                  🏆
                </motion.div>

                <motion.div
                  className="absolute -top-2 -left-2 text-sm"
                  animate={{
                    y: [0, -10, 0],
                    x: [0, -5, 0],
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  ✨
                </motion.div>

                <motion.div
                  className="absolute -bottom-2 -right-2 text-sm"
                  animate={{
                    y: [0, 10, 0],
                    x: [0, 5, 0],
                    scale: [0.8, 1.3, 0.8],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.5
                  }}
                >
                  💫
                </motion.div>
              </motion.div>

              {/* Orbiting Elements */}
              <motion.div
                className="absolute inset-0 w-20 h-20"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              >
                <motion.div
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-sm"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  🎯
                </motion.div>
              </motion.div>

              <motion.div
                className="absolute inset-0 w-20 h-20"
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              >
                <motion.div
                  className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-sm"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  🚀
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          <motion.div className="relative z-10">
            {/* No stars in main form area */}

            {isLoggedIn ? (
              <div className="text-center relative z-20">
                <h2 className="text-xl font-bold mb-4 text-white">Welcome Back! 🎯</h2>
                <p className="text-gray-300 mb-6">You're already logged in</p>

                <button
                  onClick={handleLogout}
                  className="w-full bg-white hover:bg-gray-200 transition-colors py-2 rounded text-black font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="relative z-20">
                <h2 className="text-xl font-bold mb-2 text-center text-white">
                  {isRegisterMode ? 'Create Account' : 'Login'}
                </h2>

                <p className="text-gray-300 text-sm mb-6 text-center">
                  {isRegisterMode
                    ? 'Join the tournament platform'
                    : 'Access your account'
                  }
                </p>
                <form onSubmit={handleSubmit} className="space-y-4 relative">
                  {/* No stars inside form inputs */}

                  {/* Name field for registration */}
                  {isRegisterMode && (
                    <div>
                      <label htmlFor="name" className="block mb-1 text-sm font-medium text-white">
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => handleInputFocus('name')}
                        onBlur={handleInputBlur}
                        className="w-full px-4 py-3 text-base rounded bg-gray-800 border border-gray-600 focus:outline-none focus:border-white transition-colors text-white"
                        placeholder="Enter your name"
                        required={isRegisterMode}
                        autoComplete="name"
                      />
                    </div>
                  )}

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block mb-1 text-sm font-medium text-white">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => handleInputFocus('email')}
                      onBlur={handleInputBlur}
                      className="w-full px-4 py-3 text-base rounded bg-gray-800 border border-gray-600 focus:outline-none focus:border-white transition-colors text-white"
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label htmlFor="password" className="block mb-1 text-sm font-medium text-white">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => handleInputFocus('password')}
                        onBlur={handleInputBlur}
                        className="w-full px-4 py-3 pr-12 text-base rounded bg-gray-800 border border-gray-600 focus:outline-none focus:border-white transition-colors text-white"
                        placeholder="Enter password"
                        required
                        autoComplete={isRegisterMode ? "new-password" : "current-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white text-sm transition-colors"
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  {/* Error Message */}
                  {error && (
                    <div className="bg-gray-800 border border-gray-600 text-white text-center rounded py-2 px-3 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="bg-gray-700 border border-gray-500 text-white text-center rounded py-2 px-3 text-sm">
                      {success}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 text-base rounded font-semibold transition-colors ${
                      loading
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-200 active:bg-gray-100'
                    } text-black touch-manipulation`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        {isRegisterMode ? 'Creating...' : 'Logging in...'}
                      </span>
                    ) : (
                      isRegisterMode ? 'Create Account' : 'Login'
                    )}
                  </button>

                  {/* Mode Toggle */}
                  <div className="text-center pt-4 border-t border-gray-600">
                    <p className="text-gray-300 text-sm mb-2">
                      {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
                    </p>
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-white hover:text-gray-300 font-medium transition-colors text-sm underline"
                    >
                      {isRegisterMode ? 'Login here' : 'Create account'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
