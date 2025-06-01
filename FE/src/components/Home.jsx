import React from 'react';
import { motion } from 'framer-motion';
import HeroSection from './Hero-section';
import GameCard from './GameCart';
import FeaturedTournaments from './FeaturedTournaments';
import Leaderboard from './Leaderboard';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] },
  },
};

const Home = () => {
  const handleGameClick = (gameName) => {
    alert(`You have selected the game: ${gameName}`);
  };

  return (
    <div >
      <HeroSection />

      {/* <motion.div
        className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 mx-auto p-6 pb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      > */}
        {/* <div className="max-w-screen-xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-8 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Choose Your <span className="text-green-400">Game</span>
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {games.map((game) => (
              <motion.div
                key={game.id}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }}
              >
                <GameCard
                  game={game}
                  onClick={() => handleGameClick(game.name)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div> */}
        <FeaturedTournaments />
      {/* </motion.div> */}
      <Leaderboard />
    </div>
  );
}

export default Home;