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
        <p className="text-xs text-zinc-400 uppercase tracking-wider">{tournament.game}</p>
        <div className="mt-3 space-y-1 text-xs text-zinc-300">
          <p className="font-mono">{tournament.date}, {tournament.time}</p>
          <p><span className="text-zinc-500 font-bold uppercase text-[10px]">Entry:</span> {tournament.entryFee}</p>
          <p><span className="text-zinc-500 font-bold uppercase text-[10px]">Prize Pool:</span> <strong className="text-silver">{tournament.prizePool}</strong></p>
        </div>
        <button className="mt-4 bg-silver-gradient text-black px-4 py-2 rounded-xl w-full font-black text-xs uppercase tracking-wider hover:brightness-110 transition duration-200">
          Register
        </button>
      </div>
    </motion.div>
  );
};

export default TournamentCard;
