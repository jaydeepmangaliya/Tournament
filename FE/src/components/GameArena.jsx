import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';
import { motion, useAnimation } from 'framer-motion';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const GameArena = () => {
  const particlesInit = async (main) => {
    await loadFull(main);
  };

  const heroRef = useRef(null);
  const tournamentCardsRef = useRef(null);
  const leaderboardRef = useRef(null);
  const controls = useAnimation();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Featured tournaments data
  const tournaments = [
    {
      id: 1,
      title: "Cyber Legends Championship",
      game: "Cyberpunk 2077",
      prize: "$50,000",
      date: "June 15, 2023",
      participants: 1245,
      live: true
    },
    {
      id: 2,
      title: "Neon Royale",
      game: "Fortnite",
      prize: "$30,000",
      date: "June 22, 2023",
      participants: 892,
      live: false
    },
    {
      id: 3,
      title: "Quantum Clash",
      game: "Valorant",
      prize: "$75,000",
      date: "July 5, 2023",
      participants: 2103,
      live: true
    },
    {
      id: 4,
      title: "Future Fighters",
      game: "Street Fighter 6",
      prize: "$25,000",
      date: "July 12, 2023",
      participants: 567,
      live: false
    }
  ];

  // Leaderboard data
  const leaderboard = [
    { rank: 1, name: "CyberNinja", points: 9850, avatar: "/avatars/1.png" },
    { rank: 2, name: "NeonGhost", points: 8720, avatar: "/avatars/2.png" },
    { rank: 3, name: "QuantumX", points: 7650, avatar: "/avatars/3.png" },
    { rank: 4, name: "PixelKing", points: 7430, avatar: "/avatars/4.png" },
    { rank: 5, name: "VRMaster", points: 7210, avatar: "/avatars/5.png" }
  ];

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "CyberNinja",
      role: "Pro Gamer",
      quote: "GameArena took my gaming career to the next level. The tournaments are professionally run with zero lag!",
      avatar: "/avatars/1.png"
    },
    {
      id: 2,
      name: "NeonQueen",
      role: "Streamer",
      quote: "The production quality is insane! My viewers love watching me compete on GameArena.",
      avatar: "/avatars/6.png"
    },
    {
      id: 3,
      name: "QuantumPro",
      role: "Esports Coach",
      quote: "I've scouted more talent on GameArena than anywhere else. The competition is fierce!",
      avatar: "/avatars/7.png"
    }
  ];

  useEffect(() => {
    // Hero animation
    gsap.from(heroRef.current, {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: "power3.out"
    });

    // Tournament cards animation
    gsap.from(".tournament-card", {
      opacity: 0,
      y: 100,
      stagger: 0.1,
      duration: 0.8,
      scrollTrigger: {
        trigger: tournamentCardsRef.current,
        start: "top 80%"
      }
    });

    // Leaderboard animation
    gsap.from(".leaderboard-item", {
      opacity: 0,
      x: -50,
      stagger: 0.1,
      duration: 0.6,
      scrollTrigger: {
        trigger: leaderboardRef.current,
        start: "top 80%"
      }
    });

    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRegisterHover = () => {
    controls.start({
      scale: 1.05,
      boxShadow: "0 0 20px rgba(100, 108, 255, 0.7)",
      transition: { duration: 0.3 }
    });
  };

  const handleRegisterLeave = () => {
    controls.start({
      scale: 1,
      boxShadow: "0 0 10px rgba(100, 108, 255, 0.5)",
      transition: { duration: 0.3 }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            particles: {
              number: { value: 80 },
              color: { value: ["#646CFF", "#9F7AEA", "#E879F9"] },
              shape: { type: "circle" },
              opacity: { value: 0.5, random: true },
              size: { value: 3, random: true },
              move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out"
              },
              line_linked: {
                enable: true,
                distance: 150,
                color: "#9F7AEA",
                opacity: 0.4,
                width: 1
              }
            },
            interactivity: {
              detect_on: "canvas",
              events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" }
              }
            }
          }}
        />
        
        <div className="relative z-10 text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
          >
            WELCOME TO <span className="text-white">GAMEARENA</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto"
          >
            The ultimate platform for competitive gaming tournaments. Join thousands of players in epic battles for glory and prizes.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(100, 108, 255, 0.7)" }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-lg font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
          >
            JOIN THE ARENA
          </motion.button>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section ref={tournamentCardsRef} className="py-20 px-4 max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
        >
          FEATURED TOURNAMENTS
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tournaments.map((tournament) => (
            <motion.div
              key={tournament.id}
              className="tournament-card bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 transition-all duration-300 relative"
              whileHover={{ y: -10 }}
            >
              {tournament.live && (
                <div className="absolute top-4 right-4 bg-red-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  LIVE
                </div>
              )}
              <div className="h-40 bg-gradient-to-r from-blue-900/50 to-purple-900/50 flex items-center justify-center">
                <span className="text-2xl font-bold">{tournament.game}</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{tournament.title}</h3>
                <div className="flex justify-between text-sm text-gray-300 mb-4">
                  <span>Prize: <span className="text-yellow-400">{tournament.prize}</span></span>
                  <span>{tournament.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{tournament.participants} participants</span>
                  <button className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
                    Register
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section ref={leaderboardRef} className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
          >
            TOP PLAYERS
          </motion.h2>
          
          <div className="space-y-4">
            {leaderboard.map((player) => (
              <motion.div
                key={player.rank}
                className="leaderboard-item bg-gray-700/50 hover:bg-gray-700/80 backdrop-blur-sm p-4 rounded-lg flex items-center border border-gray-600 hover:border-purple-500 transition-all"
                whileHover={{ x: 10 }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold mr-4">
                  {player.rank}
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-600 mr-4 overflow-hidden">
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{player.name}</h3>
                </div>
                <div className="text-yellow-400 font-bold">{player.points} pts</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
        >
          COMMUNITY HIGHLIGHTS
        </motion.h2>
        
        <div className="relative h-64">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              className="absolute inset-0 bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 flex flex-col items-center text-center border border-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: index === activeTestimonial ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-1 mb-6">
                <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-lg mb-4 italic">"{testimonial.quote}"</p>
              <div>
                <h4 className="font-bold text-xl">{testimonial.name}</h4>
                <p className="text-gray-400">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="flex justify-center mt-8 space-x-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveTestimonial(index)}
              className={`w-3 h-3 rounded-full ${index === activeTestimonial ? 'bg-purple-500' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      </section>

      {/* Registration CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl font-bold mb-6"
          >
            READY TO COMPETE?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl mb-8 max-w-2xl mx-auto"
          >
            Join thousands of gamers in the most exciting tournaments. Register now and start your journey to the top!
          </motion.p>
          <motion.button
            animate={controls}
            onHoverStart={handleRegisterHover}
            onHoverEnd={handleRegisterLeave}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
          >
            REGISTER NOW - IT'S FREE!
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900/80 border-t border-gray-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">GameArena</h3>
              <p className="text-gray-400">The ultimate platform for competitive gaming tournaments.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition">Home</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Tournaments</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Leaderboard</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">About</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <div className="flex space-x-4">
                {['twitter', 'discord', 'twitch', 'youtube'].map((social) => (
                  <motion.a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition"
                    whileHover={{ y: -5, backgroundColor: '#4F46E5' }}
                  >
                    <span className="sr-only">{social}</span>
                    <i className={`fab fa-${social} text-lg`}></i>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-gray-500">
            <p>© {new Date().getFullYear()} GameArena. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GameArena;