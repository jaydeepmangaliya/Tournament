// src/components/Header.js
import React from 'react';
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

        {/* Navigation */}
        <nav>
          <ul className="flex space-x-6">
            {['Home', 'Tournaments', 'Profile', 'Login'].map((label, index) => (
              <motion.li
                key={label}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={navVariants}
                whileHover={{ scale: 1.08 }}
              >
                <Link
                  to={label.toLowerCase() === 'home' ? '/' : `/${label.toLowerCase()}`}
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
    </header>
  );
};

export default Header;
