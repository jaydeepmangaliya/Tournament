import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Strict isolated admin authentication storage
  const adminToken = localStorage.getItem('admin_token');
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const isAdmin = Boolean(adminToken && adminUser?.role === 'admin');

  // Active Navigation Tab
  // 'ready' | 'open' | 'ongoing' | 'completed' | 'results' | 'withdrawals' | 'players' | 'create'
  const [activeTab, setActiveTab] = useState('ready');

  // Data states
  const [tournaments, setTournaments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tournament Management states
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

  // User Management state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'player',
    status: 'active',
    referral_code: '',
    deposit_balance: 0,
    winning_balance: 0,
    referral_balance: 0,
  });

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
    entryFee: 25,
    prizePool: 800,
    perKillPrize: 15,
    firstPrize: 400,
    secondPrize: 250,
    thirdPrize: 150,
    matchStartAt: '',
  });

  // Verify Admin Authentication on Mount
  useEffect(() => {
    if (!adminToken || adminUser?.role !== 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }
    loadAllAdminData();
  }, [navigate]);

  const loadAllAdminData = async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${adminToken}` };

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
      console.error('Failed to load admin data:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate('/admin/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
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
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data.status) {
        setMessage(`Credentials published for Match #${tournamentId}! Status moved to ONGOING and visible to registered players.`);
        setTimeout(() => setMessage(''), 5000);
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
      alert('No player UIDs found for this tournament yet.');
      return;
    }

    navigator.clipboard.writeText(uids.join('\n'));
    setCopiedUIDsId(tournament.id);
    setTimeout(() => setCopiedUIDsId(null), 2500);
  };

  // Remove team from tournament slot with fee refund
  const handleRemoveTeam = async (tournamentId, team) => {
    const confirmRemove = window.confirm(
      `Remove team "${team.team_name}" from Slot #${team.slot_number}?\n\nTheir entry fee will be refunded back to the player's wallet, and the slot will be reopened.`
    );
    if (!confirmRemove) return;

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${tournamentId}/teams/${team.id}`,
        { headers }
      );
      if (res.data.status) {
        setMessage(res.data.message || `Team removed and refunded.`);
        setTimeout(() => setMessage(''), 4500);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove team.');
    }
  };

  // Delete entire tournament lobby
  const handleDeleteTournament = async (t) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE Tournament #${t.id} ("${t.title}")?\n\nAny registered players will have their entry fees refunded immediately to their wallets.`
    );
    if (!confirmDelete) return;

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${t.id}`,
        { headers }
      );
      if (res.data.status) {
        setMessage(res.data.message || `Tournament #${t.id} deleted successfully.`);
        setTimeout(() => setMessage(''), 4500);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete tournament.');
    }
  };

  // 2. Finalize Results & Trigger Automated Atomic Payouts
  const handleDeclareResults = async (e) => {
    e.preventDefault();
    if (!selectedResultMatchId) {
      alert('Please select a tournament to finalize results.');
      return;
    }

    const match = tournaments.find((t) => t.id === parseInt(selectedResultMatchId));
    if (!match) return;

    const winners = [];
    const killList = [];

    if (match.match_type === 'clash') {
      if (!clashWinnerTeamId) {
        alert('Please select the winning squad.');
        return;
      }
      winners.push({
        teamId: clashWinnerTeamId,
        rank: 1,
        prize: match.first_prize || match.prize_pool,
      });
    } else {
      if (!brRank1TeamId) {
        alert('Please select Rank 1 (Booyah Team).');
        return;
      }
      winners.push({ teamId: brRank1TeamId, rank: 1, prize: match.first_prize });
      if (brRank2TeamId && brRank2TeamId !== brRank1TeamId) {
        winners.push({ teamId: brRank2TeamId, rank: 2, prize: match.second_prize });
      }
      if (brRank3TeamId && brRank3TeamId !== brRank1TeamId && brRank3TeamId !== brRank2TeamId) {
        winners.push({ teamId: brRank3TeamId, rank: 3, prize: match.third_prize });
      }

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
        { headers: { Authorization: `Bearer ${adminToken}` } }
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
        { headers: { Authorization: `Bearer ${adminToken}` } }
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
        { headers: { Authorization: `Bearer ${adminToken}` } }
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
    if (!createForm.title || !createForm.matchStartAt) {
      alert('Please fill in title and match start time.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/create`,
        createForm,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data.status) {
        setMessage(`Tournament created successfully!`);
        setTimeout(() => setMessage(''), 4500);
        setActiveTab('open');
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create tournament.');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Superuser User & Affiliate Management
  const handleToggleBan = async (targetUser) => {
    const newStatus = targetUser.status === 'banned' ? 'active' : 'banned';
    const confirmAction = window.confirm(
      `Are you sure you want to ${newStatus.toUpperCase()} user ${targetUser.name} (#${targetUser.id})?`
    );
    if (!confirmAction) return;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${targetUser.id}/ban`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data.status) {
        setMessage(res.data.message);
        setTimeout(() => setMessage(''), 4000);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ban status.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const confirmDelete = window.confirm(
      `DANGER: Are you sure you want to completely DELETE user "${targetUser.name}" (ID #${targetUser.id})?\n\nThis will remove their profile, wallet, registrations, and transactions permanently.`
    );
    if (!confirmDelete) return;

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${targetUser.id}`,
        { headers }
      );
      if (res.data.status) {
        setMessage(res.data.message || `User #${targetUser.id} deleted successfully.`);
        setTimeout(() => setMessage(''), 4500);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setEditFormData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'player',
      status: u.status || 'active',
      referral_code: u.referral_code || '',
      deposit_balance: parseFloat(u.deposit_balance || 0),
      winning_balance: parseFloat(u.winning_balance || 0),
      referral_balance: parseFloat(u.referral_balance || 0),
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser.id}`,
        editFormData,
        { headers }
      );
      if (res.data.status) {
        setMessage(`User #${editingUser.id} updated successfully!`);
        setTimeout(() => setMessage(''), 4500);
        setEditingUser(null);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered categories
  const readyMatches = tournaments.filter(
    (t) => t.status === 'ready' || (t.filled_teams >= t.total_teams && (!t.room_id || !t.room_password))
  );
  const openMatches = tournaments.filter(
    (t) => t.status === 'open' && t.filled_teams < t.total_teams
  );
  const ongoingMatches = tournaments.filter((t) => t.status === 'ongoing');
  const completedMatches = tournaments.filter((t) => t.status === 'completed');

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === 'all') return true;
    return w.status === withdrawalFilter;
  });

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone?.includes(userSearch) ||
      u.referral_code?.toLowerCase().includes(userSearch.toLowerCase());

    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const tabs = [
    {
      id: 'ready',
      label: '1. Ready to Match (Full)',
      count: readyMatches.length ? `${readyMatches.length} READY` : null,
      alert: readyMatches.length > 0,
    },
    {
      id: 'open',
      label: '2. Available Lobbies',
      count: `${openMatches.length} OPEN`,
    },
    {
      id: 'ongoing',
      label: '3. Live Ongoing',
      count: ongoingMatches.length ? `${ongoingMatches.length} LIVE` : null,
      alert: ongoingMatches.length > 0,
    },
    {
      id: 'completed',
      label: '4. Finished Matches',
      count: `${completedMatches.length}`,
    },
    {
      id: 'results',
      label: '5. Declare Results & Payouts',
    },
    {
      id: 'withdrawals',
      label: '6. Cashout Desk (UPI)',
      count: analytics?.withdrawals?.pendingCount || null,
      alert: (analytics?.withdrawals?.pendingCount || 0) > 0,
    },
    {
      id: 'players',
      label: '7. Players & Affiliates',
      count: `${users.length}`,
    },
    {
      id: 'create',
      label: '8. Create Tournament',
    },
  ];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-3 border-zinc-700 border-t-white rounded-full animate-spin" />
        <span className="text-xs uppercase font-mono tracking-widest text-zinc-400">
          Loading Organizer Console...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] antialiased">
      {/* 1. DEDICATED ISOLATED TOPBAR (NEVER INTERFERES WITH PLAYER SITE) */}
      <nav className="sticky top-0 z-40 bg-[#08080c]/95 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-7xl mx-auto">
          {/* Brand & Admin Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white tracking-wider">LOCALESPORT</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-[9px] font-black uppercase text-amber-300 tracking-wider">
                  Superuser Console
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-zinc-300">{adminUser?.email || 'admin@localesport.com'}</span>
              </div>
            </div>
          </div>

          {/* Real-time Financial Turnover Tickers & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-[#101016] border border-zinc-800 flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Fees</span>
              <span className="text-xs font-mono font-bold text-white">
                ₹{analytics?.finances?.entryCollected?.toLocaleString('en-IN') || 0}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#101016] border border-zinc-800 flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">House Net</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ₹{analytics?.finances?.netProfit?.toLocaleString('en-IN') || 0}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#101016] border border-zinc-800 flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Pending UPI</span>
              <span className={`text-xs font-mono font-bold ${
                (analytics?.withdrawals?.pendingCount || 0) > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'
              }`}>
                {analytics?.withdrawals?.pendingCount || 0} Req
              </span>
            </div>

            {/* Refresh Data Button */}
            <button
              onClick={loadAllAdminData}
              title="Refresh Data"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>

            {/* Open Website in New Window for Testing */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] font-bold text-zinc-300 hover:text-white transition flex items-center space-x-1"
            >
              <span>View Player Site</span>
              <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            {/* Admin Sign Out */}
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/60 hover:bg-red-900/50 text-[11px] font-bold text-red-300 transition flex items-center space-x-1"
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
      </nav>

      {/* 2. MAIN ADMIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global Toast Alert Notification */}
        {message && (
          <div className="p-3.5 bg-emerald-950/50 border border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg">
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* 3. MASTER TOURNAMENT STATUS TABS */}
        <div className="flex overflow-x-auto space-x-2 p-1.5 bg-[#0c0c12] border border-zinc-800 rounded-2xl scrollbar-none shadow-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    tab.alert
                      ? 'bg-amber-500 text-black animate-pulse'
                      : activeTab === tab.id
                      ? 'bg-zinc-200 text-black'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: READY TO MATCH (FULL CAPACITY REACHED - SCHEDULE & ROOM CREDS)     */}
        {/* ========================================================================= */}
        {activeTab === 'ready' && (
          <div className="space-y-6">
            <div className="bg-[#12121c] border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
                </span>
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Ready to Match (100% Full Lobbies) — Enter Custom Room Details
                </h2>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                These lobbies reached full capacity (48/48 players or all squad slots booked). Players have paid and are waiting for the Custom Room ID & Password. Once broadcasted, credentials immediately appear on player screens and status transitions to Live Ongoing.
              </p>

              {readyMatches.length === 0 ? (
                <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-2">
                  <svg className="w-8 h-8 text-zinc-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <p className="text-xs text-zinc-400 font-bold">No lobbies currently waiting for credentials.</p>
                  <p className="text-[11px] text-zinc-500">
                    Matches automatically move into this tab the moment player registrations hit 100% capacity.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {readyMatches.map((t) => (
                    <div key={t.id} className="bg-[#0c0c10] border border-amber-600/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                              FULL ({t.filled_teams}/{t.total_teams})
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">Match #{t.id} • {t.game_name}</span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-1 leading-snug">{t.title}</h3>
                          <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                            <span>Map: {t.map_name}</span>
                            <span>•</span>
                            <span>Fee: ₹{t.entry_fee}</span>
                            <span>•</span>
                            <span>Pool: ₹{t.prize_pool}</span>
                          </div>
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
                              onChange={(e) =>
                                setCredentials({
                                  ...credentials,
                                  [t.id]: { ...(credentials[t.id] || {}), roomId: e.target.value },
                                })
                              }
                              className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Password *</label>
                            <input
                              type="text"
                              placeholder="e.g. 7788"
                              value={credentials[t.id]?.roomPassword || ''}
                              onChange={(e) =>
                                setCredentials({
                                  ...credentials,
                                  [t.id]: { ...(credentials[t.id] || {}), roomPassword: e.target.value },
                                })
                              }
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
                            {expandedRosterId === t.id ? 'Hide Slots' : `Roster Slots (${t.teams?.length || 0})`}
                          </button>
                          <button
                            onClick={() => handleDeleteTournament(t)}
                            title="Delete tournament and refund all players"
                            className="p-2 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg border border-red-800/80 transition"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Roster Slot Inspector */}
                      {expandedRosterId === t.id && (
                        <div className="bg-[#08080c] p-3 rounded-xl border border-zinc-800 max-h-72 overflow-y-auto space-y-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                            Booked Slot Roster (Kick team to reopen slot):
                          </span>
                          {t.teams?.map((team) => (
                            <div key={team.id} className="p-2.5 bg-[#101016] rounded-lg border border-zinc-800 space-y-1.5">
                              <div className="flex justify-between items-center text-white">
                                <div className="flex items-center space-x-2">
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono font-bold text-[10px] text-amber-300">
                                    Slot #{team.slot_number}
                                  </span>
                                  <span className="font-bold">{team.team_name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    Captain: {team.leader_name} ({team.leader_phone || 'No Phone'})
                                  </span>
                                  <button
                                    onClick={() => handleRemoveTeam(t.id, team)}
                                    className="px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-800 text-[10px] font-bold text-red-200 border border-red-700 transition"
                                  >
                                    Kick & Refund
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-zinc-300">
                                {team.players?.map((p) => (
                                  <div key={p.id} className="bg-black/50 px-2 py-0.5 rounded font-mono">
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
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AVAILABLE LOBBIES (OPEN SEATS - PLAYERS CURRENTLY JOINING)          */}
        {/* ========================================================================= */}
        {activeTab === 'open' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">Available Open Lobbies ({openMatches.length})</h2>
                <p className="text-xs text-zinc-400">
                  Lobbies currently open on the platform. Players can pick open slots (#1 to #48).
                </p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="px-3 py-1.5 rounded-xl bg-silver-gradient text-black font-black text-xs uppercase tracking-wider transition hover:brightness-110 flex items-center space-x-1"
              >
                <span>+ Create Tournament</span>
              </button>
            </div>

            {openMatches.length === 0 ? (
              <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-3">
                <p className="text-xs text-zinc-400">No open tournaments currently accepting registrations.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Launch a New Tournament
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openMatches.map((t) => {
                  const percentFilled = Math.min(100, Math.round((t.filled_teams / t.total_teams) * 100));
                  return (
                    <div key={t.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-lg">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {t.game_name} • {t.format.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            OPEN REGISTRATION
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

                        {/* Live Slots Capacity Bar */}
                        <div className="mt-3 bg-[#121218] p-3 rounded-xl border border-zinc-800 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 uppercase font-bold text-[10px]">Seat Capacity:</span>
                            <span className="font-mono font-bold text-white">
                              {t.filled_teams} / {t.total_teams} ({t.remaining_teams} seats open)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${percentFilled}%` }}
                            />
                          </div>
                        </div>

                        {/* Pre-enter credentials or quick options */}
                        <div className="mt-3 bg-[#14141d] p-2.5 rounded-xl border border-zinc-800 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                            Preload Room Credentials:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Room ID"
                              value={credentials[t.id]?.roomId || ''}
                              onChange={(e) =>
                                setCredentials({
                                  ...credentials,
                                  [t.id]: { ...(credentials[t.id] || {}), roomId: e.target.value },
                                })
                              }
                              className="bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Password"
                              value={credentials[t.id]?.roomPassword || ''}
                              onChange={(e) =>
                                setCredentials({
                                  ...credentials,
                                  [t.id]: { ...(credentials[t.id] || {}), roomPassword: e.target.value },
                                })
                              }
                              className="bg-[#0a0a0e] border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveCredentials(t.id)}
                            className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition"
                          >
                            Save Credentials
                          </button>
                          <button
                            onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                          >
                            {expandedRosterId === t.id ? 'Hide' : `Roster (${t.teams?.length || 0})`}
                          </button>
                          <button
                            onClick={() => handleDeleteTournament(t)}
                            title="Delete Lobby"
                            className="p-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg border border-red-800/80 transition"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>

                        {/* Expandable Roster Slot Inspector */}
                        {expandedRosterId === t.id && (
                          <div className="bg-[#08080c] p-2.5 rounded-xl border border-zinc-800 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                              Booked Teams:
                            </span>
                            {t.teams?.length === 0 ? (
                              <p className="text-[11px] text-zinc-500">No slots booked yet.</p>
                            ) : (
                              t.teams?.map((team) => (
                                <div key={team.id} className="p-1.5 bg-[#101016] rounded border border-zinc-800 flex justify-between items-center">
                                  <span className="font-mono text-[11px] text-white">
                                    Slot #{team.slot_number}: {team.team_name} ({team.leader_name})
                                  </span>
                                  <button
                                    onClick={() => handleRemoveTeam(t.id, team)}
                                    className="px-1.5 py-0.5 rounded bg-red-950 hover:bg-red-800 text-[9px] font-bold text-red-300"
                                  >
                                    Kick
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE ONGOING MATCHES (IN PROGRESS)                                 */}
        {/* ========================================================================= */}
        {activeTab === 'ongoing' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Live Ongoing Matches ({ongoingMatches.length})</h2>
              <p className="text-xs text-zinc-400">
                Matches currently playing with room credentials dispatched. Once the match finishes in-game, click "Declare Winners & Payouts" to finalize.
              </p>
            </div>

            {ongoingMatches.length === 0 ? (
              <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-2">
                <svg className="w-8 h-8 text-zinc-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <p className="text-xs text-zinc-400 font-bold">No matches are currently ongoing.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ongoingMatches.map((t) => (
                  <div key={t.id} className="bg-[#0c0c10] border border-blue-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-xl">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {t.game_name} • {t.format.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 animate-pulse">
                          LIVE IN-GAME
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-2 leading-snug">{t.title}</h3>

                      {/* Active Room Info */}
                      <div className="mt-3 bg-[#14141f] p-3 rounded-xl border border-blue-800/40 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Room ID:</span>
                          <span className="font-mono font-bold text-white">{t.room_id || 'Not Set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Password:</span>
                          <span className="font-mono font-bold text-white">{t.room_password || 'Not Set'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => {
                          setSelectedResultMatchId(t.id.toString());
                          setActiveTab('results');
                        }}
                        className="w-full py-2 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-lg transition hover:brightness-110 shadow-md"
                      >
                        Declare Winners & Payouts
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyAllUIDs(t)}
                          className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                        >
                          {copiedUIDsId === t.id ? 'UIDs Copied!' : 'Copy UIDs'}
                        </button>
                        <button
                          onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                        >
                          {expandedRosterId === t.id ? 'Hide' : `Roster (${t.teams?.length || 0})`}
                        </button>
                      </div>

                      {expandedRosterId === t.id && (
                        <div className="bg-[#08080c] p-2.5 rounded-xl border border-zinc-800 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                          {t.teams?.map((team) => (
                            <div key={team.id} className="p-1.5 bg-[#101016] rounded border border-zinc-800 text-[11px] text-zinc-300">
                              <span className="font-bold text-white">Slot #{team.slot_number}: {team.team_name}</span>
                              <div className="font-mono text-[10px] text-zinc-400">
                                {team.players?.map((p) => p.in_game_name + ' (' + p.in_game_id + ')').join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FINISHED MATCHES (WINNERS & HISTORY AUDIT)                         */}
        {/* ========================================================================= */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Finished Matches ({completedMatches.length})</h2>
              <p className="text-xs text-zinc-400">
                Matches that have been finalized and prize amounts credited to player wallets.
              </p>
            </div>

            {completedMatches.length === 0 ? (
              <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-2">
                <svg className="w-8 h-8 text-zinc-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="text-xs text-zinc-400 font-bold">No completed matches recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedMatches.map((t) => (
                  <div key={t.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-lg">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {t.game_name} • {t.format.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                          COMPLETED
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-2 leading-snug">{t.title}</h3>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono mt-1">
                        <span>Map: {t.map_name}</span>
                        <span>•</span>
                        <span>Fee: ₹{t.entry_fee}</span>
                        <span>•</span>
                        <span>Prize Pool: ₹{t.prize_pool}</span>
                      </div>

                      <div className="mt-3 bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Filled Teams:</span>
                          <span className="font-mono font-bold text-white">{t.filled_teams} / {t.total_teams}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Room ID / Pass:</span>
                          <span className="font-mono text-zinc-300">{t.room_id || 'N/A'} / {t.room_password || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-bold">Prizes Distributed</span>
                      <button
                        onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                      >
                        {expandedRosterId === t.id ? 'Hide Roster' : `Roster (${t.teams?.length || 0})`}
                      </button>
                    </div>

                    {expandedRosterId === t.id && (
                      <div className="bg-[#08080c] p-2.5 rounded-xl border border-zinc-800 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                        {t.teams?.map((team) => (
                          <div key={team.id} className="p-1.5 bg-[#101016] rounded border border-zinc-800 text-[11px] text-zinc-300">
                            <span className="font-bold text-white">Slot #{team.slot_number}: {team.team_name}</span>
                            <div className="font-mono text-[10px] text-zinc-400">
                              Captain: {team.leader_name} ({team.leader_phone || 'N/A'})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DECLARE RESULTS & AUTOMATED PRIZE PAYOUT                           */}
        {/* ========================================================================= */}
        {activeTab === 'results' && (
          <div className="max-w-3xl mx-auto bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 block">
                Automated Settlement
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Declare Match Winners & <span className="text-silver">Atomic Payouts</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select the tournament and assign Rank 1 (Booyah), 2, 3, plus per-kill counts. Cash prizes will be transferred directly into winner wallets instantaneously.
              </p>
            </div>

            <form onSubmit={handleDeclareResults} className="space-y-5">
              {/* Select Tournament */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Select Match to Finalize *
                </label>
                <select
                  value={selectedResultMatchId}
                  onChange={(e) => {
                    setSelectedResultMatchId(e.target.value);
                    setClashWinnerTeamId('');
                    setBrRank1TeamId('');
                    setBrRank2TeamId('');
                    setBrRank3TeamId('');
                    setKillBounties({});
                  }}
                  className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                >
                  <option value="">-- Choose Live or Ready Tournament --</option>
                  {tournaments
                    .filter((t) => t.status !== 'completed')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Match #{t.id} • {t.title} ({t.format.toUpperCase()} - {t.filled_teams} Teams)
                      </option>
                    ))}
                </select>
              </div>

              {/* Dynamic Winner Selection */}
              {selectedResultMatchId && (() => {
                const match = tournaments.find((t) => t.id === parseInt(selectedResultMatchId));
                if (!match) return null;

                const matchTeams = match.teams || [];

                if (matchTeams.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800 text-amber-300 text-xs">
                      No teams registered in this tournament yet. Cannot finalize empty tournament.
                    </div>
                  );
                }

                if (match.match_type === 'clash') {
                  return (
                    <div className="space-y-4 p-4 rounded-2xl bg-[#121218] border border-zinc-800">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Clash Squad (4v4) Winner
                      </span>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          Winning Team (Receives ₹{match.first_prize || match.prize_pool}) *
                        </label>
                        <select
                          value={clashWinnerTeamId}
                          onChange={(e) => setClashWinnerTeamId(e.target.value)}
                          className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="">-- Select Winner --</option>
                          {matchTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              Slot #{team.slot_number}: {team.team_name} (Captain: {team.leader_name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-5 p-5 rounded-2xl bg-[#121218] border border-zinc-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Battle Royale Rank Positions
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                          Rank #1 Booyah (₹{match.first_prize}) *
                        </label>
                        <select
                          value={brRank1TeamId}
                          onChange={(e) => setBrRank1TeamId(e.target.value)}
                          className="w-full bg-[#0a0a0e] border border-amber-600/50 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="">-- Select 1st --</option>
                          {matchTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              Slot #{team.slot_number}: {team.team_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-300 block mb-1">
                          Rank #2 Runner-up (₹{match.second_prize})
                        </label>
                        <select
                          value={brRank2TeamId}
                          onChange={(e) => setBrRank2TeamId(e.target.value)}
                          className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="">-- Select 2nd --</option>
                          {matchTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              Slot #{team.slot_number}: {team.team_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-amber-700 block mb-1">
                          Rank #3 (₹{match.third_prize})
                        </label>
                        <select
                          value={brRank3TeamId}
                          onChange={(e) => setBrRank3TeamId(e.target.value)}
                          className="w-full bg-[#0a0a0e] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        >
                          <option value="">-- Select 3rd --</option>
                          {matchTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              Slot #{team.slot_number}: {team.team_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Per-Kill Frag Bounties */}
                    {parseFloat(match.per_kill_prize || 0) > 0 && (
                      <div className="pt-3 border-t border-zinc-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">
                            Frag Bounties (@ ₹{match.per_kill_prize} / kill):
                          </span>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-[#0a0a0e] rounded-xl border border-zinc-800">
                          {matchTeams.map((team) => (
                            <div key={team.id} className="flex justify-between items-center text-xs px-2 py-1 bg-[#121218] rounded">
                              <span className="font-mono text-zinc-300">
                                Slot #{team.slot_number}: {team.team_name}
                              </span>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] text-zinc-500">Kills:</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={killBounties[team.id] || ''}
                                  onChange={(e) =>
                                    setKillBounties({
                                      ...killBounties,
                                      [team.id]: e.target.value,
                                    })
                                  }
                                  className="w-16 bg-black border border-zinc-700 rounded px-2 py-0.5 text-center font-mono text-white text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={submitting || !selectedResultMatchId}
                className="w-full py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Executing Atomic Wallet Payouts...' : 'Finalize Match & Payout Wallets Instantly'}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CASHOUT DESK (UPI WITHDRAWALS)                                     */}
        {/* ========================================================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">UPI Cashout Desk ({withdrawals.length})</h2>
                <p className="text-xs text-zinc-400">
                  Manage player winning balance withdrawals. Transfer funds to their UPI ID, enter UTR number, and approve.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex space-x-1 p-1 bg-[#0c0c10] border border-zinc-800 rounded-xl text-xs">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setWithdrawalFilter(f)}
                    className={`px-3 py-1 rounded-lg uppercase font-bold text-[10px] transition ${
                      withdrawalFilter === f ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl">
                <p className="text-xs text-zinc-400">No withdrawal requests matching the selected filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWithdrawals.map((w) => (
                  <div key={w.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-lg">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-mono text-zinc-400">Req #{w.id}</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            w.status === 'pending'
                              ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                              : w.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-red-950 text-red-300 border-red-800'
                          }`}
                        >
                          {w.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-2">
                        <span className="text-2xl font-black text-white font-mono">₹{w.amount}</span>
                        <p className="text-xs font-bold text-zinc-300 mt-1">{w.user_name} ({w.user_phone || 'No Phone'})</p>
                        <p className="text-[11px] text-zinc-500 font-mono">{w.user_email}</p>
                      </div>

                      {/* UPI ID Card */}
                      <div className="mt-3 bg-[#121218] p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                        <span className="font-mono text-zinc-200 select-all font-bold">{w.upi_id}</span>
                        <button
                          onClick={() => copyUPI(w.upi_id, w.id)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded transition"
                        >
                          {copiedUpiId === w.id ? 'Copied!' : 'Copy UPI'}
                        </button>
                      </div>
                    </div>

                    {/* Pending Action Bar */}
                    {w.status === 'pending' ? (
                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <input
                          type="text"
                          placeholder="Bank UTR / Ref Number"
                          value={utrNumbers[w.id] || ''}
                          onChange={(e) => setUtrNumbers({ ...utrNumbers, [w.id]: e.target.value })}
                          className="w-full bg-[#121218] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveWithdrawal(w.id)}
                            disabled={submitting}
                            className="flex-1 py-1.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-lg transition hover:brightness-110 shadow disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(w.id)}
                            disabled={submitting}
                            className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-bold rounded-lg border border-red-800 transition disabled:opacity-50"
                          >
                            Reject & Refund
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono">
                        Remark: {w.admin_remark || 'Processed'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PLAYERS & AFFILIATES (SUPERUSER AUTHORITY & USER EDITING)          */}
        {/* ========================================================================= */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Players & Affiliates Directory ({users.length})</h2>
                <p className="text-xs text-zinc-400">
                  Superuser management: Search, edit balance/role, ban/unban, or delete accounts completely.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search name, phone, code..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-[#121218] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono w-48 sm:w-60"
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-[#121218] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none font-mono"
                >
                  <option value="all">All Roles</option>
                  <option value="player">Players</option>
                  <option value="affiliate">Affiliates</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            {/* Comprehensive Superuser Table */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#121218] border-b border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Deposit Bal</th>
                      <th className="py-3 px-3">Winning Bal</th>
                      <th className="py-3 px-3">Affiliate Bal</th>
                      <th className="py-3 px-3">Tournaments</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-900/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-sans font-bold text-white text-xs">{u.name}</div>
                          <div className="text-[11px] text-zinc-400">{u.email}</div>
                          <div className="text-[10px] text-zinc-500">{u.phone || 'No phone'} • Ref: {u.referral_code || 'None'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : u.role === 'affiliate'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.status === 'banned'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-white">₹{u.deposit_balance}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">₹{u.winning_balance}</td>
                        <td className="py-3 px-3 font-bold text-amber-400">₹{u.referral_balance}</td>
                        <td className="py-3 px-3 text-zinc-400">
                          {u.total_tournaments_played || 0} (₹{u.total_entry_spent})
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5 font-sans">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Edit User Details & Balance"
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold rounded transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleBan(u)}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                                u.status === 'banned'
                                  ? 'bg-emerald-950 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                                  : 'bg-amber-950 hover:bg-amber-800 text-amber-200 border border-amber-700'
                              }`}
                            >
                              {u.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Delete user completely"
                                className="p-1 bg-red-950/60 hover:bg-red-800 text-red-300 rounded border border-red-800 transition"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EDIT USER MODAL */}
            {editingUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-lg bg-[#0e0e14] border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <div>
                      <h3 className="text-base font-bold text-white">Edit User #{editingUser.id}</h3>
                      <p className="text-xs text-zinc-400">Modify credentials, role, status, and wallet balances</p>
                    </div>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Referral / Affiliate Code</label>
                        <input
                          type="text"
                          value={editFormData.referral_code}
                          onChange={(e) => setEditFormData({ ...editFormData, referral_code: e.target.value })}
                          className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Role</label>
                        <select
                          value={editFormData.role}
                          onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                          className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-zinc-400"
                        >
                          <option value="player">Player</option>
                          <option value="affiliate">Affiliate Partner</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Account Status</label>
                        <select
                          value={editFormData.status}
                          onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                          className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-zinc-400"
                        >
                          <option value="active">Active</option>
                          <option value="banned">Banned</option>
                        </select>
                      </div>
                    </div>

                    {/* Direct Wallet Balances Adjustment */}
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                        Direct Wallet Balance Adjustments (₹ INR):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Deposit (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editFormData.deposit_balance}
                            onChange={(e) => setEditFormData({ ...editFormData, deposit_balance: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-emerald-500 mb-0.5">Winning (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editFormData.winning_balance}
                            onChange={(e) => setEditFormData({ ...editFormData, winning_balance: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-emerald-400 font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-amber-500 mb-0.5">Referral (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editFormData.referral_balance}
                            onChange={(e) => setEditFormData({ ...editFormData, referral_balance: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-amber-400 font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2 bg-silver-gradient text-black font-black uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg"
                      >
                        {submitting ? 'Saving...' : 'Save User Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: TOURNAMENT LAUNCHER (1-CLICK PRESETS & CUSTOM)                      */}
        {/* ========================================================================= */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 1-Click Fast Presets */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                Instant Presets (1-Click Fill)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-solo-48')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">FF Solo 48</span>
                  <span className="text-[10px] text-zinc-400 font-mono">₹25 Entry • 48 Slots</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-duo-24')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">FF Duo 2v2</span>
                  <span className="text-[10px] text-zinc-400 font-mono">₹60 Entry • 24 Duos</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-cs-4v4')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">FF CS 4v4</span>
                  <span className="text-[10px] text-zinc-400 font-mono">₹100 Entry • 2 Teams</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('pubg-squad-12')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">PUBG Squad</span>
                  <span className="text-[10px] text-zinc-400 font-mono">₹200 Entry • 12 Squads</span>
                </button>
              </div>
            </div>

            {/* Custom Form */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 block">
                  New Lobby Setup
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Launch Custom <span className="text-silver">Tournament Lobby</span>
                </h2>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Game Platform *</label>
                    <select
                      value={createForm.gameId}
                      onChange={(e) => setCreateForm({ ...createForm, gameId: parseInt(e.target.value) })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value={1}>Free Fire</option>
                      <option value={2}>PUBG Mobile / BGMI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Match Type *</label>
                    <select
                      value={createForm.matchType}
                      onChange={(e) => setCreateForm({ ...createForm, matchType: e.target.value })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="battle_royale">Battle Royale</option>
                      <option value="clash">Clash Squad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Format *</label>
                    <select
                      value={createForm.format}
                      onChange={(e) => setCreateForm({ ...createForm, format: e.target.value })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="solo">Solo</option>
                      <option value="duo">Duo (2v2)</option>
                      <option value="squad">Squad</option>
                      <option value="4v4">4v4</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Tournament Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Free Fire 48-Player BR Solo Survival #3"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Total Slots *</label>
                    <input
                      type="number"
                      value={createForm.totalSlots}
                      onChange={(e) => setCreateForm({ ...createForm, totalSlots: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Total Teams *</label>
                    <input
                      type="number"
                      value={createForm.totalTeams}
                      onChange={(e) => setCreateForm({ ...createForm, totalTeams: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Players / Team</label>
                    <input
                      type="number"
                      value={createForm.playersPerTeam}
                      onChange={(e) => setCreateForm({ ...createForm, playersPerTeam: parseInt(e.target.value) || 1 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Map Name</label>
                    <input
                      type="text"
                      value={createForm.mapName}
                      onChange={(e) => setCreateForm({ ...createForm, mapName: e.target.value })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Entry Fee (₹)</label>
                    <input
                      type="number"
                      value={createForm.entryFee}
                      onChange={(e) => setCreateForm({ ...createForm, entryFee: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Prize Pool (₹)</label>
                    <input
                      type="number"
                      value={createForm.prizePool}
                      onChange={(e) => setCreateForm({ ...createForm, prizePool: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Per Kill (₹)</label>
                    <input
                      type="number"
                      value={createForm.perKillPrize}
                      onChange={(e) => setCreateForm({ ...createForm, perKillPrize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Match Start At *</label>
                    <input
                      type="datetime-local"
                      required
                      value={createForm.matchStartAt}
                      onChange={(e) => setCreateForm({ ...createForm, matchStartAt: e.target.value })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">1st Prize (₹)</label>
                    <input
                      type="number"
                      value={createForm.firstPrize}
                      onChange={(e) => setCreateForm({ ...createForm, firstPrize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-300 mb-1">2nd Prize (₹)</label>
                    <input
                      type="number"
                      value={createForm.secondPrize}
                      onChange={(e) => setCreateForm({ ...createForm, secondPrize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">3rd Prize (₹)</label>
                    <input
                      type="number"
                      value={createForm.thirdPrize}
                      onChange={(e) => setCreateForm({ ...createForm, thirdPrize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121218] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg disabled:opacity-50 mt-2"
                >
                  {submitting ? 'Creating Lobby...' : 'Publish Tournament Lobby'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
