import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Head from 'next/head';
import * as THREE from 'three';
import BIRDS from 'vanta/dist/vanta.birds.min';

const ParticleBackground = () => {
    const vantaRef = useRef(null);
    const vantaEffect = useRef(null);

    useEffect(() => {
        if (!vantaEffect.current) {
            vantaEffect.current = BIRDS({
                el: vantaRef.current,
                THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                backgroundColor: 0x000000,
                color1: 0xffffff,
                color2: 0xaaaaaa,
                wingSpan: 40.00,
                separation: 42.00,
                alignment: 100.00,
                cohesion: 63.00
            });
        }

        return () => {
            if (vantaEffect.current) {
                vantaEffect.current.destroy();
            }
        };
    }, []);

    return (
        <div
            ref={vantaRef}
            className="absolute inset-0"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

const HeroSection = () => {
    const [currentGame, setCurrentGame] = useState(0);
    const games = [
        { name: 'Valorant Masters', prize: '$250,000' },
        { name: 'League of Legends Championship', prize: '$500,000' },
        { name: 'CS:GO Global Finals', prize: '$1,000,000' },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentGame((prev) => (prev + 1) % games.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const [ref, inView] = useInView({
        threshold: 0.5,
        triggerOnce: false,
    });

    return (
        <section
            ref={ref}
            className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black text-white"
        >
            <ParticleBackground />
            
            {/* Apple-inspired glass morphism container */}
            <div className="relative z-10 container mx-auto px-6 py-20">
                <div className="max-w-6xl mx-auto  rounded-2xl border border-white/10 p-12 ">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="mb-12 text-center"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                            <span className="text-white">Join Tournaments &</span>
                            <span className="block mt-4 text-white">Win Big!</span>
                        </h1>
                        <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-300">
                            The ultimate platform for competitive gaming tournaments
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="flex justify-center"
                    >
                        <button className="px-10 py-5 bg-white text-black rounded-xl text-lg font-bold hover:bg-gray-200 transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                            Join Now - It's Free
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="mt-16 max-w-4xl mx-auto bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10"
                    >
                        <div className="text-left mb-6">
                            <span className="text-white font-medium text-lg">Featured Tournament</span>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentGame}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.5 }}
                                className="flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{games[currentGame].name}</h3>
                                    <p className="text-gray-300 mt-2">Prize Pool: {games[currentGame].prize}</p>
                                </div>
                                <button className="px-8 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium">
                                    Register
                                </button>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

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
        <section ref={ref} className="py-20 bg-black text-white">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4 text-white">
                        Featured Tournaments
                    </h2>
                    <p className="text-xl text-black-300 max-w-2xl mx-auto">
                        Join the most exciting competitive gaming events
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
                            className="relative overflow-hidden rounded-xl bg-black-900 border border-gray-800 group"
                        >
                            <div className="h-48 bg-gray-800 relative overflow-hidden">
                                <img 
                                    src={tournament.image} 
                                    alt={tournament.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70" />
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
                                        <p className="text-gray-400">{tournament.game}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-white text-black rounded-full text-sm font-bold">
                                        {tournament.prize}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm text-gray-400 mb-6">
                                    <span>{tournament.participants} participants</span>
                                    <span>{new Date(tournament.date).toLocaleDateString()}</span>
                                </div>

                                <button className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors">
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

const Leaderboard = () => {
    const players = [
        { rank: 1, name: 'NinjaX', game: 'Valorant', points: 12500 },
        { rank: 2, name: 'ShadowStrike', game: 'CS:GO', points: 11800 },
        { rank: 3, name: 'FrostQueen', game: 'League of Legends', points: 11200 },
        { rank: 4, name: 'DragonSlayer', game: 'Valorant', points: 10500 },
        { rank: 5, name: 'PixelHunter', game: 'Fortnite', points: 9800 },
    ];

    const [ref, inView] = useInView({
        threshold: 0.2,
        triggerOnce: false,
    });

    return (
        <section ref={ref} className="py-20 bg-black/50 backdrop-blur-sm rounded-2xl border border-gray-900 text-white">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4 text-white">
                        Top Players
                    </h2>
                    <p className="text-xl text-black-300 max-w-2xl mx-auto">
                        See who's dominating the competitive scene
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="bg-black/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800 max-w-4xl mx-auto"
                >
                    <div className="grid grid-cols-12 gap-4 p-6 bg-black font-bold text-white border-b border-gray-800">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-5">Player</div>
                        <div className="col-span-3">Game</div>
                        <div className="col-span-3 text-right">Points</div>
                    </div>

                    <div className="divide-y divide-gray-800">
                        {players.map((player, index) => (
                            <motion.div
                                key={player.rank}
                                initial={{ opacity: 0, x: -20 }}
                                animate={inView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.1 * index, duration: 0.5 }}
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                className="grid grid-cols-12 gap-4 p-6 items-center transition-colors duration-200"
                            >
                                <div className="col-span-1 font-bold">
                                    {player.rank === 1 ? (
                                        <span className="text-white">#{player.rank}</span>
                                    ) : (
                                        <span className="text-gray-400">#{player.rank}</span>
                                    )}
                                </div>
                                <div className="col-span-5 flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-gray-800 mr-4 overflow-hidden flex items-center justify-center text-white">
                                        {player.name.charAt(0)}
                                    </div>
                                    <span className="text-white">{player.name}</span>
                                </div>
                                <div className="col-span-3 text-gray-400">{player.game}</div>
                                <div className="col-span-3 text-right font-mono text-white">{player.points.toLocaleString()}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const RegisterCTA = () => {
    const [ref, inView] = useInView({
        threshold: 0.5,
        triggerOnce: false,
    });

    return (
        <section ref={ref} className="py-32 relative overflow-hidden bg-black">
            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.6 }}
                    className="bg-black-900 rounded-2xl border border-gray-800 overflow-hidden p-16 text-center"
                >
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-4xl font-bold mb-6 text-white"
                    >
                        Ready to Compete?
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-xl text-gray-300 max-w-2xl mx-auto mb-10"
                    >
                        Join thousands of gamers competing in our tournaments.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="inline-block"
                    >
                        <button className="px-12 py-5 bg-white text-black rounded-xl text-xl font-bold hover:bg-gray-200 transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                            Sign Up Free
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

const Testimonials = () => {
    const testimonials = [
        {
            id: 1,
            name: 'Sarah "Valkyrie" Chen',
            role: 'Professional Valorant Player',
            content: 'The tournaments are well-organized, the competition is fierce, and the prize pools keep getting bigger!',
        },
        {
            id: 2,
            name: 'Marcus "Frost" Johnson',
            role: 'CS:GO Team Captain',
            content: 'This is where real competitors come to play. Flawless matchmaking and anti-cheat systems.',
        },
        {
            id: 3,
            name: 'Lena "PixelQueen" Rodriguez',
            role: 'Streamer & Content Creator',
            content: 'My viewers love watching me compete here, and I\'ve grown my audience significantly since joining.',
        },
    ];

    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [direction, setDirection] = useState(1);
    const [ref, inView] = useInView({
        threshold: 0.2,
        triggerOnce: false,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setDirection(1);
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const handlePrev = () => {
        setDirection(-1);
        setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const handleNext = () => {
        setDirection(1);
        setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    };

    return (
        <section ref={ref} className="py-20 bg-black text-white">
            <div className="container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl font-bold mb-4 text-white">
                        Community Voices
                    </h2>
                    <p className="text-xl text-black-300 max-w-2xl mx-auto">
                        Hear what top players say about our platform
                    </p>
                </motion.div>

                <div className="max-w-4xl mx-auto relative">
                    <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 flex justify-between z-10">
                        <button
                            onClick={handlePrev}
                            className="w-12 h-12 rounded-full bg-black-800 flex items-center justify-center hover:bg-white-700 transition-colors shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={handleNext}
                            className="w-12 h-12 rounded-full bg-black-800 flex items-center justify-center hover:bg-black-700 transition-colors shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="overflow-hidden relative h-96">
                        <AnimatePresence custom={direction} initial={false}>
                            <motion.div
                                key={activeTestimonial}
                                custom={direction}
                                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                                transition={{ duration: 0.6 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black-900 rounded-xl border border-black-800"
                            >
                                <div className="w-24 h-24 rounded-full bg-black-800 mb-6 overflow-hidden flex items-center justify-center text-white text-3xl font-bold">
                                    {testimonials[activeTestimonial].name.charAt(0)}
                                </div>
                                <p className="text-xl italic text-center mb-8 max-w-2xl text-gray-300">
                                    "{testimonials[activeTestimonial].content}"
                                </p>
                                <div className="text-center">
                                    <h4 className="text-2xl font-bold text-white">{testimonials[activeTestimonial].name}</h4>
                                    <p className="text-gray-400">{testimonials[activeTestimonial].role}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-center mt-8">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setDirection(index > activeTestimonial ? 1 : -1);
                                    setActiveTestimonial(index);
                                }}
                                className={`w-3 h-3 rounded-full mx-2 transition-colors ${index === activeTestimonial ? 'bg-white' : 'bg-gray-600'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const Footer = () => {
    const socialLinks = [
        { name: 'Twitter', icon: 'T' },
        { name: 'Discord', icon: 'D' },
        { name: 'Twitch', icon: 'T' },
        { name: 'YouTube', icon: 'Y' },
        { name: 'Instagram', icon: 'I' },
    ];

    const [ref, inView] = useInView({
        threshold: 0.2,
        triggerOnce: false,
    });

    return (
        <footer ref={ref} className="bg-black text-white pt-20 pb-10 border-t border-gray-800">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                    >
                        <h3 className="text-2xl font-bold mb-6 text-white">
                            GameArena
                        </h3>
                        <p className="text-gray-400">
                            The ultimate platform for competitive gaming tournaments.
                        </p>
                    </motion.div>

                    {[
                        {
                            title: 'Tournaments',
                            links: ['Upcoming Events', 'Ongoing', 'Past Winners', 'How to Join'],
                        },
                        {
                            title: 'Community',
                            links: ['Leaderboards', 'Teams', 'Forums', 'Streamers'],
                        },
                        {
                            title: 'Company',
                            links: ['About Us', 'Careers', 'Press', 'Contact'],
                        },
                    ].map((section, index) => (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 0.1 * (index + 1), duration: 0.6 }}
                        >
                            <h4 className="text-lg font-bold mb-6 text-white">{section.title}</h4>
                            <ul className="space-y-3">
                                {section.links.map((link) => (
                                    <li key={link}>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="pt-10 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center"
                >
                    <div className="text-gray-500 text-sm mb-6 md:mb-0">
                        © {new Date().getFullYear()} GameArena. All rights reserved.
                    </div>

                    <div className="flex space-x-6">
                        {socialLinks.map((social, index) => (
                            <motion.a
                                key={social.name}
                                href="#"
                                initial={{ opacity: 0, y: 20 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.1 * index + 0.5, duration: 0.5 }}
                                whileHover={{ y: -5 }}
                                className="text-gray-400 hover:text-white transition-all"
                                aria-label={social.name}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                    <span className="text-lg">{social.icon}</span>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};

const GameArenaLanding = () => {
    return (
        <>
            <Head>
                <title>GameArena - Competitive Gaming Tournaments</title>
                <meta name="description" content="Join the ultimate platform for competitive gaming tournaments." />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="bg-black text-white">
                <HeroSection />
                <FeaturedTournaments />
                <Leaderboard />
                <RegisterCTA />
                <Testimonials />
                <Footer />
            </div>
        </>
    );
};

export default GameArenaLanding;