// src/components/Header.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link for navigation

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
    <header className="bg-gray-900 text-white p-4 shadow-md fixed w-full z-50">
      <div className="flex justify-between items-center max-w-screen-xl mx-auto">
        {/* Logo with animation */}
        <motion.h2
          className="text-2xl font-bold"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          GameArena
        </motion.h2>

        {/* Hamburger for mobile */}
        <button
          className="md:hidden flex flex-col justify-center items-center focus:outline-none"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <span
            className={`block w-6 h-0.5 bg-white mb-1 transition-all duration-300 ${
              mobileOpen ? 'rotate-45 translate-y-1.5' : ''
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white mb-1 transition-all duration-300 ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
              mobileOpen ? '-rotate-45 -translate-y-1.5' : ''
            }`}
          ></span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            {navLinks.map((label, index) => (
              <motion.li
                key={label}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={navVariants}
                whileHover={{ scale: 1.08 }}
              >
                <Link
                  to={
                    label.toLowerCase() === 'home'
                      ? '/'
                      : label.toLowerCase() === 'your matches'
                      ? '/yourmatches'
                      : `/${label.toLowerCase()}`
                  }
                  className="hover:text-green-500 relative group"
                >
                  {label}
                  <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-green-500 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav className="md:hidden bg-gray-900 w-full absolute left-0 top-full shadow-lg z-50">
          <ul className="flex flex-col items-center py-4 space-y-4">
            {navLinks.map((label, index) => (
              <li key={label}>
                <Link
                  to={
                    label.toLowerCase() === 'home'
                      ? '/'
                      : label.toLowerCase() === 'your matches'
                      ? '/yourmatches'
                      : `/${label.toLowerCase()}`
                  }
                  className="text-lg hover:text-green-500"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Header;
