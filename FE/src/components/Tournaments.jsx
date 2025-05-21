import React, { useState } from 'react';

import axios from 'axios';

const tournaments = [
  // ✅ Upcoming
  {
    id: 9,
    game: 'Free Fire',
    name: 'Booyah Frenzy',
    status: 'upcoming',
    date: '2025-05-18',
    time: '8:30 PM',
    entryFee: '₹50',
    prizePool: '₹1100',
    isFull: true,
    image: 'https://wallpaperaccess.com/full/1089125.jpg',
  },

  // ✅ Ongoing
  {
    id: 6,
    game: 'BGMI',
    name: 'Clutch Kings',
    status: 'ongoing',
    date: '2025-05-10',
    time: '5:00 PM',
    entryFee: '₹50',
    prizePool: '₹15,000',
    isFull: false,
    image: 'https://wallpaperaccess.com/full/1089125.jpg',
  },

  // ✅ Completed
  {
    id: 7,
    game: 'Free Fire',
    name: 'Headshot Arena',
    status: 'completed',
    date: '2025-05-05',
    time: '6:30 PM',
    entryFee: '₹50',
    prizePool: '₹7,000',
    isFull: true,
    image: 'https://wallpaperaccess.com/full/1089125.jpg',
  },
];

export default function TournamentsPage() {
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const playerDetails = {
      id: `${selectedTournament.tournamentId}-player-${Date.now()}`,
      name: formData.get("name"),
      phone: formData.get("phone"),
      ffId: formData.get("ffId"),
    };

    // Send data as { key: value } to backend
    try {
      const response = await axios.post('http://localhost:2000/api/slotes', playerDetails);
        console.log(response);
        
           
    } catch (err) {
      console.error('Failed to send player data:', err);
    }

    setShowRegistration(false);
    setSelectedTournament(null);
  };

  const allTournaments = tournaments.map((t) => {
    return {
      ...t,
      registeredSlots: [],
    };
  });

  return (
    <div className="bg-gray-950 min-h-screen text-white px-6 pt-28 pb-16">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">Tournaments</h1>
        <Section
          title="Upcoming Tournaments"
          data={allTournaments.filter((t) => t.status === 'upcoming')}
          onRegister={(tournamentId) => {
            const tournament = tournaments.find((t) => t.id === tournamentId);
            if (tournament.game === "Free Fire") {
              setSelectedTournament({
                tournamentId: tournament.id,
                gameName: tournament.game,
                entryFee: tournament.entryFee,
              });
              setShowRegistration(true);
            }
          }}
        />
        <Section
          title="Ongoing Tournaments"
          data={allTournaments.filter((t) => t.status === 'ongoing')}
          onRegister={(tournamentId) => {
            const tournament = tournaments.find((t) => t.id === tournamentId);
            if (tournament.game === "Free Fire") {
              setSelectedTournament({
                tournamentId: tournament.id,
                gameName: tournament.game,
                entryFee: tournament.entryFee,
              });
              setShowRegistration(true);
            }
          }}
        />
        <Section
          title="Completed Tournaments"
          data={allTournaments.filter((t) => t.status === 'completed')}
        />
      </div>

      {/* Registration Modal */}
      {showRegistration && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Register for {selectedTournament.gameName}</h2>
            <p className="mb-4">Tournament ID: {selectedTournament.tournamentId}</p>
            <form onSubmit={handleRegisterSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">Player Name</label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-black"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-black"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">Free Fire ID</label>
                <input
                  type="text"
                  name="ffId"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-black"
                  placeholder="Enter your Free Fire ID"
                  required
                />
              </div>
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full mt-4"
              >
                Pay Now
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 mt-4"
              >
                Submit
              </button>
              <button
                type="button"
                className="ml-4 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 mt-4"
                onClick={() => {
                  setShowRegistration(false);
                  setSelectedTournament(null);
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, data, onRegister }) => (
  <div className="mb-12">
    <h2 className="text-3xl font-bold mb-6 text-white border-b border-gray-700 pb-2">{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {data.map((t) => (
        <div
          key={t.id}
          className="relative bg-gray-900 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition"
        >
          <img src={t.image} alt={t.name} className="h-44 w-full object-cover" />
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-blue-300">{t.game}</span>
              <span
                className={`px-2 py-1 text-xs font-bold rounded-full ${t.entryFee === 'Free' ? 'bg-green-600' : 'bg-red-600'}`}
              >
                {t.entryFee}
              </span>
            </div>
            <h3 className="text-xl font-semibold">{t.name}</h3>
            <p className="text-gray-400 text-sm">📅 {t.date} — ⏰ {t.time}</p>
            <p className="text-yellow-400 mt-2">🏆 {t.prizePool}</p>
            <button
              onClick={() => onRegister && onRegister(t.id)}
              className="mt-4 w-full py-2 rounded-md bg-green-600 hover:bg-green-700 text-white transition"
            >
              Register
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
