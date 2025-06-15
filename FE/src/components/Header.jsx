import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const navVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
    },
  }),
};

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = ['Home', 'Tournaments', 'Your Matches', 'Login'];

  return (
    <header
      className="fixed w-full z-50 text-white shadow-md px-2 py-1 sm:px-4 sm:py-2 lg:py-1.5"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <div className="flex justify-between items-center max-w-screen-xl mx-auto px-0 sm:px-6 lg:px-8 min-h-[2rem] sm:min-h-[2.7rem] lg:min-h-[2.2rem]">
        {/* Logo with animation */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center"
        >
          <motion.h2
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: '700',
              letterSpacing: '-0.02em'
            }}
            whileHover={{ scale: 1.05 }}
          >
            GameArena
          </motion.h2>
        </motion.div>

        {/* Hamburger for mobile */}
        <button
          className="md:hidden flex flex-col justify-center items-center focus:outline-none p-2"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <span
            className={`block w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''
              }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''
              }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
          ></span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-4 lg:space-x-6">
            {navLinks.map((label, index) => (
              <motion.li
                key={label}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={navVariants}
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  to={
                    label.toLowerCase() === 'home'
                      ? '/'
                      : label.toLowerCase() === 'your matches'
                        ? '/yourmatches'
                        : `/${label.toLowerCase()}`
                  }
                  className="hover:text-blue-400 relative group px-3 py-2 text-sm sm:text-base font-medium transition-all duration-300"
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: '500',
                    letterSpacing: '0.01em'
                  }}
                >
                  {label}
                  <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <motion.nav
          className="md:hidden bg-black/95 w-full absolute left-0 top-full shadow-lg z-50 border-t border-white/10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <ul className="flex flex-col items-center py-4 space-y-2">
            {navLinks.map((label, index) => (
              <motion.li
                key={label}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={navVariants}
                className="w-full text-center"
              >
                <Link
                  to={
                    label.toLowerCase() === 'home'
                      ? '/'
                      : label.toLowerCase() === 'your matches'
                        ? '/yourmatches'
                        : `/${label.toLowerCase()}`
                  }
                  className="text-base font-medium px-4 py-3 block w-full rounded-lg bg-white/5 text-white hover:bg-blue-500 hover:text-white transition-all duration-300"
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: '500',
                    letterSpacing: '0.01em'
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              </motion.li>
            ))}
          </ul>
        </motion.nav>
      )}
    </header>
  );
};

export default Header;