// src/components/FeaturedTournaments.js
import React from 'react';
import { motion } from 'framer-motion';

const FeaturedTournaments = ({ tournaments }) => {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <h2 className="text-4xl font-extrabold text-center mb-10 tracking-tight">🔥 Featured Tournaments</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {tournaments.map((tournament, index) => (
          <motion.div
            key={tournament.id}
            className="bg-gradient-to-tr from-gray-800 to-gray-700 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <h4 className="text-xl font-semibold mb-2">{tournament.name}</h4>
            <p className="text-gray-300 mb-4">🏆 Prize Pool: ₹{tournament.prizePool}</p>
            <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition duration-200">
              Join Now
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedTournaments;
