import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Pendingslote() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState({});
  const [disabledSaves, setDisabledSaves] = useState({});

  useEffect(() => {
    axios.get('http://localhost:2000/api/slotes')
      .then(res => {
        const slotData = res.data?.data?.rows; 
        console.log(slotData);
        
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
          initialEdit[slot.slotId] = {
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

  const handleInputChange = (slotId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: value
      }
    }));
  };

  const handleSave = async (slotId) => {
    const customeId = editValues[slotId]?.customeId || "";
    const customePassword = editValues[slotId]?.customePassword || "";

    // Calculate startedAt as current time + 15 minutes
    const startedAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    setDisabledSaves(prev => ({ ...prev, [slotId]: true }));

    try {
      await axios.post('http://localhost:2000/api/update-slote', {
        sloteId: slotId,
        customeId,
        customePassword,
        startedAt
      });
      setSlots(prev =>
        prev.map(slot =>
          slot.slotId === slotId
            ? { ...slot, customeId, customePassword, startedAt }
            : slot
        )
      );
      alert('Saved successfully!');
    } catch (err) {
      alert('Failed to save!');
      setDisabledSaves(prev => ({ ...prev, [slotId]: false }));
    }
  };

  if (loading) {
    return <div className="text-white p-4">Loading pending slots...</div>;
  }

  return (
    <div className="p-6 bg-black text-white min-h-screen">
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
                <th className="px-4 py-2">Started At</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={index} className="border-t border-gray-700">
                  <td className="px-4 py-2">{slot.slotId}</td>
                  <td className="px-4 py-2">{slot.gameId}</td>
                  <td className="px-4 py-2">₹{slot.entryFee}</td>
                  <td className="px-4 py-2">₹{slot.prizePool}</td>
                  <td className="px-4 py-2">{slot.isfull === 1 ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">{slot.iscomplated}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-gray-700 text-white px-2 py-1 rounded w-full"
                      value={editValues[slot.slotId]?.customeId || ""}
                      onChange={e => handleInputChange(slot.slotId, 'customeId', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-gray-700 text-white px-2 py-1 rounded w-full"
                      value={editValues[slot.slotId]?.customePassword || ""}
                      onChange={e => handleInputChange(slot.slotId, 'customePassword', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">{slot.startedAt || "Not started"}</td>
                  <td className="px-4 py-2">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      onClick={() => handleSave(slot.slotId)}
                      disabled={!!disabledSaves[slot.slotId]}
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
