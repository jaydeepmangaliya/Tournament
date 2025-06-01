import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
const games = [
    {
        id: 1,
        name: "Free Fire",
        description: "A fast-paced mobile battle royale game.",
        imageUrl: "https://wallpaperaccess.com/full/1089125.jpg",
    },
    {
        id: 2,
        name: "PUBG Mobile",
        description: "Popular battle royale game with team and solo modes.",
        imageUrl: "https://wallpaperaccess.com/full/407192.jpg",
    },
    {
        id: 3,
        name: "Call of Duty Mobile",
        description: "A military-themed first-person shooter with multiplayer modes.",
        imageUrl: "https://wallpaperaccess.com/full/391133.jpg",
    },
];
// Featured Tournaments Component
const FeaturedTournaments = () => {
    const tournaments = [
        {
            id: 1,
            name: 'Free Fire Champions',
            game: 'Free Fire',
            prize: '$250,000',
            participants: 1024,
            date: '2023-11-15',
            image: 'https://wallpaperaccess.com/full/1089125.jpg',
        },
        {
            id: 2,
            name: 'PUBG Mobile World Cup',
            game: 'PUBG Mobile',
            prize: '$500,000',
            participants: 512,
            date: '2023-12-10',
            image: 'https://wallpaperaccess.com/full/407192.jpg',
        },
        {
            id: 3,
            name: 'Call of Duty Mobile Championship',
            game: 'Call of Duty Mobile',
            prize: '$1,000,000',
            participants: 2048,
            date: '2024-01-20',
            image: 'https://wallpaperaccess.com/full/391133.jpg',
        },
    ];

    const [ref, inView] = useInView({
        threshold: 0.2,
        triggerOnce: false,
    });

    return (
        <section ref={ref} className="py-20 bg-gray-900 text-white">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            Featured Tournaments
                        </span>
                    </h2>
                    <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                        Join the most exciting competitive gaming events on the planet
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {tournaments.map((tournament, index) => (
                        <motion.div
                            key={tournament.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            whileHover={{ y: -10 }}
                            className="relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10 opacity-80" />
                            <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

                            {/* Tournament image placeholder */}
                            <div className="h-48 bg-gray-700 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/game-pattern.png')] opacity-20" />
                                <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-gray-500">

                                    <img src={tournament.image} alt="" srcset="" />
                                </div>
                            </div>

                            <div className="relative z-20 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold">{tournament.name}</h3>
                                        <p className="text-blue-300">{tournament.game}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-bold">
                                        {tournament.prize}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm text-gray-300 mb-6">
                                    <span>{tournament.participants} participants</span>
                                    <span>{new Date(tournament.date).toLocaleDateString()}</span>
                                </div>

                                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium hover:from-blue-500 hover:to-purple-500 transition-colors">
                                    Register Now
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
export default FeaturedTournaments;