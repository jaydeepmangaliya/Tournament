import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = Boolean(token && user?.role === 'admin');

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('war-room'); // 'war-room' | 'results' | 'withdrawals' | 'create' | 'players'

  // Data states
  const [tournaments, setTournaments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // War Room state
  const [credentials, setCredentials] = useState({});
  const [submittingCredId, setSubmittingCredId] = useState(null);
  const [expandedRosterId, setExpandedRosterId] = useState(null);
  const [copiedUIDsId, setCopiedUIDsId] = useState(null);

  // Match Results & Payout state
  const [selectedResultMatchId, setSelectedResultMatchId] = useState('');
  const [clashWinnerTeamId, setClashWinnerTeamId] = useState('');
  const [brRank1TeamId, setBrRank1TeamId] = useState('');
  const [brRank2TeamId, setBrRank2TeamId] = useState('');
  const [brRank3TeamId, setBrRank3TeamId] = useState('');
  const [killBounties, setKillBounties] = useState({}); // { [teamId]: killCount }

  // Withdrawals state
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [utrNumbers, setUtrNumbers] = useState({});
  const [copiedUpiId, setCopiedUpiId] = useState(null);

  // User search
  const [userSearch, setUserSearch] = useState('');

  // Create Tournament Form state
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

  // Verify Admin Authentication on Mount
  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }
    loadAllAdminData();
  }, [navigate]);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [tourneysRes, analyticsRes, withdrawalsRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tournaments`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/analytics`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/withdrawals`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, { headers }),
      ]);

      if (tourneysRes.data.status) {
        setTournaments(tourneysRes.data.data);
        const credMap = {};
        tourneysRes.data.data.forEach((t) => {
          credMap[t.id] = {
            roomId: t.room_id || '',
            roomPassword: t.room_password || '',
          };
        });
        setCredentials(credMap);
      }

      if (analyticsRes.data.status) setAnalytics(analyticsRes.data.data);
      if (withdrawalsRes.data.status) setWithdrawals(withdrawalsRes.data.data);
      if (usersRes.data.status) setUsers(usersRes.data.data);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login', { replace: true });
  };

  // 1. Room Credentials Dispatch
  const handleSaveCredentials = async (tournamentId) => {
    const cred = credentials[tournamentId];
    if (!cred?.roomId?.trim() || !cred?.roomPassword?.trim()) {
      alert('Please enter both Room ID and Room Password.');
      return;
    }

    try {
      setSubmittingCredId(tournamentId);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${tournamentId}/room-credentials`,
        { roomId: cred.roomId.trim(), roomPassword: cred.roomPassword.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setMessage(`Credentials published for Match #${tournamentId}! Players now see room credentials.`);
        setTimeout(() => setMessage(''), 4500);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update credentials.');
    } finally {
      setSubmittingCredId(null);
    }
  };

  // Copy all player UIDs to clipboard for in-game verification
  const handleCopyAllUIDs = (tournament) => {
    const uids = [];
    tournament.teams?.forEach((team) => {
      team.players?.forEach((p) => {
        if (p.in_game_id) uids.push(`Slot #${team.slot_number} | ${p.in_game_name}: ${p.in_game_id}`);
      });
    });

    if (uids.length === 0) {
      alert('No players registered in this tournament yet.');
      return;
    }

    navigator.clipboard.writeText(uids.join('\n'));
    setCopiedUIDsId(tournament.id);
    setTimeout(() => setCopiedUIDsId(null), 2000);
  };

  // 2. Finalize Results & Auto Payout
  const handleDeclareResults = async (e) => {
    e.preventDefault();
    if (!selectedResultMatchId) {
      alert('Please select a tournament to finalize.');
      return;
    }

    const match = tournaments.find((t) => t.id === parseInt(selectedResultMatchId));
    if (!match) return;

    const winners = [];
    const killList = [];

    if (match.match_type === 'clash') {
      if (!clashWinnerTeamId) {
        alert('Please select the winning team.');
        return;
      }
      winners.push({
        teamId: clashWinnerTeamId,
        rank: 1,
        prize: match.first_prize || match.prize_pool,
      });
    } else {
      // Battle Royale
      if (!brRank1TeamId) {
        alert('Please select at least the 1st Place (Booyah) winner.');
        return;
      }
      if (brRank1TeamId) winners.push({ teamId: brRank1TeamId, rank: 1, prize: match.first_prize });
      if (brRank2TeamId) winners.push({ teamId: brRank2TeamId, rank: 2, prize: match.second_prize });
      if (brRank3TeamId) winners.push({ teamId: brRank3TeamId, rank: 3, prize: match.third_prize });

      // Kill bounties
      Object.entries(killBounties).forEach(([teamId, count]) => {
        const k = parseInt(count || 0);
        if (k > 0) {
          killList.push({
            teamId,
            kills: k,
            bountyAmount: k * parseFloat(match.per_kill_prize || 0),
          });
        }
      });
    }

    if (!confirm(`Confirm payout? This will instantly credit winner wallets and complete Match #${selectedResultMatchId}.`)) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${selectedResultMatchId}/results`,
        { winners, killBounties: killList },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setMessage(res.data.message || 'Results finalized and prizes distributed!');
        setTimeout(() => setMessage(''), 5000);
        setSelectedResultMatchId('');
        setClashWinnerTeamId('');
        setBrRank1TeamId('');
        setBrRank2TeamId('');
        setBrRank3TeamId('');
        setKillBounties({});
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize results.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Withdrawals Approval & Rejection
  const handleApproveWithdrawal = async (withdrawalId) => {
    const utr = utrNumbers[withdrawalId]?.trim();
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/withdrawals/${withdrawalId}/approve`,
        { utrNumber: utr, adminRemark: 'UPI Transfer Completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setMessage(`Withdrawal #${withdrawalId} confirmed and approved.`);
        setTimeout(() => setMessage(''), 4000);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId) => {
    const reason = prompt('Enter rejection reason (money will be refunded to user wallet):', 'Incorrect UPI ID / Inactive VPA');
    if (!reason) return;

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/withdrawals/${withdrawalId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setMessage(`Withdrawal #${withdrawalId} rejected & refunded.`);
        setTimeout(() => setMessage(''), 4000);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyUPI = (upiId, id) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpiId(id);
    setTimeout(() => setCopiedUpiId(null), 1500);
  };

  // 4. Create Tournament Templates
  const applyTemplate = (type) => {
    const now = new Date();
    const plusTwoHours = new Date(now.getTime() + 7200000).toISOString().slice(0, 16);

    if (type === 'ff-solo-48') {
      setCreateForm({
        gameId: 1,
        title: 'Free Fire 48-Player BR Solo Survival',
        matchType: 'battle_royale',
        format: 'solo',
        mapName: 'Bermuda',
        totalSlots: 48,
        totalTeams: 48,
        playersPerTeam: 1,
        entryFee: 25,
        prizePool: 800,
        perKillPrize: 15,
        firstPrize: 400,
        secondPrize: 250,
        thirdPrize: 150,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'ff-duo-24') {
      setCreateForm({
        gameId: 1,
        title: 'Free Fire 48-Player BR Duo War',
        matchType: 'battle_royale',
        format: 'duo',
        mapName: 'Bermuda',
        totalSlots: 48,
        totalTeams: 24,
        playersPerTeam: 2,
        entryFee: 60,
        prizePool: 900,
        perKillPrize: 15,
        firstPrize: 500,
        secondPrize: 250,
        thirdPrize: 150,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'ff-cs-4v4') {
      setCreateForm({
        gameId: 1,
        title: 'Free Fire 4v4 Clash Squad Championship',
        matchType: 'clash',
        format: '4v4',
        mapName: 'Kalahari',
        totalSlots: 8,
        totalTeams: 2,
        playersPerTeam: 4,
        entryFee: 100,
        prizePool: 180,
        perKillPrize: 0,
        firstPrize: 180,
        secondPrize: 0,
        thirdPrize: 0,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'pubg-squad-12') {
      setCreateForm({
        gameId: 2,
        title: 'PUBG Mobile 48-Player BR Squad Battle',
        matchType: 'battle_royale',
        format: 'squad',
        mapName: 'Erangel',
        totalSlots: 48,
        totalTeams: 12,
        playersPerTeam: 4,
        entryFee: 200,
        prizePool: 1800,
        perKillPrize: 25,
        firstPrize: 1000,
        secondPrize: 500,
        thirdPrize: 300,
        matchStartAt: plusTwoHours,
      });
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/create`,
        createForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setMessage(`Tournament "${createForm.title}" created successfully!`);
        setTimeout(() => setMessage(''), 4500);
        setActiveTab('war-room');
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create tournament.');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Anti-Cheat & Ban Management
  const handleToggleBan = async (targetUser) => {
    const newStatus = targetUser.status === 'banned' ? 'active' : 'banned';
    if (!confirm(`Are you sure you want to ${newStatus === 'banned' ? 'BAN' : 'UNBAN'} user "${targetUser.name}"?`)) {
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${targetUser.id}/ban`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setMessage(`User status updated to ${newStatus.toUpperCase()}`);
        setTimeout(() => setMessage(''), 3000);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  if (!isAdmin) return null;

  const readyMatches = tournaments.filter((t) => t.is_ready_to_host || t.status === 'ready');
  const selectedMatch = tournaments.find((t) => t.id === parseInt(selectedResultMatchId));
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === 'all') return true;
    return w.status === withdrawalFilter;
  });
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.referral_code?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] pt-20 sm:pt-24 pb-20 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Console Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0a0a0f] p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Organizer Console
                </span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                  <span>Active Session</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white mt-0.5">
                LocalEsport <span className="text-silver">Command Center</span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="bg-[#121218] px-3 py-1.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Fees</span>
              <span className="font-mono font-black text-white">₹{analytics?.finances?.entryCollected || 0}</span>
            </div>
            <div className="bg-[#121218] px-3 py-1.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">House Net</span>
              <span className="font-mono font-black text-emerald-400">₹{analytics?.finances?.netProfit || 0}</span>
            </div>
            <div className="bg-[#121218] px-3 py-1.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Pending UPI</span>
              <span className="font-mono font-black text-amber-400">{analytics?.withdrawals?.pendingCount || 0} Req</span>
            </div>
            <button
              onClick={loadAllAdminData}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl transition"
              title="Refresh Telemetry"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l6.23-1.19" />
              </svg>
            </button>
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/80 rounded-xl font-bold transition flex items-center space-x-1"
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

        {/* Global Alert Notification */}
        {message && (
          <div className="p-3.5 bg-emerald-950/50 border border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* 5 Master Command Tabs */}
        <div className="flex overflow-x-auto space-x-2 p-1.5 bg-[#0a0a0f] border border-zinc-800 rounded-2xl scrollbar-none">
          {[
            { id: 'war-room', label: '1. War Room (Live Matches)', count: readyMatches.length ? `${readyMatches.length} READY` : null, alert: readyMatches.length > 0 },
            { id: 'results', label: '2. Results & Payouts' },
            { id: 'withdrawals', label: '3. Cashout Desk (UPI)', count: analytics?.withdrawals?.pendingCount || null, alert: (analytics?.withdrawals?.pendingCount || 0) > 0 },
            { id: 'create', label: '4. Tournament Launcher' },
            { id: 'players', label: '5. Players & Anti-Cheat', count: `${users.length}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  tab.alert
                    ? 'bg-amber-500 text-black animate-pulse'
                    : activeTab === tab.id
                    ? 'bg-zinc-200 text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: WAR ROOM (LIVE MATCH ORCHESTRATION & CREDENTIALS)      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'war-room' && (
          <div className="space-y-6">

            {/* PRIORITY ALERT: MATCHES FULL READY TO HOST */}
            {readyMatches.length > 0 && (
              <div className="bg-[#12121c] border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center space-x-2.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Action Required: Match 100% Full — Enter Custom Room Details
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  These lobbies reached full capacity. Players have paid and are waiting in-game for Room ID & Password.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {readyMatches.map((t) => (
                    <div key={t.id} className="bg-[#0c0c10] border border-amber-600/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                              FULL ({t.filled_teams}/{t.total_teams})
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">Match #{t.id} • {t.game_name}</span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-1 leading-snug">{t.title}</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
                          {t.format.toUpperCase()}
                        </span>
                      </div>

                      {/* Credentials Input */}
                      <div className="bg-[#14141d] p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                          Broadcast Custom Room to Registered Players:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Custom Room ID *</label>
                            <input
                              type="text"
                              placeholder="e.g. FF-849204"
                              value={credentials[t.id]?.roomId || ''}
                              onChange={(e) => setCredentials({
                                ...credentials,
                                [t.id]: { ...(credentials[t.id] || {}), roomId: e.target.value },
                              })}
                              className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Password *</label>
                            <input
                              type="text"
                              placeholder="e.g. 7788"
                              value={credentials[t.id]?.roomPassword || ''}
                              onChange={(e) => setCredentials({
                                ...credentials,
                                [t.id]: { ...(credentials[t.id] || {}), roomPassword: e.target.value },
                              })}
                              className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSaveCredentials(t.id)}
                            disabled={submittingCredId === t.id}
                            className="flex-1 py-2 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-lg transition hover:brightness-110 shadow-md disabled:opacity-50"
                          >
                            {submittingCredId === t.id ? 'Broadcasting...' : 'Broadcast Room to Players'}
                          </button>
                          <button
                            onClick={() => handleCopyAllUIDs(t)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition"
                          >
                            {copiedUIDsId === t.id ? 'UIDs Copied!' : 'Copy All UIDs'}
                          </button>
                          <button
                            onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                          >
                            {expandedRosterId === t.id ? 'Hide Roster' : `Roster (${t.teams?.length || 0})`}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Roster Inspector */}
                      {expandedRosterId === t.id && (
                        <div className="bg-[#08080c] p-3 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto space-y-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                            Roster Verification List:
                          </span>
                          {t.teams?.map((team) => (
                            <div key={team.id} className="p-2 bg-[#101016] rounded-lg border border-zinc-800 space-y-1">
                              <div className="flex justify-between items-center text-white">
                                <span className="font-bold">Slot #{team.slot_number}: {team.team_name}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">Captain: {team.leader_name} ({team.leader_phone || 'No Phone'})</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-zinc-300">
                                {team.players?.map((p) => (
                                  <div key={p.id} className="bg-black/50 px-2 py-0.5 rounded font-mono">
                                    {p.is_leader ? '[CAPTAIN] ' : ''}{p.in_game_name} ({p.in_game_id})
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

            {/* ALL ACTIVE & UPCOMING TOURNAMENTS */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white">All Scheduled Lobbies ({tournaments.length})</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((t) => (
                  <div key={t.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-lg">
                    <div>
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
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}>
                          {t.status === 'ready' ? 'READY (FULL)' : t.status.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-2 leading-snug">{t.title}</h3>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono mt-1">
                        <span>Map: {t.map_name}</span>
                        <span>•</span>
                        <span>Fee: ₹{t.entry_fee}</span>
                        <span>•</span>
                        <span>Pool: ₹{t.prize_pool}</span>
                      </div>

                      {/* Live Slots Counter */}
                      <div className="mt-3 bg-[#121218] p-2.5 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                        <span className="text-zinc-500 uppercase font-bold text-[10px]">Filled Seats:</span>
                        <span className="font-mono font-bold text-white">
                          {t.filled_teams} / {t.total_teams} {t.players_per_team > 1 ? 'Squads' : 'Slots'} ({t.remaining_teams} open)
                        </span>
                      </div>

                      {/* Quick credentials editor */}
                      <div className="mt-3 bg-[#14141d] p-2.5 rounded-xl border border-zinc-800 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                          Custom Room:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Room ID"
                            value={credentials[t.id]?.roomId || ''}
                            onChange={(e) => setCredentials({
                              ...credentials,
                              [t.id]: { ...(credentials[t.id] || {}), roomId: e.target.value },
                            })}
                            className="bg-[#0a0a0e] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Password"
                            value={credentials[t.id]?.roomPassword || ''}
                            onChange={(e) => setCredentials({
                              ...credentials,
                              [t.id]: { ...(credentials[t.id] || {}), roomPassword: e.target.value },
                            })}
                            className="bg-[#0a0a0e] border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="flex space-x-1.5 pt-0.5">
                          <button
                            onClick={() => handleSaveCredentials(t.id)}
                            disabled={submittingCredId === t.id}
                            className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            {t.has_credentials ? 'Update Room' : 'Set Room'}
                          </button>
                          <button
                            onClick={() => handleCopyAllUIDs(t)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold border border-zinc-800"
                          >
                            Copy UIDs
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Action:</span>
                      <button
                        onClick={() => {
                          setSelectedResultMatchId(t.id.toString());
                          setActiveTab('results');
                        }}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-bold transition"
                      >
                        Declare Result &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: RESULTS & ATOMIC WINNER PAYOUTS                        */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'results' && (
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Automated Cashout Pipeline
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Declare Match Results &amp; Instant Cash Payout</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                When you finalize a match, prizes and frag bounties are credited directly to the winning operatives' wallets in a single atomic database transaction.
              </p>
            </div>

            <form onSubmit={handleDeclareResults} className="space-y-6">
              {/* Select Match */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Select Completed Match *
                </label>
                <select
                  value={selectedResultMatchId}
                  onChange={(e) => setSelectedResultMatchId(e.target.value)}
                  className="w-full bg-[#121218] border border-zinc-700 focus:border-zinc-400 rounded-xl px-3.5 py-3 text-xs text-white"
                >
                  <option value="">-- Choose Match to Distribute Payouts --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} • {t.game_name} ({t.format.toUpperCase()}) — {t.title} [Status: {t.status}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatch && (
                <div className="space-y-6 p-4 sm:p-6 bg-[#121218] rounded-2xl border border-zinc-800">
                  {/* Match Snapshot */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0a0a0e] p-3 rounded-xl border border-zinc-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">1st Prize</span>
                      <span className="font-mono font-black text-white">₹{selectedMatch.first_prize || selectedMatch.prize_pool}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">2nd Prize</span>
                      <span className="font-mono font-black text-white">₹{selectedMatch.second_prize}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">3rd Prize</span>
                      <span className="font-mono font-black text-white">₹{selectedMatch.third_prize}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Kill Bounty</span>
                      <span className="font-mono font-black text-emerald-400">₹{selectedMatch.per_kill_prize}/kill</span>
                    </div>
                  </div>

                  {/* If Clash Match: Winner Picker */}
                  {selectedMatch.match_type === 'clash' ? (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Select Clash Winner (Takes Entire ₹{selectedMatch.prize_pool} Pool):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedMatch.teams?.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => setClashWinnerTeamId(team.id.toString())}
                            className={`p-4 rounded-xl border text-left transition ${
                              clashWinnerTeamId === team.id.toString()
                                ? 'bg-white text-black border-white shadow-xl font-bold'
                                : 'bg-[#14141e] border-zinc-800 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold block opacity-70">Slot #{team.slot_number}</span>
                            <span className="text-base font-black block mt-1">{team.team_name}</span>
                            <span className="text-xs opacity-80 block font-mono mt-0.5">Captain: {team.leader_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Battle Royale: 1st, 2nd, 3rd Rank + Kill Counts */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                            #1 Winner (Booyah) — ₹{selectedMatch.first_prize} *
                          </label>
                          <select
                            value={brRank1TeamId}
                            onChange={(e) => setBrRank1TeamId(e.target.value)}
                            className="w-full bg-[#0a0a0e] border border-amber-600/70 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          >
                            <option value="">-- Choose Slot --</option>
                            {selectedMatch.teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                Slot #{team.slot_number} ({team.team_name})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                            #2 Runner Up — ₹{selectedMatch.second_prize}
                          </label>
                          <select
                            value={brRank2TeamId}
                            onChange={(e) => setBrRank2TeamId(e.target.value)}
                            className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          >
                            <option value="">-- Choose Slot --</option>
                            {selectedMatch.teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                Slot #{team.slot_number} ({team.team_name})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            #3 Third Place — ₹{selectedMatch.third_prize}
                          </label>
                          <select
                            value={brRank3TeamId}
                            onChange={(e) => setBrRank3TeamId(e.target.value)}
                            className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          >
                            <option value="">-- Choose Slot --</option>
                            {selectedMatch.teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                Slot #{team.slot_number} ({team.team_name})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Per-Kill Frag Counters */}
                      {selectedMatch.per_kill_prize > 0 && (
                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Enter Frag Bounties (₹{selectedMatch.per_kill_prize} per confirmed kill):
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                            {selectedMatch.teams?.map((team) => (
                              <div key={team.id} className="bg-[#0a0a0e] p-2 rounded-lg border border-zinc-800 text-center">
                                <span className="text-[10px] font-bold text-zinc-400 block truncate">Slot #{team.slot_number}</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0 kills"
                                  value={killBounties[team.id] || ''}
                                  onChange={(e) => setKillBounties({
                                    ...killBounties,
                                    [team.id]: e.target.value,
                                  })}
                                  className="w-full bg-[#14141e] border border-zinc-700 rounded px-2 py-1 text-center font-mono text-xs text-white mt-1"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-widest rounded-xl transition hover:brightness-110 shadow-xl disabled:opacity-50"
                  >
                    {submitting ? 'Transferring Cash to Wallets...' : 'Finalize Match & Distribute Cash to Wallets'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 3: CASHOUT DESK (UPI WITHDRAWAL REQUESTS)                 */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">UPI &amp; Bank Cashout Desk</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Review and fulfill player/affiliate withdrawal requests. One-click copy UPI ID to transfer via Paytm/GPay.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-1.5 bg-[#0e0e13] p-1.5 rounded-xl border border-zinc-800 text-xs">
                {['all', 'pending', 'approved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setWithdrawalFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                      withdrawalFilter === st
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div className="p-12 text-center bg-[#0c0c10] border border-zinc-800 rounded-3xl text-zinc-400 text-xs">
                No withdrawal requests found for this filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWithdrawals.map((w) => (
                  <div key={w.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {w.role.toUpperCase()} CASHOUT #{w.id}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1">{w.user_name}</h3>
                        <span className="text-[11px] text-zinc-400 font-mono">{w.user_email} • {w.user_phone || 'No phone'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-white font-mono block">₹{w.amount}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block mt-1 ${
                          w.status === 'pending'
                            ? 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                            : w.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-red-950 text-red-300 border-red-800'
                        }`}>
                          {w.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Payment Destination Box */}
                    <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Payout Destination (UPI):</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(w.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-[#0a0a0e] p-2 rounded-lg border border-zinc-800">
                        <span className="font-mono font-bold text-white text-xs">{w.upi_id || `${w.bank_account_number} (${w.bank_ifsc})`}</span>
                        {w.upi_id && (
                          <button
                            onClick={() => copyUPI(w.upi_id, w.id)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold rounded uppercase tracking-wider"
                          >
                            {copiedUpiId === w.id ? 'COPIED' : 'COPY UPI'}
                          </button>
                        )}
                      </div>
                      {w.admin_remark && (
                        <span className="text-[10px] text-zinc-500 block pt-0.5">Remark: {w.admin_remark}</span>
                      )}
                    </div>

                    {/* Pending Action Bar */}
                    {w.status === 'pending' && (
                      <div className="space-y-2 pt-1 border-t border-zinc-800">
                        <input
                          type="text"
                          placeholder="Optional UPI UTR / Ref No (e.g. 4291847192)"
                          value={utrNumbers[w.id] || ''}
                          onChange={(e) => setUtrNumbers({ ...utrNumbers, [w.id]: e.target.value })}
                          className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveWithdrawal(w.id)}
                            disabled={submitting}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg transition"
                          >
                            Approve &amp; Mark Paid
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(w.id)}
                            disabled={submitting}
                            className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs uppercase tracking-wider rounded-lg border border-red-800"
                          >
                            Reject &amp; Refund
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 4: SCHEDULE & CREATE TOURNAMENT LAUNCHER                  */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'create' && (
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Lobby Scheduling &amp; Economics
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Tournament Launcher &amp; Rake Calculator</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Launch automated tournaments with custom prize pools or click a 1-click preset template below.
              </p>
            </div>

            {/* Quick 1-Click Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">1-Click Presets:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ff-solo-48', label: 'FF Solo BR 48', fee: '₹25/player' },
                  { id: 'ff-duo-24', label: 'FF Duo BR 24', fee: '₹60/team' },
                  { id: 'ff-cs-4v4', label: 'FF 4v4 Clash Squad', fee: '₹100/team' },
                  { id: 'pubg-squad-12', label: 'PUBG Squad BR 12', fee: '₹200/team' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className="p-3 bg-[#121218] hover:bg-[#181822] border border-zinc-800 hover:border-zinc-600 rounded-xl text-left transition"
                  >
                    <span className="text-xs font-bold text-white block">{tpl.label}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{tpl.fee}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Creator Form */}
            <form onSubmit={handleCreateTournament} className="space-y-4 pt-2 border-t border-zinc-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Free Fire 48-Player BR Solo Survival #4"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Game *</label>
                  <select
                    value={createForm.gameId}
                    onChange={(e) => setCreateForm({ ...createForm, gameId: parseInt(e.target.value) })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={1}>Free Fire</option>
                    <option value={2}>PUBG Mobile</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Match Type</label>
                  <select
                    value={createForm.matchType}
                    onChange={(e) => setCreateForm({ ...createForm, matchType: e.target.value })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="solo">Solo (48 Players)</option>
                    <option value="duo">Duo (24 Teams)</option>
                    <option value="squad">Squad (12 Teams)</option>
                    <option value="1v1">1v1 Clash</option>
                    <option value="2v2">2v2 Clash</option>
                    <option value="4v4">4v4 Clash Squad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Map</label>
                  <input
                    type="text"
                    value={createForm.mapName}
                    onChange={(e) => setCreateForm({ ...createForm, mapName: e.target.value })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.matchStartAt}
                    onChange={(e) => setCreateForm({ ...createForm, matchStartAt: e.target.value })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Financial Structure */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#08080c] p-3.5 rounded-2xl border border-zinc-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Entry Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={createForm.entryFee}
                    onChange={(e) => setCreateForm({ ...createForm, entryFee: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Total Pool (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={createForm.prizePool}
                    onChange={(e) => setCreateForm({ ...createForm, prizePool: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">1st Prize (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.firstPrize}
                    onChange={(e) => setCreateForm({ ...createForm, firstPrize: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">2nd Prize (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.secondPrize}
                    onChange={(e) => setCreateForm({ ...createForm, secondPrize: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Per Kill (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.perKillPrize}
                    onChange={(e) => setCreateForm({ ...createForm, perKillPrize: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Live House Rake Preview */}
              <div className="p-3 bg-[#121218] rounded-xl border border-zinc-800 text-xs flex justify-between items-center font-mono">
                <span>
                  Expected Inflow: <strong className="text-white">₹{createForm.entryFee * createForm.totalTeams}</strong> ({createForm.totalTeams} teams @ ₹{createForm.entryFee})
                </span>
                <span>
                  Platform Rake Margin: <strong className="text-emerald-400">₹{(createForm.entryFee * createForm.totalTeams) - createForm.prizePool}</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-widest rounded-xl transition hover:brightness-110 shadow-xl"
              >
                {submitting ? 'Creating Lobby...' : 'Launch Tournament Now'}
              </button>
            </form>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 5: PLAYERS & ANTI-CHEAT AUDIT                             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Players &amp; Anti-Cheat</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Audit operative balances, matches joined, and enforce emulator / cheat bans.
                </p>
              </div>

              <input
                type="text"
                placeholder="Search by name, email, phone, code..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white w-full sm:w-72 font-mono"
              />
            </div>

            <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121218] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Operative</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Total Balance</th>
                      <th className="py-3 px-4">Matches</th>
                      <th className="py-3 px-4">Total Entry</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <strong className="text-white block">{u.name}</strong>
                          <span className="text-[11px] text-zinc-400 font-mono">{u.email}</span>
                          <span className="text-[10px] text-zinc-500 font-mono block">Code: {u.referral_code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          ₹{u.total_balance}
                          <span className="text-[10px] text-zinc-500 block font-normal">
                            Dep ₹{u.deposit_balance} • Win ₹{u.winning_balance}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-300">
                          {u.total_tournaments_played}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-300">
                          ₹{u.total_entry_spent}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block ${
                            u.status === 'banned'
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleBan(u)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                              u.status === 'banned'
                                ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                                : 'bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800'
                            }`}
                          >
                            {u.status === 'banned' ? 'Lift Ban' : 'Ban User'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
