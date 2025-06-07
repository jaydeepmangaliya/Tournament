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
      const res = await axios.get('http://localhost:2000/api/user', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Use actual values from backend, fallback only if missing
      const formattedSlots = res.data.data.map(slot => ({
        ...slot,
        game: slot.game || 'Free Fire',
        startDate: slot.startedAt ? formatDateTime(slot.startedAt) : 'TBD',
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
    <div className="bg-gray-950 min-h-screen text-white px-6 pt-28 pb-16">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">Your Assigned Slots</h1>
        {slots.length === 0 ? (
          <p className="text-center text-lg">No slots assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {slots.map((slot) => (

             
              
              <div
                key={slot.slotId}
                className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-md p-4 flex flex-col justify-between
                  ${slot.status === 'completed' ? 'border-4 border-green-600' : ''}
                `}
              >
                <h3 className="text-xl font-semibold mb-2">{slot.game}</h3>
                <p><strong>Slot ID:</strong> {slot.slotId}</p>
                <p><strong>Status:</strong> {slot.status}</p>
                <p><strong>Start:</strong> {slot.startDate}</p>
                <p><strong>Entry Fee:</strong> {slot.entryFee}</p>
                <p><strong>Prize Pool:</strong> {slot.prizePool}</p>

                {slot.customeId && slot.customePassword ? (
                  <>
                    <p className="mt-2 text-green-400 font-semibold">Game ID: {slot.customeId}</p>
                    <p className="text-green-400 font-semibold">Password: {slot.customePassword}</p>
                    <p className="text-sm mt-1 italic">Use these credentials to join your match.</p>
                  </>
                ) : (
                  <p className="mt-2 text-yellow-400 italic">
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
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-black">
            <h2 className="text-xl font-bold mb-4">Pay for Slot {selectedSlot.slotId}</h2>
            <p className="mb-4">Game: {selectedSlot.game}</p>
            <p className="mb-4">Entry Fee: {selectedSlot.entryFee}</p>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              onClick={() => {
                alert('Payment Successful!');
                handleClose();
              }}
            >
              Pay Now
            </button>
            <button
              className="mt-4 w-full bg-gray-400 text-black py-2 rounded-lg hover:bg-gray-500"
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
