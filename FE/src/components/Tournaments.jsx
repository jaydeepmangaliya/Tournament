import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function TournamentsPage() {
  const [games, setGames] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    phoneNumber: '',
    ffId: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await axios.get(`http://localhost:2000/api/games`);
        const grouped = response.data.reduce((acc, item) => {
          if (!acc[item.gameName]) acc[item.gameName] = [];
          acc[item.gameName].push(item);
          return acc;
        }, {});
        setGames(grouped);
      } catch (error) {
        console.error('Error fetching games:', error);
      }
    };

    fetchGames();
  }, []);

  const openModal = (game) => {
    setSelectedGame(game);
    setFormData({ userName: '', phoneNumber: '', ffId: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedGame(null);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to login first!');
      navigate('/login');
      return;
    }
     console.log(selectedGame);
     
    try {
      const postData = {
        userName: formData.userName,
        phoneNumber: formData.phoneNumber,
        ffId: formData.ffId,
        tournamentId: selectedGame.id || selectedGame._id,
        entryFee: selectedGame.entryFee,
        playerSize: selectedGame.playerSize,
        prizePool: selectedGame.prizePool,

      };

      await axios.post('http://localhost:2000/api/slotes', postData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      alert('Registration successful!');
      closeModal();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert('Session expired, please login again.');
        navigate('/login');
      } else {
        alert('Registration failed: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handlePay = () => {
    alert('Payment gateway logic goes here');
  };

  const gameList = Object.keys(games);

  return (
    <div className="w-full min-h-screen bg-[#0f0f0f] text-white px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Tournaments</h1>
        </div>

        {gameList.length === 0 ? (
          <p className="text-center text-gray-400">No games found.</p>
        ) : (
          gameList.map((game, idx) => (
            <div key={idx} className="mb-10">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">{game}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {games[game].map((item, index) => (
                  <motion.div
                    key={index}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <img
                      src={item.gameImageUrl || 'https://via.placeholder.com/400x200'}
                      alt={item.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-4">
                      <h2 className="text-lg font-bold mb-2">{item.name}</h2>
                      <p className="text-sm text-gray-400">Player Size: {item.playerSize}</p>
                      <p className="text-sm text-gray-400">Entry Fee: ₹{item.entryFee}</p>
                      <p className="text-sm text-gray-400">Prize Pool: ₹{item.prizePool}</p>
                      <button
                        onClick={() => openModal(item)}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 transition-colors py-2 rounded text-white font-semibold"
                      >
                        Register
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#1a1a1a] p-6 rounded-lg max-w-md w-full relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <h3 className="text-xl font-semibold mb-4 text-white">Register for {selectedGame.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 text-white">
                  <div>
                    <label className="block mb-1 font-medium">User Name</label>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 rounded bg-[#222] border border-gray-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required
                      pattern="[0-9]{10}"
                      placeholder="10 digit number"
                      className="w-full px-3 py-2 rounded bg-[#222] border border-gray-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Free Fire ID</label>
                    <input
                      type="text"
                      name="ffId"
                      value={formData.ffId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 rounded bg-[#222] border border-gray-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-6">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 transition-colors px-5 py-2 rounded font-semibold"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="bg-gray-700 hover:bg-gray-800 transition-colors px-5 py-2 rounded font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePay}
                      className="bg-yellow-600 hover:bg-yellow-700 transition-colors px-5 py-2 rounded font-semibold"
                    >
                      Pay
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
