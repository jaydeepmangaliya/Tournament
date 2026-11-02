import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function SquadRegisterModal({
  isOpen,
  onClose,
  tournament,
  walletBalance = 0,
  onRegistrationSuccess,
  onOpenWallet,
}) {
  if (!isOpen || !tournament) return null;

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const requiredPlayers = tournament.players_per_team || 1;
  const isBR = tournament.match_type === 'battle_royale';
  const totalSlots = tournament.total_teams || (isBR ? 48 : 2);

  // Live booked slots state synced directly with DB
  const [bookedSlots, setBookedSlots] = useState(() => {
    return Array.isArray(tournament.booked_slots) ? tournament.booked_slots : [];
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [players, setPlayers] = useState(() => {
    const initial = [];
    for (let i = 0; i < requiredPlayers; i++) {
      initial.push({
        playerName: i === 0 ? (user.name || '') : '',
        inGameName: '',
        inGameId: '',
        phone: i === 0 ? (user.phone || '') : '',
      });
    }
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(Boolean(tournament?.is_registered));
  const [mySlotNumber, setMySlotNumber] = useState(tournament?.my_slot_number || null);

  // Fetch real-time live tournament data and booked slots from DB
  useEffect(() => {
    let isMounted = true;
    const fetchLiveRoster = async () => {
      try {
        setLoadingDetails(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tournaments/${tournament.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data.status && isMounted) {
          const liveBooked = res.data.data.booked_slots || [];
          setBookedSlots(liveBooked);

          if (res.data.data.is_registered) {
            setAlreadyRegistered(true);
            setMySlotNumber(res.data.data.my_team?.slot_number || null);
          }

          // Find first unbooked slot
          const allSlots = Array.from({ length: totalSlots }, (_, i) => i + 1);
          const firstOpen = allSlots.find(s => !liveBooked.includes(s));
          setSelectedSlot(firstOpen || null);
        }
      } catch (err) {
        console.error("Error fetching live tournament slots:", err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchLiveRoster();
    return () => { isMounted = false; };
  }, [tournament.id, totalSlots]);

  const handlePlayerChange = (index, field, value) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const entryFee = parseFloat(tournament.entry_fee || 0);
  const hasEnoughBalance = walletBalance >= entryFee;
  const isMatchFull = bookedSlots.length >= totalSlots;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      alert('Please log in first to join tournaments.');
      return;
    }

    if (isMatchFull) {
      setError('This match is already completely booked. Please join the newly created match in lobby.');
      return;
    }

    if (alreadyRegistered) {
      setError(`You are already registered for this match in Slot #${mySlotNumber || '1'}. One player account cannot register twice in the same match.`);
      return;
    }

    if (!selectedSlot) {
      setError('Please select an available slot.');
      return;
    }

    if (bookedSlots.includes(selectedSlot)) {
      setError(`Slot #${selectedSlot} was just booked by another player! Please choose an available slot.`);
      return;
    }

    for (let i = 0; i < requiredPlayers; i++) {
      if (!players[i].inGameName.trim()) {
        setError(`Please enter In-Game Name for Player #${i + 1}`);
        return;
      }
      if (!players[i].inGameId.trim()) {
        setError(`Please enter In-Game ID (UID) for Player #${i + 1}`);
        return;
      }
    }

    // Check for duplicate UIDs within squad
    const uids = players.slice(0, requiredPlayers).map(p => p.inGameId.trim());
    if (new Set(uids).size !== uids.length) {
      setError('Duplicate Free Fire / BGMI In-Game IDs entered. Each player in your squad must have a unique UID.');
      return;
    }

    if (!hasEnoughBalance) {
      setError(`Insufficient wallet balance. You need ₹${entryFee}, but have ₹${walletBalance.toFixed(2)}. Please add funds.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teamName: requiredPlayers > 1 ? (teamName || `${players[0].inGameName}'s Squad`) : players[0].inGameName,
        slotNumber: selectedSlot,
        players,
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tournaments/${tournament.id}/join`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data.status) {
        alert(res.data.message || 'Registration successful!');
        if (onRegistrationSuccess) onRegistrationSuccess();
        onClose();
      } else {
        setError(res.data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0c0c10] border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-[#e4e4e7] my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-[#121218] flex items-center justify-between flex-shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {tournament.game_name}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-black">
                  {tournament.format.toUpperCase()} {isBR ? 'BR' : 'CLASH'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Match #{tournament.id}
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-white mt-1 leading-snug">{tournament.title}</h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl p-1">
              &times;
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-700 text-red-300 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Quick Specs */}
            <div className="grid grid-cols-3 gap-2 bg-[#121218] p-3 rounded-xl border border-zinc-800 text-center text-xs">
              <div>
                <span className="text-zinc-500 uppercase font-bold text-[10px] block">Entry Fee</span>
                <span className="font-black text-sm text-white">₹{entryFee}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase font-bold text-[10px] block">Prize Pool</span>
                <span className="font-black text-sm text-silver">₹{tournament.prize_pool}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase font-bold text-[10px] block">Map</span>
                <span className="font-black text-sm text-zinc-300">{tournament.map_name || 'Bermuda'}</span>
              </div>
            </div>

            {/* Match Full Notification */}
            {isMatchFull && (
              <div className="p-3 bg-amber-950/40 border border-amber-600/70 text-amber-200 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>This match is 100% full! An automated fresh match has been added to the lobby.</span>
              </div>
            )}

            {/* Already Registered Notification */}
            {alreadyRegistered && (
              <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/60 text-emerald-200 rounded-xl text-xs font-semibold flex items-start space-x-2.5">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <div className="font-bold text-white text-xs">You are already registered for this match!</div>
                  <div className="text-[11px] text-zinc-300 mt-0.5">
                    Your team is locked in <strong>Slot #{mySlotNumber || '1'}</strong>. Multiple registrations in the same match are not allowed. Please check "My Matches" to view your credentials.
                  </div>
                </div>
              </div>
            )}

            {/* Team Name for Squad / Duo */}
            {requiredPlayers > 1 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Team / Squad Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Soul Warriors, Apex Predators"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                />
              </div>
            )}

            {/* Dynamic Slot Picker with Disabled Booked Slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {isBR ? `Pick Lobby Slot (#1 to #${totalSlots})` : `Choose Team Slot (#1 to #${totalSlots})`}
                </label>
                <div className="flex items-center space-x-3 text-[10px]">
                  <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>{totalSlots - bookedSlots.length} Available</span>
                  </span>
                  <span className="flex items-center space-x-1 text-red-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                    <span>{bookedSlots.length} Booked</span>
                  </span>
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                  Syncing live seats from database...
                </div>
              ) : (
                <div className={`grid gap-1.5 sm:gap-2 ${totalSlots <= 4 ? 'grid-cols-2' : totalSlots <= 12 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'}`}>
                  {Array.from({ length: totalSlots }, (_, i) => i + 1).map((slotNum) => {
                    const isBooked = bookedSlots.includes(slotNum);
                    const isSelected = selectedSlot === slotNum;

                    if (isBooked) {
                      return (
                        <button
                          key={slotNum}
                          type="button"
                          disabled
                          title={`Slot #${slotNum} is already assigned and booked`}
                          className="py-2.5 px-1 rounded-xl text-[10px] font-bold border bg-red-950/20 border-red-900/40 text-red-500/60 cursor-not-allowed flex flex-col items-center justify-center transition opacity-60"
                        >
                          <span className="line-through font-mono">#{slotNum}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider mt-0.5 text-red-400">
                            Booked
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={slotNum}
                        type="button"
                        onClick={() => setSelectedSlot(slotNum)}
                        className={`py-2.5 px-1 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]'
                            : 'bg-[#14141a] border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-900'
                        }`}
                      >
                        <span className="font-mono">#{slotNum}</span>
                        <span className={`text-[8px] uppercase tracking-wider mt-0.5 font-bold ${
                          isSelected ? 'text-black' : 'text-zinc-500'
                        }`}>
                          {isSelected ? 'Selected' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Player Roster */}
            <div className="space-y-3 pt-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {requiredPlayers === 1 ? 'Player Roster (Solo Player Details)' : `Squad Members Details (${requiredPlayers} Players)`}
              </h3>

              {players.map((p, idx) => (
                <div key={idx} className="bg-[#121218] p-3 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span className="flex items-center space-x-1.5">
                      {idx === 0 ? (
                        <span className="inline-flex items-center space-x-1 text-white font-bold text-[11px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                          <svg className="w-3 h-3 text-silver" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span>{requiredPlayers === 1 ? 'SOLO OPERATIVE' : 'CAPTAIN (ROSTER LEADER)'}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-bold text-[11px]">SQUAD MEMBER #{idx + 1}</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                        In-Game Name (IGN) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mortal, TotalGaming"
                        value={p.inGameName}
                        onChange={(e) => handlePlayerChange(idx, 'inGameName', e.target.value)}
                        className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                        In-Game UID / Character ID *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={tournament.game_slug === 'free-fire' ? 'e.g. 192847192' : 'e.g. 518294719'}
                        value={p.inGameId}
                        onChange={(e) => handlePlayerChange(idx, 'inGameId', e.target.value)}
                        className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>

                  {idx === 0 && (
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                        WhatsApp Contact Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={p.phone}
                        onChange={(e) => handlePlayerChange(idx, 'phone', e.target.value)}
                        className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Wallet Check & Submit */}
            <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-zinc-500 uppercase font-bold text-[10px] block">Your Wallet Balance:</span>
                <strong className={hasEnoughBalance ? 'text-white text-sm' : 'text-zinc-400 text-sm'}>
                  ₹{walletBalance.toFixed(2)}
                </strong>
              </div>
              {!hasEnoughBalance && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenWallet) onOpenWallet();
                  }}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 rounded-lg font-bold text-xs transition"
                >
                  + Add Funds
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !hasEnoughBalance || isMatchFull || !selectedSlot || alreadyRegistered}
              className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {alreadyRegistered
                ? `Already Registered (Slot #${mySlotNumber || '1'})`
                : submitting
                ? 'Registering...'
                : isMatchFull
                ? 'Match is 100% Full'
                : selectedSlot
                ? `Lock Slot #${selectedSlot} & Pay ₹${entryFee}`
                : 'Select an Available Slot'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
