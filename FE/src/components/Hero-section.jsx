// src/components/HeroSection.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Gradient colors for the design system
  const primaryGradient = 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #9333ea 100%)';
  const secondaryGradient = 'linear-gradient(135deg, #9333ea 0%, #c026d3 50%, #db2777 100%)';
  const darkOverlay = 'linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const headingVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
  };

  const paragraphVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99],
        delay: 0.3
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99],
        delay: 0.6
      },
    },
  };

  return (
    <section className="relative h-screen w-full overflow-hidden bg-gray-900">
      Particle Background
      <div className="absolute inset-0 z-0 opacity-30">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-500"
            style={{
              width: Math.random() * 10 + 5 + 'px',
              height: Math.random() * 10 + 5 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
            }}
            animate={{
              y: [0, Math.random() * 100 - 50],
              x: [0, Math.random() * 100 - 50],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {!videoError ? (
          <video
            className="w-full h-full object-cover"
            src={"fallback-video.mp4"}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoError(true)}
          />
        ) : (
          <img
            src={"imgSrc"}
            alt="fallback"
            className="w-full h-full object-cover"
          />
        )}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
      </div>
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 z-0" />

      {/* Gradient Overlay */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ background: darkOverlay }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center text-center h-full px-4">
        <motion.div
          className="max-w-4xl"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
            variants={headingVariants}
          >

            <span className="bg-clip-text text-transparent" style={{
              backgroundImage: primaryGradient,
              textShadow: '0 4px 20px rgba(59, 130, 246, 0.5)'
            }}>
              Join Tournaments &
            </span>
            <span className="text-green-400"> Win Big!</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-blue-100"
            variants={paragraphVariants}
          >
            The ultimate platform for competitive gaming tournaments
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-4"
            variants={buttonVariants}
          >
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 5px 25px rgba(59, 130, 246, 0.5)",
                backgroundImage: secondaryGradient
              }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-xl text-lg font-bold text-white"
              style={{ backgroundImage: primaryGradient }}
              aria-label="Browse Tournaments"
            >
              Join Now - It's Free
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 5px 15px rgba(255, 255, 255, 0.2)",
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-xl text-lg font-medium text-white border-2 border-blue-400 hover:border-blue-300 transition-all"
              aria-label="Learn More"
            >
              Explore Tournaments
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Featured Tournament Card */}
        <motion.div
          className="mt-16 max-w-2xl w-full bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="text-left mb-4">
            <span className="text-blue-400 font-medium">Featured Tournament</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold">Valorant Champions Tour</h3>
              <p className="text-blue-300">Prize Pool: $250,000</p>
            </div>
            <button className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors">
              Register
            </button>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 1.5 }
          }}
          whileHover={{ scale: 1.2 }}
        >
          <div className="animate-bounce w-8 h-14 border-2 border-blue-400 rounded-full flex justify-center items-start">
            <motion.div
              className="w-2 h-2 bg-blue-400 rounded-full mt-2"
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;