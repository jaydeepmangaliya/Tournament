import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
motion
// Leaderboard Component
const Leaderboard = () => {
    const players = [
        { rank: 1, name: 'NinjaX', game: 'Valorant', points: 12500, avatar: '/avatar1.jpg' },
        { rank: 2, name: 'ShadowStrike', game: 'CS:GO', points: 11800, avatar: '/avatar2.jpg' },
        { rank: 3, name: 'FrostQueen', game: 'League of Legends', points: 11200, avatar: '/avatar3.jpg' },
        { rank: 4, name: 'DragonSlayer', game: 'Valorant', points: 10500, avatar: '/avatar4.jpg' },
        { rank: 5, name: 'PixelHunter', game: 'Fortnite', points: 9800, avatar: '/avatar5.jpg' },
    ];

    const [ref, inView] = useInView({
        threshold: 0.2,
        triggerOnce: false,
    });

    return (
        <section ref={ref} className="py-20 bg-gradient-to-b from-gray-900 to-purple-900 text-white">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            Top Players
                        </span>
                    </h2>
                    <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                        See who's dominating the competitive scene this season
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700 max-w-4xl mx-auto"
                >
                    <div className="grid grid-cols-12 gap-4 p-6 bg-gray-800 font-bold text-blue-300">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-5">Player</div>
                        <div className="col-span-3">Game</div>
                        <div className="col-span-3 text-right">Points</div>
                    </div>

                    <div className="divide-y divide-gray-700">
                        {players.map((player, index) => (
                            <motion.div
                                key={player.rank}
                                initial={{ opacity: 0, x: -20 }}
                                animate={inView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.1 * index, duration: 0.5 }}
                                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                className="grid grid-cols-12 gap-4 p-6 items-center transition-colors duration-200"
                            >
                                <div className="col-span-1 font-bold">
                                    {player.rank === 1 ? (
                                        <span className="text-yellow-400">#{player.rank}</span>
                                    ) : player.rank === 2 ? (
                                        <span className="text-gray-300">#{player.rank}</span>
                                    ) : player.rank === 3 ? (
                                        <span className="text-amber-600">#{player.rank}</span>
                                    ) : (
                                        <span className="text-gray-400">#{player.rank}</span>
                                    )}
                                </div>
                                <div className="col-span-5 flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 mr-4 overflow-hidden">
                                        {/* Avatar placeholder */}
                                        <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                                            {player.name.charAt(0)}
                                        </div>
                                    </div>
                                    <span>{player.name}</span>
                                </div>
                                <div className="col-span-3 text-blue-300">{player.game}</div>
                                <div className="col-span-3 text-right font-mono">{player.points.toLocaleString()}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Leaderboard;