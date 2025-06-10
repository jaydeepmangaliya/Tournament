import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Helper to format startedAt
function formatDateTime(dt) {
  if (!dt) return "TBD";
  const date = new Date(dt.replace(' ', 'T'));
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function PlayerSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      fetchPlayerSlots(token);
    }
  }, []);

  const fetchPlayerSlots = async (token) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Player slots response:', res.data);

      // Use actual values from backend, fallback only if missing
      const formattedSlots = res.data.data.map(slot => ({
        ...slot,
        game: slot.game || 'Free Fire',
        startDate: slot.startedAt ? formatDateTime(slot.startAt) : 'TBD',
        entryFee: slot.entryFee !== undefined ? `₹${slot.entryFee}` : 'N/A',
        prizePool: slot.prizePool !== undefined ? `₹${slot.prizePool}` : 'N/A',
        status: slot.iscomplated === 'completed' ? 'completed' : 'pending',
        isFull: slot.isfull === 1
      }));

      setSlots(formattedSlots);
    } catch (error) {
      console.error('Error fetching player slots:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSlot(null);
    setShowPayment(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gray-950">
        <div className="text-2xl font-semibold">Please wait, fetching your slots...</div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white px-6 pt-28 pb-16">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">Your Assigned Slots</h1>
        {slots.length === 0 ? (
          <p className="text-center text-lg">No slots assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {slots.map((slot) => (
              <div
                key={slot.slotId}
                className={`relative bg-neutral-900 rounded-2xl shadow-2xl p-8 flex flex-col justify-between border-2
                  ${slot.status === 'completed' ? 'border-white' : 'border-gray-800'}
                `}
              >
                {/* ...no timer... */}
                <h3 className="text-2xl font-semibold mb-2">{slot.game}</h3>
                <p className="mb-1"><strong>Slot ID:</strong> {slot.sloteId}</p>
                <p className="mb-1">
                  <strong>Status:</strong> <span className={slot.status === 'completed' ? 'text-white' : 'text-gray-400'}>{slot.status}</span>
                </p>
                <p className="mb-1"><strong>Start:</strong> {formatDateTime(slot.startAt)}</p>
                <p className="mb-1"><strong>Entry Fee:</strong> <span className="text-white">{slot.entryFee}</span></p>
                <p className="mb-3"><strong>Prize Pool:</strong> <span className="text-white">{slot.prizePool}</span></p>
                {slot.customeId && slot.customePassword ? (
                  <>
                    <p className="mt-2 text-white font-semibold">Game ID: {slot.customeId}</p>
                    <p className="text-white font-semibold">Password: {slot.customePassword}</p>
                    <p className="text-sm mt-1 italic text-gray-300">Use these credentials to join your match.</p>
                  </>
                ) : (
                  <p className="mt-2 text-gray-400 italic">
                    <strong>Game ID Status:</strong> Assigned Soon
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPayment && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl p-8 w-96 text-white">
            <h2 className="text-2xl font-bold mb-4">Pay for Slot {selectedSlot.slotId}</h2>
            <p className="mb-2">Game: <span className="font-semibold">{selectedSlot.game}</span></p>
            <p className="mb-6">Entry Fee: <span className="text-white font-semibold">{selectedSlot.entryFee}</span></p>
            <button
              className="w-full bg-white text-black py-3 rounded-xl font-semibold shadow-lg hover:bg-gray-200 transition duration-200"
              onClick={() => {
                alert('Payment Successful!');
                handleClose();
              }}
            >
              Pay Now
            </button>
            <button
              className="mt-4 w-full bg-gray-400 text-black py-3 rounded-xl font-semibold hover:bg-gray-500 transition duration-200"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
