import { motion } from 'framer-motion';

const TournamentCard = ({ tournament }) => {
  return (
    <motion.div
      className="bg-white/10 border border-white/10 rounded-2xl shadow-lg overflow-hidden backdrop-blur-md hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <img
        src={tournament.image}
        alt={tournament.name}
        className="h-40 w-full object-cover"
      />

      <div className="p-4 text-white">
        <h3 className="text-xl font-bold mb-1">{tournament.name}</h3>
        <p className="text-sm text-gray-300">{tournament.game}</p>
        <p className="text-sm mt-2">🕓 {tournament.date}, {tournament.time}</p>
        <p className="text-sm">🎯 Entry: {tournament.entryFee}</p>
        <p className="text-sm">🏆 Prize Pool: {tournament.prizePool}</p>
        <button className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md w-full font-semibold transition duration-200">
          Register
        </button>
      </div>
    </motion.div>
  );
};

export default TournamentCard;
