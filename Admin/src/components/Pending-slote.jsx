import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Improved notification bar with icon and close button, centered and styled
function NotificationBar({ message, type, onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-center gap-3 px-6 py-3 rounded-lg shadow-xl text-white text-base font-semibold transition-all
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
      style={{ minWidth: 320, maxWidth: 480, letterSpacing: 1 }}
    >
      {type === 'success' ? (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2l4-4" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
        </svg>
      )}
      <span className="flex-1">{message}</span>
      <button className="ml-2 text-white text-xl font-bold focus:outline-none" onClick={onClose}>&times;</button>
    </div>
  );
}

// Helper to format startedAt
function formatDateTime(dt) {
  if (!dt) return "Not started";
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

export default function Pendingslote() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    axios.get('http://localhost:2000/api/slotes')
      .then(res => {
        const slotData = res.data?.data?.rows; 
      
        
        
        
        let slotList = [];
        if (Array.isArray(slotData)) {
          slotList = slotData;
        } else if (slotData && typeof slotData === 'object') {
          slotList = [slotData];
        }
        const pendingSlots = slotList.filter(slot => slot.iscomplated === "pending");
        setSlots(pendingSlots);
        const initialEdit = {};
        pendingSlots.forEach(slot => {
          initialEdit[slot.sloteId] = {
            customeId: slot.customeId || "",
            customePassword: slot.customePassword || ""
          };
        });
        setEditValues(initialEdit);
      })
      .catch(err => {
        console.error('Failed to fetch slots:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleInputChange = (sloteId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [sloteId]: {
        ...prev[sloteId],
        [field]: value
      }
    }));
  };

  const handleSave = async (sloteId) => {
    const customeId = editValues[sloteId]?.customeId || "";
    const customePassword = editValues[sloteId]?.customePassword || "";

    // Calculate startAt as current time + 15 minutes
    const startAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    try {
      await axios.post('http://localhost:2000/api/update-slote', {
        sloteId: sloteId,
        customeId,
        customePassword,
        startAt
      });
      setSlots(prev =>
        prev.map(slot =>
          slot.sloteId === sloteId
            ? { ...slot, customeId, customePassword, startAt }
            : slot
        )
      );
      setToast({ show: true, message: 'Saved successfully!', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: 'Failed to save!', type: 'error' });
    }
  };

  if (loading) {
    return <div className="text-white p-4">Loading pending slots...</div>;
  }

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      {toast.show && (
        <NotificationBar
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      <h2 className="text-3xl font-bold mb-6">Pending Slots</h2>
      {slots.length === 0 ? (
        <p>No pending slots found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2">Slot ID</th>
                <th className="px-4 py-2">Game ID</th>
                <th className="px-4 py-2">Entry Fee</th>
                <th className="px-4 py-2">Prize Pool</th>
                <th className="px-4 py-2">Is Full</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Customer ID</th>
                <th className="px-4 py-2">Customer Password</th>
                <th className="px-4 py-2 whitespace-nowrap w-48">Started At</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={index} className="border-t border-gray-700">
                  <td className="px-4 py-2">{slot.sloteId}</td>
                  <td className="px-4 py-2">{slot.gameId}</td>
                  <td className="px-4 py-2">₹{slot.entryFee}</td>
                  <td className="px-4 py-2">₹{slot.prizePool}</td>
                  <td className="px-4 py-2">{slot.isfull === 1 ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">{slot.iscomplated}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-gray-700 text-white px-2 py-1 rounded w-full"
                      value={editValues[slot.sloteId]?.customeId || ""}
                      onChange={e => handleInputChange(slot.sloteId, 'customeId', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-gray-700 text-white px-2 py-1 rounded w-full"
                      value={editValues[slot.sloteId]?.customePassword || ""}
                      onChange={e => handleInputChange(slot.sloteId, 'customePassword', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap w-48">{formatDateTime(slot.startAt)}</td>
                  <td className="px-4 py-2">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      onClick={() => handleSave(slot.sloteId)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
