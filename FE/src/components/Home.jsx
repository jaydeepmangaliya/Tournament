import React from 'react';
import HeroSection from './Hero-section';
import GameCard from './GameCart';

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

const Home = () => {
  const handleGameClick = (gameName) => {
    alert(`You have selected the game: ${gameName}`);
  };

  return (
    <div>
      <HeroSection />
      <div className="w-[100%] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6 text-white">Choose Your Game</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => handleGameClick(game.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
