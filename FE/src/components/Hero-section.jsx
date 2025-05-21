// src/components/HeroSection.js
import React from 'react';
import { motion } from 'framer-motion'; 


const HeroSection = () => {
  return (
    <section
      className="bg-cover bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 h-screen text-white py-32 relative"
      style={{
        // backgroundImage:
        //   'url("https://sdmntprnorthcentralus.oaiusercontent.com/files/00000000-d1ec-622f-bd16-24d716a01438/raw?se=2025-05-11T06%3A55%3A36Z&sp=r&sv=2024-08-04&sr=b&scid=00000000-0000-0000-0000-000000000000&skoid=5cab1ff4-c20d-41dc-babb-df0c2cc21dd4&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-05-11T05%3A44%3A00Z&ske=2025-05-12T05%3A44%3A00Z&sks=b&skv=2024-08-04&sig=c/pukrqNzzwkTAY/cHH/qMHwEVK%2B7kEh0AhRKTe3HPk%3D")',
      }}
    >
      <div className="text-center">
        <motion.h1
          className="text-5xl font-bold mt-40 mb-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Join Tournaments & Win Big!
        </motion.h1>

        <motion.p
          className="text-xl mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          Participate in exciting gaming tournaments and win amazing prizes!
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="bg-green-500 text-white px-6 py-3 rounded-lg text-xl hover:bg-green-400 transform transition-all duration-300"
        >
          Browse Tournaments
        </motion.button>
      </div>
    </section>
  );
};

export default HeroSection;
