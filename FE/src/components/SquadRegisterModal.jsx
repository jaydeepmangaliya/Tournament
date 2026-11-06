import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';

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

  // Joining mode: 'squad' (Full Squad) vs 'random' (Auto-Match / Solo Fill)
  const [joinMode, setJoinMode] = useState(requiredPlayers > 1 ? 'squad' : 'squad');

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
  const [toast, setToast] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(Boolean(tournament?.is_registered));
  const [mySlotNumber, setMySlotNumber] = useState(tournament?.my_slot_number || null);
  const [registeredSuccessData, setRegisteredSuccessData] = useState(null);

  const showToast = (message, type = 'error', title = '') => {
    setToast({ message, type, title });
  };

  // Fees calculation
  const fullEntryFee = parseFloat(tournament.entry_fee || 0);
  const perPlayerFee = requiredPlayers > 1
    ? parseFloat((fullEntryFee / requiredPlayers).toFixed(2))
    : fullEntryFee;
  const activeEntryFee = joinMode === 'random' ? perPlayerFee : fullEntryFee;

  const hasEnoughBalance = walletBalance >= activeEntryFee;
  const isMatchFull = bookedSlots.length >= totalSlots;
  const [paymentMethod, setPaymentMethod] = useState(() => (hasEnoughBalance ? 'wallet' : 'razorpay'));

  // Prohibited states check under Entry 34 of State List
  const PROHIBITED_STATES = ['assam', 'as', 'odisha', 'orissa', 'od', 'telangana', 'tg', 'ts', 'andhra pradesh', 'andhra', 'ap', 'nagaland', 'nl', 'sikkim', 'sk'];
  const userState = (user?.state || '').trim().toLowerCase();
  const isRestrictedState = userState && PROHIBITED_STATES.some(p => userState === p || userState.includes(p));

  // Detect duplicate UIDs entered in the roster
  const duplicateUids = new Set(
    players
      .slice(0, joinMode === 'random' ? 1 : requiredPlayers)
      .map(p => p.inGameId.trim())
      .filter((uid, idx, arr) => uid && arr.indexOf(uid) !== idx)
  );

  // Fetch real-time live tournament data and booked slots from DB
  useEffect(() => {
    let isMounted = true;
    const fetchLiveRoster = async () => {
      try {
        setLoadingDetails(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/tournaments/${tournament.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data.status && isMounted) {
          const tData = res.data.data;
          if (Array.isArray(tData.booked_slots)) {
            setBookedSlots(tData.booked_slots);
          }
          if (tData.is_registered) {
            setAlreadyRegistered(true);
            setMySlotNumber(tData.my_slot_number || tData.my_team?.slot_number);
          }
        }
      } catch (err) {
        console.warn('Failed to sync live roster from DB:', err.message);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchLiveRoster();
    const interval = setInterval(fetchLiveRoster, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournament.id, token]);

  const handlePlayerChange = (index, field, value) => {
    const updated = [...players];
    updated[index][field] = value;
    setPlayers(updated);
  };

  const shareOnWhatsApp = (slot, team) => {
    const timeStr = new Date(tournament.match_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const text =
      `🔥 *SQUAD ASSEMBLE! WE ARE REGISTERED!* 🔥\n\n` +
      `🏆 *Tournament:* ${tournament.title} (${tournament.format.toUpperCase()})\n` +
      `📍 *Our Slot:* Slot #${slot} (${team})\n` +
      `💰 *Prize Pool:* ₹${tournament.prize_pool}\n` +
      `⏰ *Match Time:* Today at ${timeStr}\n\n` +
      `👉 *Check room credentials & match status:* ${window.location.origin}/yourmatches\n\n` +
      `⚡ _Be online in Free Fire 15 mins before match starts!_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showToast('Please log in to register for tournaments.', 'warning', 'Login Required');
      return;
    }

    if (alreadyRegistered) {
      showToast(`You are already registered for this match in Slot #${mySlotNumber || '1'}.`, 'warning', 'Already Registered');
      return;
    }

    if (!selectedSlot) {
      showToast('Please select an available slot to register.', 'error', 'Slot Required');
      return;
    }

    if (bookedSlots.includes(selectedSlot) && joinMode !== 'random') {
      showToast(`Slot #${selectedSlot} was just booked by another squad! Please pick another slot.`, 'warning', 'Slot Taken');
      return;
    }

    const playersToValidate = joinMode === 'random' ? 1 : requiredPlayers;
    for (let i = 0; i < playersToValidate; i++) {
      if (!players[i].inGameName.trim()) {
        showToast(`Please enter In-Game Name for Player #${i + 1}`, 'error', 'Missing Name');
        return;
      }
      if (!players[i].inGameId.trim()) {
        showToast(`Please enter In-Game ID (UID) for Player #${i + 1}`, 'error', 'Missing UID');
        return;
      }
    }

    if (joinMode === 'squad') {
      const uids = players.slice(0, requiredPlayers).map(p => p.inGameId.trim());
      if (new Set(uids).size !== uids.length) {
        showToast('Duplicate Free Fire / BGMI In-Game IDs entered. Each player in your squad must have a unique UID.', 'error', 'Duplicate UID Detected');
        return;
      }
    }

    const effectiveTeamName = joinMode === 'random'
      ? `Auto-Match Squad #${selectedSlot}`
      : requiredPlayers > 1
      ? (teamName || `${players[0].inGameName}'s Squad`)
      : players[0].inGameName;

    const submittedPlayers = joinMode === 'random' ? [players[0]] : players.slice(0, requiredPlayers);

    // 100% FREE ENTRY: Directly book slot with zero payment barrier
    setSubmitting(true);
    try {
      const payload = {
        teamName: effectiveTeamName,
        slotNumber: selectedSlot,
        players: submittedPlayers,
        joinMode,
        paymentMethod: 'free',
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/api/tournaments/${tournament.id}/join`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data.status) {
        showToast(res.data.message || `Slot #${selectedSlot} locked successfully! Free Entry Confirmed.`, 'success', 'Slot Confirmed');
        setRegisteredSuccessData({
          slot: selectedSlot,
          teamName: res.data.data?.teamName || effectiveTeamName,
          joinMode,
          feePaid: 0,
        });
        if (onRegistrationSuccess) onRegistrationSuccess(res.data);
      } else {
        showToast(res.data.message || 'Registration failed. Try again.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <Toast toast={toast} onClose={() => setToast(null)} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#0b0b10] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-gradient-to-r from-[#0f0f16] via-[#09090d] to-[#0f0f16] flex-shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {tournament.game_slug === 'free-fire' ? 'Free Fire' : 'PUBG Mobile'} • {tournament.format.toUpperCase()}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">{tournament.title}</h2>
            </div>
            <button
              onClick={() => {
                if (registeredSuccessData && onRegistrationSuccess) {
                  onRegistrationSuccess();
                }
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* CELEBRATION VIEW: POST-REGISTRATION SQUAD INVITE CARD */}
          {registeredSuccessData ? (
            <div className="p-5 sm:p-6 space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-bounce">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  SLOT #{registeredSuccessData.slot} CONFIRMED!
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-2">
                  {registeredSuccessData.joinMode === 'random'
                    ? 'Auto-Match Queued Successfully!'
                    : 'Squad Locked & Ready to Fight!'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  {registeredSuccessData.joinMode === 'random'
                    ? `You paid ₹${registeredSuccessData.feePaid.toFixed(2)}. The platform is pairing you with active teammates. Room ID & Password will unlock in 'My Matches' 15 mins before start.`
                    : `Team "${registeredSuccessData.teamName}" is locked in Slot #${registeredSuccessData.slot}. Share match details with your squad on WhatsApp!`}
                </p>
              </div>

              {/* 1-Click WhatsApp Button (for full squad captains or sharing with friends) */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => shareOnWhatsApp(registeredSuccessData.slot, registeredSuccessData.teamName)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-[0_8px_25px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  <span>Share Match & Slot on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onRegistrationSuccess) onRegistrationSuccess();
                    onClose();
                  }}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-800 transition cursor-pointer"
                >
                  Done / Close
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD 100% FREE REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain">
              {/* BOOYAH & REFERRAL PROMOTION BANNER */}
              <div className="p-3 bg-[#111118] border border-zinc-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>100% Free Entry Match</span>
                  </span>
                  <span className="text-[10px] font-mono font-black text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    OPEN TO ALL
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-medium">
                  Win Booyah for <strong className="text-emerald-400 font-bold font-mono">₹{tournament.first_prize !== undefined && tournament.first_prize !== null ? tournament.first_prize : (tournament.prize_pool || 0)} Cash</strong> <span className="text-zinc-600 mx-1">•</span> Refer squad mates & get <strong className="text-amber-300 font-bold font-mono">₹10 Cash</strong> in your wallet
                </p>
              </div>

              {/* Prize Pool & Fee Pill */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#121218] p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Booyah Winner Prize</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                    ₹{tournament.first_prize !== undefined && tournament.first_prize !== null ? tournament.first_prize : (tournament.prize_pool || 0)}.00
                  </span>
                </div>
                <div className="bg-[#121218] p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Tournament Entry
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">100% FREE</span>
                </div>
              </div>

              {/* JOINING MODE SELECTOR (FULL SQUAD VS RANDOM SQUAD) */}
              {requiredPlayers > 1 && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Select Your Joining Mode:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option A: Full Squad */}
                    <button
                      type="button"
                      onClick={() => setJoinMode('squad')}
                      className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                        joinMode === 'squad'
                          ? 'bg-zinc-900 border-white text-white shadow-lg shadow-white/5'
                          : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span>Full Squad</span>
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-silver border border-zinc-700">
                          ₹{fullEntryFee} Squad
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-medium">
                        I have my pre-made squad. Captain registers all {requiredPlayers} players & keeps 100% prize.
                      </p>
                    </button>

                    {/* Option B: Random Squad (Auto-Match) */}
                    <button
                      type="button"
                      onClick={() => setJoinMode('random')}
                      className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                        joinMode === 'random'
                          ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          : 'bg-[#121218] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
                          <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect x="2" y="2" width="20" height="20" rx="5" />
                            <path d="M16 8h.01M8 8h.01M8 16h.01M16 16h.01M12 12h.01" />
                          </svg>
                          <span>Random Teammates</span>
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Only ₹{perPlayerFee.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-medium">
                        Join solo! Match with other players and split the prize equally upon winning.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Team Name (Only for full squad) */}
              {joinMode === 'squad' && requiredPlayers > 1 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Squad / Clan Name (Optional)
                  </label>
                  <input
                    type="text"
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

                      if (isBooked && joinMode !== 'random') {
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
                          className={`py-2.5 px-1 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]'
                              : 'bg-[#14141a] border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-900'
                          }`}
                        >
                          <span className="font-mono">#{slotNum}</span>
                          <span className={`text-[8px] uppercase tracking-wider mt-0.5 font-bold ${
                            isSelected ? 'text-black' : isBooked ? 'text-cyan-400' : 'text-zinc-500'
                          }`}>
                            {isSelected ? 'Selected' : isBooked ? 'Auto-Fill' : 'Open'}
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
                  {joinMode === 'random'
                    ? 'Your Player Details (Auto-Match Player)'
                    : requiredPlayers === 1
                    ? 'Player Roster (Solo Player Details)'
                    : `Squad Members Details (${requiredPlayers} Players)`}
                </h3>

                {players.slice(0, joinMode === 'random' ? 1 : requiredPlayers).map((p, idx) => (
                  <div key={idx} className="bg-[#121218] p-3 rounded-xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                      <span className="flex items-center space-x-1.5">
                        {idx === 0 ? (
                          <span className="inline-flex items-center space-x-1 text-white font-bold text-[11px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                            <svg className="w-3 h-3 text-silver" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{joinMode === 'random' ? 'YOUR OPERATIVE DETAILS' : requiredPlayers === 1 ? 'SOLO OPERATIVE' : 'CAPTAIN (ROSTER LEADER)'}</span>
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
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 block">
                            In-Game UID / Character ID *
                          </label>
                          {p.inGameId && duplicateUids.has(p.inGameId.trim()) && (
                            <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
                              Duplicate UID
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          placeholder={tournament.game_slug === 'free-fire' ? 'e.g. 192847192' : 'e.g. 518294719'}
                          value={p.inGameId}
                          onChange={(e) => handlePlayerChange(idx, 'inGameId', e.target.value)}
                          className={`w-full bg-[#0a0a0e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition ${
                            p.inGameId && duplicateUids.has(p.inGameId.trim())
                              ? 'border-2 border-red-500/80 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                              : 'border border-zinc-700 focus:border-zinc-400'
                          }`}
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

              {/* FREE ENTRY BADGE & PERKS */}
              <div className="p-3 bg-[#121218] border border-zinc-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-300 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Free Open Entry (No Payment Needed)</span>
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-400">
                    ₹0.00 FREE
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Room ID & Password will unlock in 'My Matches' 15 minutes before the match starts.
                </p>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={submitting || (!selectedSlot && joinMode !== 'random') || alreadyRegistered}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-black shadow-[0_4px_20px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {alreadyRegistered
                  ? `Already Registered (Slot #${mySlotNumber || '1'})`
                  : submitting
                  ? 'Locking Your Slot...'
                  : !selectedSlot && joinMode !== 'random'
                  ? 'Select an Available Slot Above'
                  : joinMode === 'random'
                  ? `🔥 Join Free & Auto-Match Slot #${selectedSlot}`
                  : `🔥 Join Free & Lock Slot #${selectedSlot}`}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
