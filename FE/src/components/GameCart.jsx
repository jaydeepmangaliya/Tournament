// src/components/GameCard.js
import { motion } from 'framer-motion';

const GameCard = ({ game }) => {
  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden backdrop-blur-md bg-white/10 border border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <img
        src={game.imageUrl}
        alt={game.name}
        className="h-48 w-full object-cover"
      />

      <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-md opacity-0 hover:opacity-100 transition duration-300 flex items-center justify-center text-white text-center px-4">
        <div>
          <h3 className="text-2xl font-bold">{game.name}</h3>
          <p className="mt-2 text-sm">{game.description}</p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-semibold text-white">{game.name}</h3>
      </div>
    </motion.div>
  );
};

export default GameCard;
