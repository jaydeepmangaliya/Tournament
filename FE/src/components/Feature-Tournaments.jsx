// src/components/FeaturedTournaments.js
import React from 'react';
import { motion } from 'framer-motion';

const FeaturedTournaments = ({ tournaments }) => {
  return (
    <section className="py-16 bg-[#09090c] text-white border-t border-zinc-900">
      <h2 className="text-3xl font-black text-center mb-10 tracking-tight uppercase">Featured <span className="text-silver">Tournaments</span></h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {tournaments.map((tournament, index) => (
          <motion.div
            key={tournament.id}
            className="bg-[#121218] border border-zinc-800 rounded-2xl shadow-lg p-6 hover:border-zinc-700 transition"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <h4 className="text-lg font-bold mb-2 text-white">{tournament.name}</h4>
            <p className="text-zinc-400 mb-4 text-xs">Prize Pool: <strong className="text-silver">₹{tournament.prizePool}</strong></p>
            <button className="bg-silver-gradient text-black py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition duration-200 w-full">
              Join Tournament
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedTournaments;
