import React from 'react'
import GameArena from './components/GameArena'
import GameArenaLanding from './components/GameArenaLanding'
function Home({ games }) {
  return (
    <div>
      <GameArenaLanding />
      {/* <HeroSection />
      <div className=" w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900  mx-auto mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6 ">Choose Your Game</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => handleGameClick(game.name)}
            />
          ))}
        </div>
      </div> */}
    </div>
  )
}

export default Home
