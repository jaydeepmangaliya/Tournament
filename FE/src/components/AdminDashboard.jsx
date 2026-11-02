import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = Boolean(token && user?.role === 'admin');

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'ready' | 'open' | 'ongoing' | 'completed'

  // Credential input state per tournament: { [tournamentId]: { roomId: '', roomPassword: '' } }
  const [credentials, setCredentials] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [message, setMessage] = useState('');
  const [expandedRosterId, setExpandedRosterId] = useState(null);

  // Quick manual tournament modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    gameId: 1,
    title: '',
    matchType: 'battle_royale',
    format: 'solo',
    mapName: 'Bermuda',
    totalSlots: 48,
    totalTeams: 48,
    playersPerTeam: 1,
    entryFee: 30,
    prizePool: 1000,
    perKillPrize: 15,
    firstPrize: 500,
    secondPrize: 300,
    thirdPrize: 200,
    matchStartAt: '',
  });

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tournaments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.data.status) {
        setTournaments(res.data.data);

        // Pre-fill existing credentials
        const credMap = {};
        res.data.data.forEach((t) => {
          credMap[t.id] = {
            roomId: t.room_id || '',
            roomPassword: t.room_password || '',
          };
        });
        setCredentials(credMap);
      }
    } catch (err) {
      console.error('Error fetching admin tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetchTournaments();
  }, [navigate]);

  const handleAdminLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login', { replace: true });
  };

  const handleCredentialChange = (tournamentId, field, value) => {
    setCredentials((prev) => ({
      ...prev,
      [tournamentId]: {
        ...(prev[tournamentId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveCredentials = async (tournamentId) => {
    const cred = credentials[tournamentId];
    if (!cred?.roomId?.trim() || !cred?.roomPassword?.trim()) {
      alert('Please enter both Room ID and Room Password.');
      return;
    }

    try {
      setSubmittingId(tournamentId);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${tournamentId}/room-credentials`,
        {
          roomId: cred.roomId.trim(),
          roomPassword: cred.roomPassword.trim(),
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (res.data.status) {
        setMessage(`Credentials published for Tournament #${tournamentId}! Players can now view them.`);
        setTimeout(() => setMessage(''), 4000);
        fetchTournaments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update credentials.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleStatusChange = async (tournamentId, newStatus) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${tournamentId}/status`,
        { status: newStatus },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (res.data.status) {
        fetchTournaments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/create`,
        createForm,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (res.data.status) {
        alert('Tournament created successfully!');
        setShowCreateModal(false);
        fetchTournaments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create tournament.');
    }
  };

  const readyMatches = tournaments.filter((t) => t.is_ready_to_host || t.status === 'ready');
  const filteredTournaments = tournaments.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'ready') return t.status === 'ready' || t.is_ready_to_host;
    return t.status === activeFilter;
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-20 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                Tournament <span className="text-silver">Organizer Console</span>
              </h1>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Live match orchestration, slot management, and custom room credentials distribution
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchTournaments()}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l6.23-1.19" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-md flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Tournament</span>
            </button>
            <button
              onClick={handleAdminLogout}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/80 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {message && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-600 text-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Total Tournaments</span>
            <strong className="text-xl sm:text-2xl font-black text-white">{tournaments.length}</strong>
          </div>
          <div className={`border rounded-2xl p-4 ${readyMatches.length > 0 ? 'bg-amber-950/20 border-amber-600/70 shadow-lg shadow-amber-900/10' : 'bg-[#0c0c10] border-zinc-800'}`}>
            <div className="flex items-center space-x-1.5">
              {readyMatches.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${readyMatches.length > 0 ? 'text-amber-400 font-black' : 'text-zinc-500'}`}>
                Ready to Organize
              </span>
            </div>
            <strong className={`text-xl sm:text-2xl font-black ${readyMatches.length > 0 ? 'text-amber-300' : 'text-white'}`}>
              {readyMatches.length} Full Matches
            </strong>
          </div>
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Live / In-Progress</span>
            <strong className="text-xl sm:text-2xl font-black text-white">
              {tournaments.filter(t => t.status === 'ongoing').length}
            </strong>
          </div>
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Completed Matches</span>
            <strong className="text-xl sm:text-2xl font-black text-white">
              {tournaments.filter(t => t.status === 'completed').length}
            </strong>
          </div>
        </div>

        {/* SECTION 1: PRIORITY ACTION REQUIRED (FULL MATCHES WAITING FOR CREDENTIALS) */}
        {readyMatches.length > 0 && (
          <div className="bg-[#101017] border-2 border-amber-500/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Action Required: Match 100% Full — Share Custom Room Credentials
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              The following matches have reached full roster capacity. All players have paid and are in lobby waiting for Custom Room ID & Password.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {readyMatches.map((t) => (
                <div key={t.id} className="bg-[#0c0c10] border border-amber-600/40 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                          MATCH FULL ({t.filled_teams}/{t.total_teams})
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">#{t.id} • {t.game_name}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">{t.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
                      {t.format.toUpperCase()}
                    </span>
                  </div>

                  {/* Room Credentials Input */}
                  <div className="bg-[#14141d] p-3 rounded-xl border border-zinc-800 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                      Custom Room Details:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Room ID *</label>
                        <input
                          type="text"
                          placeholder="e.g. 8492041"
                          value={credentials[t.id]?.roomId || ''}
                          onChange={(e) => handleCredentialChange(t.id, 'roomId', e.target.value)}
                          className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Password *</label>
                        <input
                          type="text"
                          placeholder="e.g. 1234"
                          value={credentials[t.id]?.roomPassword || ''}
                          onChange={(e) => handleCredentialChange(t.id, 'roomPassword', e.target.value)}
                          className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleSaveCredentials(t.id)}
                        disabled={submittingId === t.id}
                        className="flex-1 py-2 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-lg transition hover:brightness-110 shadow-md disabled:opacity-50"
                      >
                        {submittingId === t.id ? 'Publishing...' : 'Publish Room Credentials'}
                      </button>
                      <button
                        onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition"
                      >
                        {expandedRosterId === t.id ? 'Hide Roster' : `View Roster (${t.teams?.length || 0})`}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Roster for Admin Verification */}
                  {expandedRosterId === t.id && (
                    <div className="bg-[#09090c] p-3 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto space-y-2 text-xs">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                        Registered Operatives ({t.teams?.length} Teams):
                      </span>
                      {t.teams?.map((team) => (
                        <div key={team.id} className="p-2 bg-[#121218] rounded-lg border border-zinc-800 space-y-1">
                          <div className="flex justify-between items-center font-semibold text-white">
                            <span>Slot #{team.slot_number}: <strong>{team.team_name}</strong></span>
                            <span className="text-[10px] text-zinc-400 font-mono">Leader: {team.leader_name} ({team.leader_phone || 'No phone'})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-300">
                            {team.players?.map((p, pIdx) => (
                              <div key={p.id} className="bg-black/40 px-2 py-0.5 rounded font-mono">
                                {p.is_leader ? '[LEADER] ' : ''}{p.in_game_name} ({p.in_game_id})
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: ALL TOURNAMENTS TABLE & MANAGEMENT */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">All Matches Schedule</h2>

            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs bg-[#0e0e13] p-1.5 rounded-xl border border-zinc-800">
              {[
                { id: 'all', label: 'All Matches' },
                { id: 'ready', label: 'Ready to Host' },
                { id: 'open', label: 'Open Lobbies' },
                { id: 'ongoing', label: 'Ongoing' },
                { id: 'completed', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                    activeFilter === f.id
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-500 font-mono">
              Loading tournament database...
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl text-zinc-400 text-xs">
              No tournaments found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTournaments.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#0c0c10] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg transition"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {t.game_name} • {t.format.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        t.status === 'ready'
                          ? 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                          : t.status === 'open'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : t.status === 'ongoing'
                          ? 'bg-zinc-800 text-white border-zinc-600'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}>
                        {t.status === 'ready' ? 'READY (FULL)' : t.status.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">{t.title}</h3>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono mt-1">
                        <span>Map: {t.map_name}</span>
                        <span>•</span>
                        <span>Entry: ₹{t.entry_fee}</span>
                        <span>•</span>
                        <span>Pool: ₹{t.prize_pool}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-[#121218] p-2.5 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                      <span className="text-zinc-500 uppercase font-bold text-[10px]">Slots Occupied:</span>
                      <span className="font-mono font-bold text-white">
                        {t.filled_teams} / {t.total_teams} {t.players_per_team > 1 ? 'Squads' : 'Slots'} ({t.remaining_teams} open)
                      </span>
                    </div>

                    {/* Room ID & Password editor */}
                    <div className="bg-[#14141c] p-3 rounded-xl border border-zinc-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                        Room Credentials:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Room ID"
                          value={credentials[t.id]?.roomId || ''}
                          onChange={(e) => handleCredentialChange(t.id, 'roomId', e.target.value)}
                          className="bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Password"
                          value={credentials[t.id]?.roomPassword || ''}
                          onChange={(e) => handleCredentialChange(t.id, 'roomPassword', e.target.value)}
                          className="bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveCredentials(t.id)}
                        disabled={submittingId === t.id}
                        className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition"
                      >
                        {t.has_credentials ? 'Update Credentials' : 'Set Credentials'}
                      </button>
                    </div>
                  </div>

                  {/* Status Toggle buttons */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Change Status:</span>
                    <div className="flex items-center space-x-1">
                      {['open', 'ongoing', 'completed'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(t.id, st)}
                          disabled={t.status === st}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                            t.status === st
                              ? 'bg-white text-black font-black'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CREATE TOURNAMENT MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white">Create New Tournament</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white text-xl">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Game</label>
                  <select
                    value={createForm.gameId}
                    onChange={(e) => setCreateForm({ ...createForm, gameId: parseInt(e.target.value) })}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value={1}>Free Fire</option>
                    <option value={2}>PUBG Mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Tournament Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Free Fire 48-Player BR Solo Survival #3"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Match Type</label>
                    <select
                      value={createForm.matchType}
                      onChange={(e) => setCreateForm({ ...createForm, matchType: e.target.value })}
                      className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="battle_royale">Battle Royale</option>
                      <option value="clash">Clash Squad / Duel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Format</label>
                    <select
                      value={createForm.format}
                      onChange={(e) => {
                        const fmt = e.target.value;
                        let teams = 48;
                        let perTeam = 1;
                        if (fmt === '1v1') { teams = 2; perTeam = 1; }
                        else if (fmt === '2v2') { teams = 2; perTeam = 2; }
                        else if (fmt === '4v4') { teams = 2; perTeam = 4; }
                        else if (fmt === 'duo') { teams = 24; perTeam = 2; }
                        else if (fmt === 'squad') { teams = 12; perTeam = 4; }
                        setCreateForm({
                          ...createForm,
                          format: fmt,
                          totalTeams: teams,
                          playersPerTeam: perTeam,
                          totalSlots: teams * perTeam,
                        });
                      }}
                      className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="solo">Solo (48 Players)</option>
                      <option value="duo">Duo (24 Teams)</option>
                      <option value="squad">Squad (12 Teams)</option>
                      <option value="1v1">1v1 Clash</option>
                      <option value="2v2">2v2 Clash</option>
                      <option value="4v4">4v4 Clash Squad</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Entry Fee (₹)</label>
                    <input
                      type="number"
                      required
                      value={createForm.entryFee}
                      onChange={(e) => setCreateForm({ ...createForm, entryFee: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Prize Pool (₹)</label>
                    <input
                      type="number"
                      required
                      value={createForm.prizePool}
                      onChange={(e) => setCreateForm({ ...createForm, prizePool: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Map</label>
                    <input
                      type="text"
                      value={createForm.mapName}
                      onChange={(e) => setCreateForm({ ...createForm, mapName: e.target.value })}
                      className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Match Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.matchStartAt}
                    onChange={(e) => setCreateForm({ ...createForm, matchStartAt: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg mt-2"
                >
                  Create Tournament Now
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
