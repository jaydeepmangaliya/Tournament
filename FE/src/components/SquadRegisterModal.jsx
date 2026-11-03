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

  // Update paymentMethod if wallet balance changes or joinMode changes
  useEffect(() => {
    if (walletBalance >= activeEntryFee && paymentMethod === 'razorpay') {
      setPaymentMethod('wallet');
    }
  }, [walletBalance, activeEntryFee]);

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

    // PATH 1: PAY VIA WALLET BALANCE
    if (paymentMethod === 'wallet') {
      if (!hasEnoughBalance) {
        showToast(`Insufficient wallet balance. You need ₹${activeEntryFee.toFixed(2)}, but have ₹${walletBalance.toFixed(2)}. Please choose Direct UPI Payment below.`, 'warning', 'Insufficient Balance');
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          teamName: effectiveTeamName,
          slotNumber: selectedSlot,
          players: submittedPlayers,
          joinMode,
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
          showToast(res.data.message || `Slot #${selectedSlot} locked successfully!`, 'success', 'Registration Confirmed');
          setRegisteredSuccessData({
            slot: selectedSlot,
            teamName: res.data.data?.teamName || effectiveTeamName,
            joinMode,
            feePaid: activeEntryFee,
          });
        } else {
          showToast(res.data.message || 'Registration failed. Try again.', 'error');
        }
      } catch (err) {
        showToast(err.response?.data?.message || 'Registration failed. Try again.', 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // PATH 2: DIRECT ONLINE CHECKOUT (RAZORPAY: UPI, GPAY, PHONEPE, QR, CARDS)
    setSubmitting(true);
    try {
      const orderRes = await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/api/payment/create-order`,
        {
          amount: activeEntryFee,
          tournamentId: tournament.id,
          tournamentName: tournament.title,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderData = orderRes.data;
      if (!orderData?.orderId) {
        throw new Error(orderRes.data?.message || 'Failed to initialize payment gateway.');
      }

      const rzpKey = orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_WyypEVHeheZwJ5';
      if (!window.Razorpay) {
        showToast('Payment gateway is loading. Please try again in a few seconds.', 'error', 'Gateway Error');
        setSubmitting(false);
        return;
      }

      const options = {
        key: rzpKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'LocalEsport Arena',
        description: `Direct Entry for ${tournament.title} (Slot #${selectedSlot}${joinMode === 'random' ? ' Random Fill' : ''})`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.name || players[0].inGameName,
          email: user?.email || '',
          contact: players[0].phone || user?.phone || '',
        },
        theme: {
          color: '#06b6d4',
          backdrop_color: '#09090d',
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'UPI (Google Pay, PhonePe, Paytm, QR)',
                instruments: [
                  { method: 'upi', flows: ['intent', 'qr'] },
                ],
              },
              other: {
                name: 'Netbanking / Cards / Wallets',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                ],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function (paymentResponse) {
          try {
            const verifyRes = await axios.post(
              `${import.meta.env.VITE_API_URL || ""}/api/payment/verify-and-join`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                tournamentId: tournament.id,
                amount: activeEntryFee,
                teamName: effectiveTeamName,
                slotNumber: selectedSlot,
                players: submittedPlayers,
                joinMode,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (verifyRes.data.status) {
              showToast(verifyRes.data.message || `Payment verified! You are locked in Slot #${selectedSlot}!`, 'success', 'Slot Confirmed');
              setRegisteredSuccessData({
                slot: selectedSlot,
                teamName: effectiveTeamName,
                joinMode,
                feePaid: activeEntryFee,
              });
            } else {
              showToast(verifyRes.data.message || 'Payment verified but slot booking failed. Please contact support.', 'error');
            }
          } catch (verifyErr) {
            console.error('Verify error:', verifyErr);
            showToast(verifyErr.response?.data?.message || 'Error confirming slot. Please check your transaction.', 'error');
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Direct Checkout Error:', err);
      showToast(err.response?.data?.message || err.message || 'Payment initiation failed. Please check your internet or try wallet payment.', 'error');
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
            /* STANDARD REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain">
              {/* Prize Pool & Fee Pill */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#121218] p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Prize Pool</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 font-mono">₹{tournament.prize_pool}</span>
                </div>
                <div className="bg-[#121218] p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    {joinMode === 'random' ? 'Your Entry Share' : 'Squad Entry Fee'}
                  </span>
                  <span className="text-sm sm:text-base font-black text-white font-mono">₹{activeEntryFee.toFixed(2)}</span>
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

              {/* PAYMENT METHOD SELECTOR */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Choose Payment Method
                </label>

                {/* Option A: Direct Online Payment (UPI / QR / Cards) */}
                <div
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'razorpay'
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                      : 'bg-[#121218] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'razorpay' ? 'border-cyan-400 bg-cyan-500' : 'border-zinc-600'
                    }`}>
                      {paymentMethod === 'razorpay' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">Direct Online Checkout</span>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black uppercase">
                          INSTANT
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Pay ₹{activeEntryFee.toFixed(2)} directly via Google Pay, PhonePe, Paytm UPI, QR, or Card
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-black text-white font-mono">₹{activeEntryFee.toFixed(2)}</span>
                    <span className="text-[9px] text-zinc-500">No pre-load needed</span>
                  </div>
                </div>

                {/* Option B: Pay from Wallet Balance */}
                <div
                  onClick={() => {
                    if (hasEnoughBalance) {
                      setPaymentMethod('wallet');
                    }
                  }}
                  className={`p-3 rounded-xl border transition ${
                    hasEnoughBalance ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                  } flex items-center justify-between ${
                    paymentMethod === 'wallet'
                      ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/30'
                      : 'bg-[#121218] border-zinc-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'wallet' ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-600'
                    }`}>
                      {paymentMethod === 'wallet' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">Use Wallet Earnings</span>
                        {hasEnoughBalance ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase">
                            READY
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500 text-[9px] font-bold uppercase">
                            INSUFFICIENT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Deduct from your tournament prize winnings & earnings
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      ₹{walletBalance.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-zinc-500">Available</span>
                  </div>
                </div>
              </div>

              {/* Prohibited State Alert */}
              {isRestrictedState && activeEntryFee > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div>
                    <strong className="block text-red-200">State Legal Restriction ({user.state})</strong>
                    <span className="text-[11px] leading-relaxed">Under Entry 34 of the State List, residents of Assam, Odisha, Telangana, Andhra Pradesh, Nagaland, and Sikkim are prohibited from participating in real-money contests.</span>
                  </div>
                </div>
              )}

              {/* Compliance & 18+ agreement notice */}
              <div className="flex items-center justify-center space-x-1.5 text-[10px] text-zinc-500 pt-1 text-center">
                <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>
                  18+ only. By joining, you confirm compliance with our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline hover:text-white font-medium">
                    Terms & Fair Play Rules
                  </a>.
                </span>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={submitting || (!selectedSlot && joinMode !== 'random') || alreadyRegistered || (isRestrictedState && activeEntryFee > 0)}
                className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  paymentMethod === 'razorpay'
                    ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-500 hover:brightness-110 text-black'
                    : 'bg-silver-gradient hover:brightness-110 text-black'
                }`}
              >
                {alreadyRegistered
                  ? `Already Registered (Slot #${mySlotNumber || '1'})`
                  : (isRestrictedState && activeEntryFee > 0)
                  ? 'Contests Restricted in Your State'
                  : submitting
                  ? 'Processing Registration...'
                  : !selectedSlot
                  ? 'Select an Available Slot Above'
                  : joinMode === 'random'
                  ? paymentMethod === 'razorpay'
                    ? `Pay ₹${activeEntryFee.toFixed(2)} via UPI & Auto-Match Slot #${selectedSlot}`
                    : `Pay ₹${activeEntryFee.toFixed(2)} from Wallet & Auto-Match Slot #${selectedSlot}`
                  : paymentMethod === 'razorpay'
                  ? `Pay ₹${activeEntryFee.toFixed(2)} via UPI & Join Slot #${selectedSlot}`
                  : `Pay ₹${activeEntryFee.toFixed(2)} from Wallet & Join Slot #${selectedSlot}`}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
