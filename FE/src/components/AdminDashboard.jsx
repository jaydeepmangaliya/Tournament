import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Strict isolated admin authentication storage
  const adminToken = localStorage.getItem('admin_token');
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  // Simple, intuitive tabs:
  // 'full' (Need Room ID) | 'open' (Joining) | 'live' (Playing) | 'completed' (Finished) | 'withdrawals' | 'players' | 'create'
  const [activeTab, setActiveTab] = useState('full');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states
  const [tournaments, setTournaments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tournament room credentials state (by tournament ID)
  const [credentials, setCredentials] = useState({});
  const [submittingCredId, setSubmittingCredId] = useState(null);
  const [expandedRosterId, setExpandedRosterId] = useState(null);
  const [copiedUIDsId, setCopiedUIDsId] = useState(null);

  // Edit Tournament Modal state
  const [editingTournament, setEditingTournament] = useState(null);
  const [editTourneyForm, setEditTourneyForm] = useState({
    title: '',
    entry_fee: 0,
    prize_pool: 0,
    first_prize: 0,
    second_prize: 0,
    third_prize: 0,
    per_kill_prize: 0,
    map_name: '',
    match_start_at: '',
    status: 'open',
    room_id: '',
    room_password: '',
  });

  // Add Player / Team to Slot Modal state
  const [addingTeamTournament, setAddingTeamTournament] = useState(null);
  const [addTeamForm, setAddTeamForm] = useState({
    slot_number: 1,
    team_name: '',
    in_game_name: '',
    in_game_id: '',
    phone: '',
    leader_user_id: '',
  });

  // Winner Declaration Modal state (opened directly on a live match)
  const [declaringWinnerMatch, setDeclaringWinnerMatch] = useState(null);
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

  // House Profit Margin state (defaults to 30% target profit margin)
  const [createProfitMargin, setCreateProfitMargin] = useState(30);
  const [editProfitMargin, setEditProfitMargin] = useState(30);

  // Helper: Computes exact profit margin & rank prizes based on total seats, entry fee & margin %
  const computeMarginBreakdown = (totalSlots, entryFee, marginPercent = 30, matchType = 'battle_royale') => {
    const slots = Math.max(1, parseInt(totalSlots) || 48);
    const fee = Math.max(0, parseFloat(entryFee) || 0);
    const gross = Math.round(slots * fee);
    const margin = Math.min(95, Math.max(0, parseFloat(marginPercent) || 30));

    const houseProfit = Math.round((gross * margin) / 100);
    const totalPrizePool = Math.max(0, gross - houseProfit);

    let first = 0;
    let second = 0;
    let third = 0;

    if (matchType === 'clash') {
      first = totalPrizePool;
    } else {
      // Free Fire / BGMI Standard Split: ~55% to 1st (Booyah), ~30% to 2nd, ~15% to 3rd
      first = Math.round(totalPrizePool * 0.55);
      second = Math.round(totalPrizePool * 0.30);
      third = Math.max(0, totalPrizePool - first - second);
    }

    return {
      slots,
      fee,
      gross,
      margin,
      houseProfit,
      totalPrizePool,
      first,
      second,
      third,
    };
  };

  // 1-Click apply margin to Create Tournament form
  const handleApplyCreateMargin = (margin = createProfitMargin) => {
    setCreateProfitMargin(margin);
    const split = computeMarginBreakdown(
      createForm.totalSlots,
      createForm.entryFee,
      margin,
      createForm.matchType
    );
    setCreateForm((prev) => ({
      ...prev,
      prizePool: split.totalPrizePool,
      firstPrize: split.first,
      secondPrize: split.second,
      thirdPrize: split.third,
    }));
  };

  // 1-Click apply margin to Edit Tournament modal
  const handleApplyEditMargin = (margin = editProfitMargin) => {
    if (!editingTournament) return;
    setEditProfitMargin(margin);
    const slots = editingTournament.total_slots || (editingTournament.total_teams * (editingTournament.players_per_team || 1)) || 48;
    const split = computeMarginBreakdown(
      slots,
      editTourneyForm.entry_fee,
      margin,
      editingTournament.match_type || 'battle_royale'
    );
    setEditTourneyForm((prev) => ({
      ...prev,
      prize_pool: split.totalPrizePool,
      first_prize: split.first,
      second_prize: split.second,
      third_prize: split.third,
    }));
  };

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

  // STEP 2: Give Room ID & Password, Start Match
  const handleStartMatch = async (tournamentId) => {
    const cred = credentials[tournamentId];
    if (!cred?.roomId?.trim() || !cred?.roomPassword?.trim()) {
      alert('Please enter both Custom Room ID and Password before starting the match.');
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
        setMessage(`Match #${tournamentId} started! Room ID & Password sent to registered players. Moved to Live Matches.`);
        setTimeout(() => setMessage(''), 5000);
        setActiveTab('live');
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update credentials.');
    } finally {
      setSubmittingCredId(null);
    }
  };

  // Copy all player UIDs to clipboard for in-game Free Fire / BGMI room invites
  const handleCopyAllUIDs = (tournament) => {
    const uids = [];
    tournament.teams?.forEach((team) => {
      team.players?.forEach((p) => {
        if (p.in_game_id) uids.push(`Slot #${team.slot_number} | ${p.in_game_name}: ${p.in_game_id}`);
      });
    });

    if (uids.length === 0) {
      alert('No participants registered in this tournament yet.');
      return;
    }

    navigator.clipboard.writeText(uids.join('\n'));
    setCopiedUIDsId(tournament.id);
    setTimeout(() => setCopiedUIDsId(null), 2500);
  };

  // Kick team from tournament slot with entry fee refund
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

  // OPEN EDIT TOURNAMENT MODAL
  const handleOpenEditTournament = (t) => {
    let formattedStart = '';
    if (t.match_start_at) {
      try {
        const d = new Date(t.match_start_at);
        formattedStart = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch (e) {}
    }

    setEditingTournament(t);
    setEditTourneyForm({
      title: t.title || '',
      entry_fee: t.entry_fee || 0,
      prize_pool: t.prize_pool || 0,
      first_prize: t.first_prize || 0,
      second_prize: t.second_prize || 0,
      third_prize: t.third_prize || 0,
      per_kill_prize: t.per_kill_prize || 0,
      map_name: t.map_name || 'Bermuda',
      match_start_at: formattedStart,
      status: t.status || 'open',
      room_id: t.room_id || '',
      room_password: t.room_password || '',
    });
  };

  const handleSaveEditTournament = async (e) => {
    e.preventDefault();
    if (!editingTournament) return;

    try {
      setSubmitting(true);
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${editingTournament.id}`,
        editTourneyForm,
        { headers }
      );

      if (res.data.status) {
        setMessage(`Tournament #${editingTournament.id} updated successfully!`);
        setTimeout(() => setMessage(''), 4500);
        setEditingTournament(null);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tournament.');
    } finally {
      setSubmitting(false);
    }
  };

  // OPEN ADD TEAM / PLAYER MODAL
  const handleOpenAddTeam = (t) => {
    // Determine first open slot
    const booked = new Set(t.booked_slots || []);
    let firstOpen = 1;
    for (let s = 1; s <= t.total_teams; s++) {
      if (!booked.has(s)) {
        firstOpen = s;
        break;
      }
    }

    setAddingTeamTournament(t);
    setAddTeamForm({
      slot_number: firstOpen,
      team_name: '',
      in_game_name: '',
      in_game_id: '',
      phone: '',
      leader_user_id: '',
    });
  };

  const handleSaveAddTeam = async (e) => {
    e.preventDefault();
    if (!addingTeamTournament) return;

    if (!addTeamForm.team_name || !addTeamForm.in_game_name) {
      alert('Please enter Team name and In-Game Name (IGN).');
      return;
    }

    try {
      setSubmitting(true);
      const headers = { Authorization: `Bearer ${adminToken}` };
      const payload = {
        slot_number: parseInt(addTeamForm.slot_number),
        team_name: addTeamForm.team_name.trim(),
        leader_user_id: addTeamForm.leader_user_id ? parseInt(addTeamForm.leader_user_id) : undefined,
        players: [
          {
            player_name: addTeamForm.team_name.trim(),
            in_game_name: addTeamForm.in_game_name.trim(),
            in_game_id: addTeamForm.in_game_id.trim() || `UID-${Date.now()}`,
            phone: addTeamForm.phone.trim() || null,
          },
        ],
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${addingTeamTournament.id}/add-team`,
        payload,
        { headers }
      );

      if (res.data.status) {
        setMessage(`Player added to Slot #${addTeamForm.slot_number} successfully!`);
        setTimeout(() => setMessage(''), 4500);
        setAddingTeamTournament(null);
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add player to slot.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 4: Enter Winner & Send Prize Modal Open
  const handleOpenWinnerModal = (match) => {
    setDeclaringWinnerMatch(match);
    setClashWinnerTeamId('');
    setBrRank1TeamId('');
    setBrRank2TeamId('');
    setBrRank3TeamId('');
    setKillBounties({});
  };

  // STEP 4: Submit Winner & Distribute Prize Money
  const handleSubmitWinner = async (e) => {
    e.preventDefault();
    if (!declaringWinnerMatch) return;

    const match = declaringWinnerMatch;
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
      if (!brRank1TeamId) {
        alert('Please select the 1st Place (Booyah) winner.');
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

    const confirmPayout = window.confirm(
      `Confirm prize distribution for Match #${match.id}?\n\nPrize money will be transferred directly to winner wallets and the match will be completed.`
    );
    if (!confirmPayout) return;

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/tournaments/${match.id}/results`,
        { winners, killBounties: killList },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (res.data.status) {
        setMessage(`Match #${match.id} finalized! Prizes transferred to winner wallets. Match moved to Completed.`);
        setTimeout(() => setMessage(''), 5000);
        setDeclaringWinnerMatch(null);
        setActiveTab('completed');
        loadAllAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to distribute prizes.');
    } finally {
      setSubmitting(false);
    }
  };

  // Withdrawals Approval & Rejection
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

  // Create Tournament Templates (Calibrated to 30% House Profit Margin)
  const applyTemplate = (type) => {
    const now = new Date();
    const plusTwoHours = new Date(now.getTime() + 7200000).toISOString().slice(0, 16);

    if (type === 'ff-solo-10') {
      // 48 players * ₹10 = ₹480 Gross. Platform Profit (30%) = ₹144. Prize Pool (70%) = ₹336.
      setCreateProfitMargin(30);
      setCreateForm({
        gameId: 1,
        title: 'Free Fire 48-Player BR Solo (₹10 Entry)',
        matchType: 'battle_royale',
        format: 'solo',
        mapName: 'Bermuda',
        totalSlots: 48,
        totalTeams: 48,
        playersPerTeam: 1,
        entryFee: 10,
        prizePool: 336,
        perKillPrize: 0,
        firstPrize: 185,
        secondPrize: 100,
        thirdPrize: 51,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'ff-solo-48') {
      // 48 players * ₹25 = ₹1200 Gross. Platform Profit (30%) = ₹360. Prize Pool (70%) = ₹840.
      setCreateProfitMargin(30);
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
        prizePool: 840,
        perKillPrize: 0,
        firstPrize: 460,
        secondPrize: 260,
        thirdPrize: 120,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'ff-duo-24') {
      // 24 teams * ₹60 = ₹1440 Gross. Platform Profit (30%) = ₹432. Prize Pool (70%) = ₹1008.
      setCreateProfitMargin(30);
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
        prizePool: 1008,
        perKillPrize: 0,
        firstPrize: 550,
        secondPrize: 300,
        thirdPrize: 158,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'ff-cs-4v4') {
      // 2 teams * ₹100 = ₹200 Gross. Platform Profit (30%) = ₹60. Prize Pool (70%) = ₹140.
      setCreateProfitMargin(30);
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
        prizePool: 140,
        perKillPrize: 0,
        firstPrize: 140,
        secondPrize: 0,
        thirdPrize: 0,
        matchStartAt: plusTwoHours,
      });
    } else if (type === 'pubg-squad-12') {
      // 12 teams * ₹200 = ₹2400 Gross. Platform Profit (30%) = ₹720. Prize Pool (70%) = ₹1680.
      setCreateProfitMargin(30);
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
        prizePool: 1680,
        perKillPrize: 0,
        firstPrize: 924,
        secondPrize: 504,
        thirdPrize: 252,
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

  // User Management
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

  // Group tournaments into clear stages
  const fullMatches = tournaments.filter(
    (t) => t.status === 'ready' || (t.filled_teams >= t.total_teams && (!t.room_id || !t.room_password))
  );
  const openMatches = tournaments.filter(
    (t) => t.status === 'open' && t.filled_teams < t.total_teams
  );
  const liveMatches = tournaments.filter((t) => t.status === 'ongoing');
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

  // 7 Clean, Layman-Friendly Tabs with Custom Icons for Sidebar
  const tabs = [
    {
      id: 'full',
      label: '1. Full (Need Room ID)',
      count: fullMatches.length ? `${fullMatches.length} READY` : null,
      alert: fullMatches.length > 0,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      id: 'open',
      label: '2. Open Matches',
      count: `${openMatches.length} OPEN`,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'live',
      label: '3. Live Matches',
      count: liveMatches.length ? `${liveMatches.length} LIVE` : null,
      alert: liveMatches.length > 0,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
    {
      id: 'completed',
      label: '4. Completed Matches',
      count: `${completedMatches.length}`,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
          <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: '5. Analytics & Revenue',
      count: 'LIVE',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'withdrawals',
      label: '6. UPI Withdrawals',
      count: analytics?.withdrawals?.pendingCount || null,
      alert: (analytics?.withdrawals?.pendingCount || 0) > 0,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      id: 'players',
      label: '7. Players & Affiliates',
      count: `${users.length}`,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'create',
      label: '8. + New Match',
      isSpecial: true,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
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

  // Roster / Participant Sub-Component for any match card
  const renderParticipantRoster = (tournament) => {
    if (expandedRosterId !== tournament.id) return null;

    const canAddPlayers = tournament.status === 'open' || tournament.status === 'ready';

    return (
      <div className="mt-3 bg-[#08080c] p-3 rounded-xl border border-zinc-800 max-h-80 overflow-y-auto space-y-2 text-xs">
        <div className="flex flex-wrap justify-between items-center gap-2 pb-1.5 border-b border-zinc-800/80">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Participants ({tournament.teams?.length || 0} / {tournament.total_teams} Booked):
          </span>
          <div className="flex items-center space-x-1.5">
            {canAddPlayers && (
              <button
                onClick={() => handleOpenAddTeam(tournament)}
                className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-[10px] font-bold text-emerald-300 transition flex items-center space-x-1"
              >
                <span>+ Add Player</span>
              </button>
            )}
            <button
              onClick={() => handleCopyAllUIDs(tournament)}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 transition"
            >
              {copiedUIDsId === tournament.id ? 'UIDs Copied!' : 'Copy All UIDs'}
            </button>
          </div>
        </div>

        {tournament.teams?.length === 0 ? (
          <p className="text-[11px] text-zinc-500 py-2">No players booked in this match yet.</p>
        ) : (
          tournament.teams?.map((team) => (
            <div key={team.id} className="p-2.5 bg-[#101016] rounded-lg border border-zinc-800/80 space-y-1.5">
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
                  {tournament.status !== 'completed' && (
                    <button
                      onClick={() => handleRemoveTeam(tournament.id, team)}
                      className="px-1.5 py-0.5 rounded bg-red-950/80 hover:bg-red-800 text-[9px] font-bold text-red-200 border border-red-700 transition"
                    >
                      Kick & Refund
                    </button>
                  )}
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
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] antialiased flex flex-col lg:flex-row">
      {/* 1. MOBILE TOP NAVIGATION BAR (Visible only on < lg) */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#08080c]/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <BrandLogo size="sm" />
            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/40 text-[8px] font-black uppercase text-amber-300">
              ADMIN
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="px-2.5 py-1 rounded-lg bg-[#101016] border border-zinc-800 flex items-center space-x-1.5 text-xs font-mono">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">Net:</span>
            <span className="font-bold text-emerald-400">
              ₹{analytics?.finances?.netProfit?.toLocaleString('en-IN') || 0}
            </span>
          </div>
          <button
            onClick={loadAllAdminData}
            title="Refresh"
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
        />
      )}

      {/* 2. DEDICATED SIDE NAVIGATION BAR (Sticky Left on Desktop, Slide-in Drawer on Mobile) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 sm:w-72 bg-[#08080c] border-r border-zinc-800/90 flex flex-col justify-between transition-transform duration-200 ease-in-out flex-shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Brand & User Profile */}
          <div className="pb-4 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <BrandLogo size="sm" />
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/40 text-[8px] font-black uppercase text-amber-300 flex-shrink-0">
                  ADMIN
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 mt-2 truncate pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="font-mono text-zinc-300 truncate">{adminUser?.email || 'admin@localesport.com'}</span>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Navigation Links (Vertical List) */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-3 block mb-1.5">
              Organizer Flow
            </span>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group ${
                    isActive
                      ? 'bg-white text-black shadow-lg shadow-white/10 font-black'
                      : tab.isSpecial
                      ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/60'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className={isActive ? 'text-black' : tab.isSpecial ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}>
                      {tab.icon}
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </div>

                  {tab.count && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 ${
                        tab.alert
                          ? 'bg-amber-500 text-black animate-pulse font-black'
                          : isActive
                          ? 'bg-zinc-200 text-black'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live Financial Metrics Card in Sidebar */}
          <div className="pt-2">
            <div className="p-3.5 bg-[#101016] rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">
                Platform Finances (Live)
              </span>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Total Fees:</span>
                <span className="text-white font-bold">
                  ₹{analytics?.finances?.entryCollected?.toLocaleString('en-IN') || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">House Net:</span>
                <span className="text-emerald-400 font-black">
                  ₹{analytics?.finances?.netProfit?.toLocaleString('en-IN') || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono pt-1.5 border-t border-zinc-800/80">
                <span className="text-zinc-400">Pending UPI:</span>
                <span className={((analytics?.withdrawals?.pendingCount || 0) > 0) ? 'text-amber-400 font-bold animate-pulse' : 'text-zinc-400'}>
                  {analytics?.withdrawals?.pendingCount || 0} Req
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-zinc-800/80 space-y-2 bg-[#060609]">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] font-bold text-zinc-300 hover:text-white transition flex items-center justify-center space-x-1.5"
          >
            <span>Open Player Website</span>
            <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          <button
            onClick={handleAdminLogout}
            className="w-full py-2 px-3 rounded-xl bg-red-950/40 border border-red-800/60 hover:bg-red-900/60 text-[11px] font-bold text-red-300 transition flex items-center justify-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. RIGHT CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* DESKTOP STICKY TOP HEADER */}
        <header className="sticky top-0 z-30 bg-[#08080c]/95 backdrop-blur-md border-b border-zinc-800 px-6 py-3.5 hidden lg:flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black text-white">
                {tabs.find((t) => t.id === activeTab)?.label || 'Console'}
              </h1>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                Organizer Portal
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live tournament control center with instant prize settlements and anti-cheat management.
            </p>
          </div>

          {/* Top Tickers & Refresh */}
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-xl bg-[#101016] border border-zinc-800 flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Fees:</span>
              <span className="text-xs font-mono font-bold text-white">
                ₹{analytics?.finances?.entryCollected?.toLocaleString('en-IN') || 0}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#101016] border border-zinc-800 flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Net Profit:</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ₹{analytics?.finances?.netProfit?.toLocaleString('en-IN') || 0}
              </span>
            </div>

            <button
              onClick={loadAllAdminData}
              title="Refresh Data"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition flex items-center space-x-1.5 text-xs font-bold"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* MAIN DASHBOARD CONTENT */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Global Toast Alert */}
          {message && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{message}</span>
            </div>
          )}

        {/* ========================================================================= */}
        {/* TAB 1: FULL MATCHES (NEED ROOM ID & PASSWORD)                             */}
        {/* ========================================================================= */}
        {activeTab === 'full' && (
          <div className="space-y-6">
            <div className="bg-[#12121c] border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
                </span>
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                  Step 1 & 2: Match is 100% Full — Enter Room ID & Password
                </h2>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All slots are booked and players have paid their entry fees. Open Free Fire or BGMI, create the custom room, enter the Room ID and Password below, and click <strong>"Share Room ID & Start Match"</strong>. Credentials will instantly appear on the players' screens!
              </p>

              {fullMatches.length === 0 ? (
                <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-2">
                  <svg className="w-8 h-8 text-zinc-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <p className="text-xs text-zinc-400 font-bold">No matches waiting for Room ID right now.</p>
                  <p className="text-[11px] text-zinc-500">
                    Matches appear here automatically as soon as all seats are booked by players.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {fullMatches.map((t) => (
                    <div key={t.id} className="bg-[#0c0c10] border border-amber-600/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                              100% FULL ({t.filled_teams}/{t.total_teams})
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
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditTournament(t)}
                            title="Edit Match Details"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
                            {t.format.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Room ID & Password Input */}
                      <div className="bg-[#14141d] p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                          Paste Game Room Credentials:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Custom Room ID *</label>
                            <input
                              type="text"
                              placeholder="e.g. 8492048"
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
                            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Room Password *</label>
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
                            onClick={() => handleStartMatch(t.id)}
                            disabled={submittingCredId === t.id}
                            className="flex-1 py-2 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-lg transition hover:brightness-110 shadow-md disabled:opacity-50"
                          >
                            {submittingCredId === t.id ? 'Starting...' : 'Share Room ID & Start Match'}
                          </button>
                          <button
                            onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                          >
                            {expandedRosterId === t.id ? 'Hide Players' : `View Participants (${t.teams?.length || 0})`}
                          </button>
                          <button
                            onClick={() => handleDeleteTournament(t)}
                            title="Delete match and refund all players"
                            className="p-2 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg border border-red-800/80 transition"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Participant Slots Roster */}
                      {renderParticipantRoster(t)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: OPEN MATCHES (PLAYERS CURRENTLY JOINING & CHOOSING SEATS)          */}
        {/* ========================================================================= */}
        {activeTab === 'open' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">Open Matches ({openMatches.length})</h2>
                <p className="text-xs text-zinc-400">
                  Lobbies currently open. As an Admin, you can edit prices/prizes, add players to open slots, or kick/refund players anytime.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="px-3 py-1.5 rounded-xl bg-silver-gradient text-black font-black text-xs uppercase tracking-wider transition hover:brightness-110 flex items-center space-x-1"
              >
                <span>+ Create New Match</span>
              </button>
            </div>

            {openMatches.length === 0 ? (
              <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-3">
                <p className="text-xs text-zinc-400">No open matches right now.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Create a Match
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openMatches.map((t) => {
                  const percentFilled = Math.min(100, Math.round((t.filled_teams / t.total_teams) * 100));
                  return (
                    <div key={t.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-lg">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {t.game_name} • {t.format.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            JOINING OPEN
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white mt-2 leading-snug">{t.title}</h3>
                        <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono mt-1">
                          <span>Map: {t.map_name}</span>
                          <span>•</span>
                          <span className="text-amber-300 font-bold">Fee: ₹{t.entry_fee}</span>
                          <span>•</span>
                          <span>Pool: ₹{t.prize_pool}</span>
                        </div>

                        {/* Seat counter bar */}
                        <div className="mt-3 bg-[#121218] p-3 rounded-xl border border-zinc-800 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 uppercase font-bold text-[10px]">Seats Booked:</span>
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
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenEditTournament(t)}
                            title="Edit Match, Price & Settings"
                            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center justify-center space-x-1.5 shadow"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit Match</span>
                          </button>

                          <button
                            onClick={() => handleOpenAddTeam(t)}
                            title="Add Player to open slot"
                            className="py-2 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-700 transition flex items-center justify-center space-x-1.5 shadow"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>+ Add Player</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                            className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                          >
                            {expandedRosterId === t.id ? 'Hide Players' : `View Participants (${t.teams?.length || 0})`}
                          </button>
                          <button
                            onClick={() => handleDeleteTournament(t)}
                            title="Delete Match"
                            className="p-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg border border-red-800/80 transition"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>

                        {renderParticipantRoster(t)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE MATCHES (PLAYING NOW - ENTER WINNER DIRECTLY ON THE CARD)     */}
        {/* ========================================================================= */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Step 3 & 4: Live Matches In Progress ({liveMatches.length})</h2>
              <p className="text-xs text-zinc-400">
                Players are currently in-game. When the match ends, simply click <strong>"Match Over? Enter Winner & Give Prize"</strong> below to pay winners instantly.
              </p>
            </div>

            {liveMatches.length === 0 ? (
              <div className="p-8 text-center bg-[#0c0c10] border border-zinc-800 rounded-2xl space-y-2">
                <svg className="w-8 h-8 text-zinc-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <p className="text-xs text-zinc-400 font-bold">No matches are playing live right now.</p>
                <p className="text-[11px] text-zinc-500">
                  Matches move here after you share the Room ID & Password in Tab 1.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveMatches.map((t) => (
                  <div key={t.id} className="bg-[#0c0c10] border-2 border-blue-500/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-2xl">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {t.game_name} • {t.format.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditTournament(t)}
                            title="Edit Match"
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 animate-pulse">
                            PLAYING NOW
                          </span>
                        </div>
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
                      {/* Big Prominent Action to Enter Winner */}
                      <button
                        onClick={() => handleOpenWinnerModal(t)}
                        className="w-full py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg flex items-center justify-center space-x-1.5"
                      >
                        <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                          <path d="M4 22h16" />
                          <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                          <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                        </svg>
                        <span>Match Over? Enter Winner & Give Prize</span>
                      </button>

                      <button
                        onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                        className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                      >
                        {expandedRosterId === t.id ? 'Hide Players' : `View Participants (${t.teams?.length || 0})`}
                      </button>

                      {renderParticipantRoster(t)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COMPLETED MATCHES (WINNERS & HISTORY)                              */}
        {/* ========================================================================= */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Finished Matches ({completedMatches.length})</h2>
              <p className="text-xs text-zinc-400">
                Matches that have finished with winner details and prize money transferred to player wallets.
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
                {completedMatches.map((t) => {
                  const ws = t.winner_summary;
                  let rank1 = ws?.rank1 || ws?.winners?.find((w) => w.rank === 1);
                  let runners = ws?.winners?.filter((w) => w.rank > 1) || [];

                  // Fallback: check if teams array has rank_position or prize_won
                  if (!rank1 && t.teams?.length) {
                    const teamRank1 = t.teams.find((tm) => tm.rank_position === 1 || parseFloat(tm.prize_won || 0) > 0);
                    if (teamRank1) {
                      rank1 = {
                        team_name: teamRank1.team_name,
                        slot_number: teamRank1.slot_number,
                        leader_name: teamRank1.leader_name,
                        prize: parseFloat(teamRank1.prize_won || t.first_prize || t.prize_pool),
                      };
                    }
                    const teamRunners = t.teams.filter((tm) => tm.rank_position > 1);
                    if (teamRunners.length > 0 && runners.length === 0) {
                      runners = teamRunners.map((tm) => ({
                        rank: tm.rank_position,
                        team_name: tm.team_name,
                        slot_number: tm.slot_number,
                        prize: parseFloat(tm.prize_won || 0),
                      }));
                    }
                  }

                  const hasWinnerData = Boolean(ws || rank1);

                  return (
                    <div key={t.id} className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-lg">
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
                          <span>Pool: ₹{t.prize_pool}</span>
                        </div>

                        {/* PROMINENT WINNERS SHOWCASE */}
                        {hasWinnerData ? (
                          <div className="mt-3 bg-gradient-to-br from-amber-950/40 via-[#14141d] to-[#0c0c10] p-3 rounded-xl border border-amber-500/40 space-y-2 text-xs">
                            <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                                <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                              </svg>
                              <span>Official Match Winner:</span>
                            </div>

                            {/* Rank 1 Booyah Card */}
                            {rank1 && (
                              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 flex justify-between items-center text-white font-mono">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider">
                                    1ST BOOYAH
                                  </span>
                                  <span className="font-bold text-xs text-white">
                                    {rank1.teamName || rank1.team_name}
                                  </span>
                                  {(rank1.slotNumber || rank1.slot_number) && (
                                    <span className="text-amber-300 text-[10px]">
                                      (Slot #{rank1.slotNumber || rank1.slot_number})
                                    </span>
                                  )}
                                  {rank1.leader_name && (
                                    <span className="text-zinc-400 text-[10px]">
                                      [{rank1.leader_name}]
                                    </span>
                                  )}
                                </div>
                                <span className="text-amber-400 font-black text-sm">
                                  +₹{rank1.prize}
                                </span>
                              </div>
                            )}

                            {/* Runners */}
                            {runners.map((w) => (
                              <div key={w.rank} className="flex justify-between items-center text-[11px] px-2.5 py-1.5 bg-black/40 rounded-lg border border-zinc-800 font-mono">
                                <span className="text-zinc-300">
                                  {w.rank === 2 ? '2nd Place' : '3rd Place'}: <strong>{w.teamName || w.team_name}</strong>{' '}
                                  {(w.slotNumber || w.slot_number) ? `(Slot #${w.slotNumber || w.slot_number})` : ''}
                                </span>
                                <span className="text-zinc-200 font-bold">+₹{w.prize}</span>
                              </div>
                            ))}

                            {/* Frag Bounties */}
                            {ws?.killBounties?.map((kb) => (
                              <div key={kb.teamId} className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-1">
                                <span>Kills: {kb.teamName} ({kb.kills} frags)</span>
                                <span className="text-emerald-400">+₹{kb.bountyAmount}</span>
                              </div>
                            ))}

                            <div className="pt-1.5 border-t border-zinc-800/80 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                              <span>Total Prize Payout:</span>
                              <span className="text-emerald-400 font-bold">
                                ₹{ws?.totalPrizeDistributed || rank1?.prize || t.prize_pool} Transferred
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                            <span className="text-zinc-400">Prizes Paid:</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              ₹{t.prize_pool} Transferred to Winner Wallets
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-800">
                        <button
                          onClick={() => setExpandedRosterId(expandedRosterId === t.id ? null : t.id)}
                          className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-800 transition"
                        >
                          {expandedRosterId === t.id ? 'Hide Players' : `View Participants (${t.teams?.length || 0})`}
                        </button>

                        {renderParticipantRoster(t)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BUSINESS ANALYTICS & REVENUE INTELLIGENCE                          */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Header with Title & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-white">Business Analytics & Growth Intelligence</h2>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-400">
                    Live Data
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time revenue, player acquisition rates, month-over-month comparisons, and game performance.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={loadAllAdminData}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center space-x-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Sync Metrics</span>
                </button>
              </div>
            </div>

            {/* 1. TOP 4 KEY METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gross Revenue */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2 shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Fees Collected</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                    +{analytics?.comparisons?.monthFeesGrowth || 100}% MoM
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  ₹{analytics?.finances?.entryCollected?.toLocaleString('en-IN') || 0}
                </div>
                <p className="text-[11px] text-zinc-500">Gross match bookings across all games</p>
              </div>

              {/* Net Profit */}
              <div className="bg-gradient-to-br from-emerald-950/30 via-[#0e1411] to-[#0c0c10] border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold text-emerald-300">House Net Profit</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-400 text-black text-[10px] font-mono font-black">
                    {analytics?.finances?.profitMarginPct || 0}% Margin
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  +₹{analytics?.finances?.netProfit?.toLocaleString('en-IN') || 0}
                </div>
                <p className="text-[11px] text-emerald-500/80">Net money kept after all prize payouts</p>
              </div>

              {/* Total Players */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2 shadow-lg">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Registered Players</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[10px] font-mono font-bold border border-blue-500/30">
                    +{analytics?.comparisons?.monthPlayersGrowth || 100}% Growth
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {analytics?.users?.total_players || 0} Players
                </div>
                <p className="text-[11px] text-zinc-500">
                  {analytics?.comparisons?.thisMonthPlayers || 0} new players registered this month
                </p>
              </div>

              {/* Total Prizes Paid */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2 shadow-lg">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Prizes Paid</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                    Atomic
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                  ₹{analytics?.finances?.prizesPaid?.toLocaleString('en-IN') || 0}
                </div>
                <p className="text-[11px] text-zinc-500">Credited directly to winner wallets</p>
              </div>
            </div>

            {/* 2. MONTH-OVER-MONTH & WEEK-OVER-WEEK COMPARISONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Run Rate */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Monthly Performance Compare
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">This Month vs Last Month</span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 bg-[#121218] rounded-xl border border-zinc-800/80">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Revenue This Month</span>
                    <span className="text-lg font-bold text-white">
                      ₹{analytics?.comparisons?.thisMonthFees || 0}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Last Month: ₹{analytics?.comparisons?.lastMonthFees || 0}
                    </span>
                  </div>

                  <div className="p-3 bg-[#121218] rounded-xl border border-zinc-800/80">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">New Players Added</span>
                    <span className="text-lg font-bold text-blue-400">
                      +{analytics?.comparisons?.thisMonthPlayers || 0}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Last Month: {analytics?.comparisons?.lastMonthPlayers || 0}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 flex justify-between items-center text-xs">
                  <span className="text-zinc-300 font-bold">Month-over-Month Revenue Growth:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    +{analytics?.comparisons?.monthFeesGrowth || 100}%
                  </span>
                </div>
              </div>

              {/* Weekly Velocity */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Weekly Velocity Compare
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Last 7 Days vs Prior 7 Days</span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 bg-[#121218] rounded-xl border border-zinc-800/80">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Revenue This Week</span>
                    <span className="text-lg font-bold text-white">
                      ₹{analytics?.comparisons?.thisWeekFees || 0}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Prior Week: ₹{analytics?.comparisons?.lastWeekFees || 0}
                    </span>
                  </div>

                  <div className="p-3 bg-[#121218] rounded-xl border border-zinc-800/80">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">New Players This Week</span>
                    <span className="text-lg font-bold text-blue-400">
                      +{analytics?.comparisons?.thisWeekPlayers || 0}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Prior Week: {analytics?.comparisons?.lastWeekPlayers || 0}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 flex justify-between items-center text-xs">
                  <span className="text-zinc-300 font-bold">Week-over-Week Revenue Pace:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    +{analytics?.comparisons?.weekFeesGrowth || 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* 3. VISUAL MONTHLY REVENUE & PROFIT BAR CHART */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-white block">
                    6-Month Revenue & Profit Trend
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Monthly entry fee collection vs prize payouts vs net house profit
                  </span>
                </div>
                {/* Legend */}
                <div className="flex items-center space-x-3 text-[10px] font-mono">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span className="text-zinc-300">Fees Collected</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span className="text-zinc-300">Prizes Paid</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-white" />
                    <span className="text-zinc-300">Net Profit</span>
                  </div>
                </div>
              </div>

              {/* Visual Bars Container */}
              {(() => {
                const trend = analytics?.monthlyTrend || [];
                const maxVal = Math.max(1, ...trend.map((m) => Math.max(m.fees, m.prizes, m.profit)));

                return (
                  <div className="grid grid-cols-6 gap-2 sm:gap-4 pt-4 pb-2 items-end min-h-[220px]">
                    {trend.map((m) => {
                      const feeHeight = Math.max(8, Math.round((m.fees / maxVal) * 100));
                      const prizeHeight = Math.max(8, Math.round((m.prizes / maxVal) * 100));
                      const profitHeight = Math.max(8, Math.round((m.profit / maxVal) * 100));

                      return (
                        <div key={m.monthKey} className="flex flex-col items-center space-y-2 group">
                          {/* Top Value Tooltip */}
                          <div className="text-[9px] font-mono text-zinc-400 group-hover:text-white transition text-center">
                            {m.fees > 0 ? `₹${m.fees}` : '₹0'}
                          </div>

                          {/* Bars Container */}
                          <div className="w-full bg-[#121218] rounded-xl p-1.5 h-36 flex items-end justify-center space-x-1 sm:space-x-1.5 border border-zinc-800/80">
                            {/* Fees Bar */}
                            <div
                              title={`Fees Collected: ₹${m.fees}`}
                              style={{ height: `${m.fees > 0 ? feeHeight : 4}%` }}
                              className="w-1/3 bg-emerald-500 rounded-t transition-all duration-500 hover:brightness-125"
                            />
                            {/* Prizes Bar */}
                            <div
                              title={`Prizes Paid: ₹${m.prizes}`}
                              style={{ height: `${m.prizes > 0 ? prizeHeight : 4}%` }}
                              className="w-1/3 bg-amber-500 rounded-t transition-all duration-500 hover:brightness-125"
                            />
                            {/* Profit Bar */}
                            <div
                              title={`Net Profit: ₹${m.profit}`}
                              style={{ height: `${m.profit > 0 ? profitHeight : 4}%` }}
                              className="w-1/3 bg-white rounded-t transition-all duration-500 hover:brightness-125"
                            />
                          </div>

                          {/* Month Label */}
                          <span className="text-[11px] font-mono font-bold text-zinc-400">
                            {m.monthLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 4. GAME PERFORMANCE & TOP PLAYERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Game Market Share */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Game Popularity & Revenue
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">By Matches & Fees</span>
                </div>

                <div className="space-y-3">
                  {analytics?.gameStats?.map((g) => {
                    const totalCollected = analytics?.finances?.entryCollected || 1;
                    const sharePct = Math.round((g.fees / totalCollected) * 100);
                    return (
                      <div key={g.gameName} className="p-3 bg-[#121218] rounded-xl border border-zinc-800/80 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{g.gameName}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            ₹{g.fees} ({g.matches} matches hosted)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(5, sharePct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hall of Fame / Top Winners */}
              <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Top Winning Players (Hall of Fame)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Total Prize Earners</span>
                </div>

                {analytics?.topWinners?.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">No winners recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics?.topWinners?.map((w, idx) => (
                      <div key={w.id} className="p-2.5 bg-[#121218] rounded-xl border border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-amber-300">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white block">{w.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{w.email}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-amber-400 block">+₹{w.totalWon}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{w.winsCount} Match Won</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. RECENT FINANCIAL ACTIVITY FEED */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Live Financial Activity Feed
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Latest wallet transactions</span>
              </div>

              {analytics?.recentActivity?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">No recent financial transactions.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {analytics?.recentActivity?.map((act) => (
                    <div key={act.id} className="p-2.5 bg-[#121218] rounded-xl border border-zinc-800/80 flex justify-between items-center">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            act.type === 'winning'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                              : act.type === 'affiliate_commission'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/40'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                          }`}>
                            {act.type.replace('_', ' ')}
                          </span>
                          <span className="font-bold text-zinc-200">{act.userName}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{act.description}</p>
                      </div>
                      <span className={`font-mono font-bold text-xs ${act.type === 'winning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        +₹{act.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: UPI WITHDRAWALS                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Player UPI Cashouts ({withdrawals.length})</h2>
                <p className="text-xs text-zinc-400">
                  Send UPI payment to the player's UPI ID, enter UTR number, and click Approve.
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
                <p className="text-xs text-zinc-400">No withdrawal requests matching this filter.</p>
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

                      {/* UPI ID Box */}
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
        {/* TAB 6: PLAYERS & AFFILIATES                                              */}
        {/* ========================================================================= */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Players & Affiliates Directory ({users.length})</h2>
                <p className="text-xs text-zinc-400">
                  Search players, edit their wallet balance or role, ban or delete accounts.
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

            {/* Table */}
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
                                title="Delete user"
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

            {/* Edit User Modal */}
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
                      <p className="text-xs text-zinc-400">Change details and adjust wallet balance</p>
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
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Referral / Code</label>
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
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Status</label>
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

                    {/* Direct Wallet Adjustments */}
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
                        Wallet Balances (₹):
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
                        {submitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: CREATE NEW MATCH                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 1-Click Fast Presets with 30% Profit Built-in */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  1-Click Presets (Calibrated to 30% Platform Profit):
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400">
                  Target: 30% House Margin
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-solo-10')}
                  className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/50 to-[#14141d] border border-emerald-500/40 hover:border-emerald-400 text-left transition shadow"
                >
                  <span className="text-xs font-bold text-white block">FF Solo ₹10</span>
                  <span className="text-[10px] text-emerald-300 font-mono block">30% Net Profit</span>
                  <span className="text-[9px] text-zinc-400 font-mono">₹480 In → ₹144 Profit</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-solo-48')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">FF Solo ₹25</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">30% Net Profit</span>
                  <span className="text-[9px] text-zinc-400 font-mono">₹1,200 In → ₹360 Profit</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-duo-24')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">FF Duo 2v2</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">30% Net Profit</span>
                  <span className="text-[9px] text-zinc-400 font-mono">₹1,440 In → ₹432 Profit</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('ff-cs-4v4')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">FF CS 4v4</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">30% Net Profit</span>
                  <span className="text-[9px] text-zinc-400 font-mono">₹200 In → ₹60 Profit</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('pubg-squad-12')}
                  className="p-3 rounded-xl bg-[#14141d] border border-zinc-800 hover:border-zinc-600 text-left transition"
                >
                  <span className="text-xs font-bold text-white block">PUBG Squad</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">30% Net Profit</span>
                  <span className="text-[9px] text-zinc-400 font-mono">₹2,400 In → ₹720 Profit</span>
                </button>
              </div>
            </div>

            {/* Custom Form */}
            <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Create New Match</h2>
                <p className="text-xs text-zinc-400 mt-1">Fill in the details to publish a new tournament on the website.</p>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Game *</label>
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
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Match Title *</label>
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

                {/* 30% AUTO PROFIT MARGIN CALCULATOR */}
                {(() => {
                  const calc = computeMarginBreakdown(
                    createForm.totalSlots,
                    createForm.entryFee,
                    createProfitMargin,
                    createForm.matchType
                  );
                  return (
                    <div className="bg-gradient-to-r from-emerald-950/40 via-[#101815] to-[#0d0d12] border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                            Auto Profit Margin Calculator
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                            {calc.margin}% Target Profit
                          </span>
                        </div>

                        {/* Quick Margin Selectors */}
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">Presets:</span>
                          {[20, 25, 30, 35].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleApplyCreateMargin(m)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                                createProfitMargin === m
                                  ? 'bg-emerald-400 text-black shadow font-black'
                                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              }`}
                            >
                              {m}%{m === 30 ? ' (Target)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Real-time Math Breakdown Card */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                        <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block">Total Collection</span>
                          <span className="text-sm font-black text-white">₹{calc.gross}</span>
                          <span className="text-[10px] text-zinc-500 block">({calc.slots} slots × ₹{calc.fee})</span>
                        </div>

                        <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-600/50">
                          <span className="text-[9px] uppercase font-bold text-emerald-300 block">
                            Your Net Profit ({calc.margin}%)
                          </span>
                          <span className="text-sm font-black text-emerald-400">+₹{calc.houseProfit}</span>
                          <span className="text-[10px] text-emerald-400/80 block">Platform Keeps</span>
                        </div>

                        <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block">
                            Prize Pool ({100 - calc.margin}%)
                          </span>
                          <span className="text-sm font-black text-amber-300">₹{calc.totalPrizePool}</span>
                          <span className="text-[10px] text-zinc-500 block">Paid to Players</span>
                        </div>

                        <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Rank Split</span>
                            <span className="text-[11px] font-bold text-zinc-200">
                              ₹{calc.first} / ₹{calc.second} / ₹{calc.third}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyCreateMargin(createProfitMargin)}
                            className="mt-1 w-full py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase rounded-lg transition"
                          >
                            Auto-Fill {createProfitMargin}% Split
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                  {submitting ? 'Creating Match...' : 'Publish Match'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: EDIT TOURNAMENT DETAILS (PRICES, PRIZES, MAP, TIME, STATUS)        */}
        {/* ========================================================================= */}
        {editingTournament && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xl bg-[#0e0e14] border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    Admin Match Editor
                  </span>
                  <h3 className="text-base font-bold text-white">Edit Match #{editingTournament.id}</h3>
                  <p className="text-xs text-zinc-400">Modify entry fees, prize pool, schedule, map, or status</p>
                </div>
                <button
                  onClick={() => setEditingTournament(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveEditTournament} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Match Title *</label>
                  <input
                    type="text"
                    required
                    value={editTourneyForm.title}
                    onChange={(e) => setEditTourneyForm({ ...editTourneyForm, title: e.target.value })}
                    className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-zinc-400"
                  />
                </div>

                {/* 30% AUTO PROFIT MARGIN CALCULATOR IN EDIT MODAL */}
                {(() => {
                  const slots = editingTournament.total_slots || (editingTournament.total_teams * (editingTournament.players_per_team || 1)) || 48;
                  const calc = computeMarginBreakdown(
                    slots,
                    editTourneyForm.entry_fee,
                    editProfitMargin,
                    editingTournament.match_type || 'battle_royale'
                  );
                  return (
                    <div className="bg-gradient-to-r from-emerald-950/40 via-[#101815] to-[#0d0d12] border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                            Auto Profit Margin Calculator ({calc.margin}%)
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">Presets:</span>
                          {[20, 25, 30, 35].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleApplyEditMargin(m)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                                editProfitMargin === m
                                  ? 'bg-emerald-400 text-black shadow font-black'
                                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              }`}
                            >
                              {m}%{m === 30 ? ' (Target)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                        <div className="bg-black/50 p-2 rounded-lg border border-zinc-800">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block">Total Collection</span>
                          <span className="text-xs font-black text-white">₹{calc.gross}</span>
                          <span className="text-[9px] text-zinc-500 block">{calc.slots} seats × ₹{calc.fee}</span>
                        </div>
                        <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-600/50">
                          <span className="text-[9px] uppercase font-bold text-emerald-300 block">
                            Your Profit ({calc.margin}%)
                          </span>
                          <span className="text-xs font-black text-emerald-400">+₹{calc.houseProfit}</span>
                          <span className="text-[9px] text-emerald-400/80 block">Platform Keeps</span>
                        </div>
                        <div className="bg-black/50 p-2 rounded-lg border border-zinc-800">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block">
                            Prize Pool ({100 - calc.margin}%)
                          </span>
                          <span className="text-xs font-black text-amber-300">₹{calc.totalPrizePool}</span>
                          <span className="text-[9px] text-zinc-500 block">To Winners</span>
                        </div>
                        <div className="bg-black/50 p-2 rounded-lg border border-zinc-800 flex flex-col justify-between">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block">
                            Split: ₹{calc.first}/₹{calc.second}/₹{calc.third}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyEditMargin(editProfitMargin)}
                            className="mt-1 w-full py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase rounded transition"
                          >
                            Auto-Fill {editProfitMargin}% Split
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">Entry Fee (₹) *</label>
                    <input
                      type="number"
                      value={editTourneyForm.entry_fee}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, entry_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-300 mb-1">Prize Pool (₹) *</label>
                    <input
                      type="number"
                      value={editTourneyForm.prize_pool}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, prize_pool: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Per Kill (₹)</label>
                    <input
                      type="number"
                      value={editTourneyForm.per_kill_prize}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, per_kill_prize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Map Name</label>
                    <input
                      type="text"
                      value={editTourneyForm.map_name}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, map_name: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-sans focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">1st Prize (₹)</label>
                    <input
                      type="number"
                      value={editTourneyForm.first_prize}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, first_prize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-300 mb-1">2nd Prize (₹)</label>
                    <input
                      type="number"
                      value={editTourneyForm.second_prize}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, second_prize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">3rd Prize (₹)</label>
                    <input
                      type="number"
                      value={editTourneyForm.third_prize}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, third_prize: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Match Start At</label>
                    <input
                      type="datetime-local"
                      value={editTourneyForm.match_start_at}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, match_start_at: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Match Status</label>
                    <select
                      value={editTourneyForm.status}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, status: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-sans focus:outline-none"
                    >
                      <option value="open">Open (Accepting Players)</option>
                      <option value="ready">Ready (100% Full)</option>
                      <option value="ongoing">Ongoing (Playing Live)</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Room ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 8492048"
                      value={editTourneyForm.room_id}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, room_id: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Room Password</label>
                    <input
                      type="text"
                      placeholder="e.g. 7788"
                      value={editTourneyForm.room_password}
                      onChange={(e) => setEditTourneyForm({ ...editTourneyForm, room_password: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingTournament(null)}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-silver-gradient text-black font-black uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg"
                  >
                    {submitting ? 'Saving Changes...' : 'Save Match Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ADMIN ADD PLAYER TO OPEN SLOT                                      */}
        {/* ========================================================================= */}
        {addingTeamTournament && (() => {
          const booked = new Set(addingTeamTournament.booked_slots || []);
          const openSlotsList = [];
          for (let s = 1; s <= addingTeamTournament.total_teams; s++) {
            if (!booked.has(s)) openSlotsList.push(s);
          }

          return (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#0e0e14] border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                      Admin Registration
                    </span>
                    <h3 className="text-base font-bold text-white">Add Player to Match #{addingTeamTournament.id}</h3>
                    <p className="text-xs text-zinc-400">Directly assign a player or squad into an open slot</p>
                  </div>
                  <button
                    onClick={() => setAddingTeamTournament(null)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSaveAddTeam} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                      Choose Open Slot ({openSlotsList.length} Available) *
                    </label>
                    <select
                      value={addTeamForm.slot_number}
                      onChange={(e) => setAddTeamForm({ ...addTeamForm, slot_number: parseInt(e.target.value) })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                    >
                      {openSlotsList.map((s) => (
                        <option key={s} value={s}>
                          Slot #{s} (Free)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Team / Player Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TotalGaming or Alpha Squad"
                      value={addTeamForm.team_name}
                      onChange={(e) => setAddTeamForm({ ...addTeamForm, team_name: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">In-Game Name (IGN) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. TG_Ajjubhai"
                        value={addTeamForm.in_game_name}
                        onChange={(e) => setAddTeamForm({ ...addTeamForm, in_game_name: e.target.value })}
                        className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">In-Game Character UID</label>
                      <input
                        type="text"
                        placeholder="e.g. 192847192"
                        value={addTeamForm.in_game_id}
                        onChange={(e) => setAddTeamForm({ ...addTeamForm, in_game_id: e.target.value })}
                        className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Player Phone Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={addTeamForm.phone}
                      onChange={(e) => setAddTeamForm({ ...addTeamForm, phone: e.target.value })}
                      className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setAddingTeamTournament(null)}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-silver-gradient text-black font-black uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg"
                    >
                      {submitting ? 'Registering...' : 'Register into Slot'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* STEP 4: ENTER WINNER & GIVE PRIZE MODAL (OPENS DIRECTLY ON A LIVE MATCH) */}
        {/* ========================================================================= */}
        {declaringWinnerMatch && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xl bg-[#0e0e14] border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start pb-3 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    Step 4: Enter Match Winners & Give Prize
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Match #{declaringWinnerMatch.id}: {declaringWinnerMatch.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono mt-1">
                    <span>1st Prize: ₹{declaringWinnerMatch.first_prize || declaringWinnerMatch.prize_pool}</span>
                    {declaringWinnerMatch.second_prize > 0 && <span>• 2nd: ₹{declaringWinnerMatch.second_prize}</span>}
                    {declaringWinnerMatch.third_prize > 0 && <span>• 3rd: ₹{declaringWinnerMatch.third_prize}</span>}
                    {declaringWinnerMatch.per_kill_prize > 0 && <span>• ₹{declaringWinnerMatch.per_kill_prize}/kill</span>}
                  </div>
                </div>
                <button
                  onClick={() => setDeclaringWinnerMatch(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {declaringWinnerMatch.teams?.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs">
                  No teams registered in this match. Cannot declare winners.
                </div>
              ) : (
                <form onSubmit={handleSubmitWinner} className="space-y-4 text-xs">
                  {declaringWinnerMatch.match_type === 'clash' ? (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-300 mb-1">
                        Select Winning Squad (Gets ₹{declaringWinnerMatch.first_prize || declaringWinnerMatch.prize_pool}) *
                      </label>
                      <select
                        value={clashWinnerTeamId}
                        onChange={(e) => setClashWinnerTeamId(e.target.value)}
                        className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                      >
                        <option value="">-- Choose Winning Team --</option>
                        {declaringWinnerMatch.teams?.map((team) => (
                          <option key={team.id} value={team.id}>
                            Slot #{team.slot_number}: {team.team_name} (Captain: {team.leader_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">
                          1st Place Winner (Booyah) — Receives ₹{declaringWinnerMatch.first_prize} *
                        </label>
                        <select
                          value={brRank1TeamId}
                          onChange={(e) => setBrRank1TeamId(e.target.value)}
                          className="w-full bg-[#14141d] border border-amber-600/60 rounded-xl px-3 py-2 text-white font-mono"
                        >
                          <option value="">-- Choose 1st Place Team --</option>
                          {declaringWinnerMatch.teams?.map((team) => (
                            <option key={team.id} value={team.id}>
                              Slot #{team.slot_number}: {team.team_name} (Captain: {team.leader_name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-300 mb-1">
                            2nd Place — Receives ₹{declaringWinnerMatch.second_prize || 0}
                          </label>
                          <select
                            value={brRank2TeamId}
                            onChange={(e) => setBrRank2TeamId(e.target.value)}
                            className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                          >
                            <option value="">-- Optional 2nd Place --</option>
                            {declaringWinnerMatch.teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                Slot #{team.slot_number}: {team.team_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">
                            3rd Place — Receives ₹{declaringWinnerMatch.third_prize || 0}
                          </label>
                          <select
                            value={brRank3TeamId}
                            onChange={(e) => setBrRank3TeamId(e.target.value)}
                            className="w-full bg-[#14141d] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                          >
                            <option value="">-- Optional 3rd Place --</option>
                            {declaringWinnerMatch.teams?.map((team) => (
                              <option key={team.id} value={team.id}>
                                Slot #{team.slot_number}: {team.team_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Optional Kills */}
                      {parseFloat(declaringWinnerMatch.per_kill_prize || 0) > 0 && (
                        <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-zinc-400">
                            Team Kills (Optional — ₹{declaringWinnerMatch.per_kill_prize} per kill):
                          </label>
                          <div className="max-h-44 overflow-y-auto space-y-1 p-2 bg-[#08080c] rounded-xl border border-zinc-800">
                            {declaringWinnerMatch.teams?.map((team) => (
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
                  )}

                  <div className="flex gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setDeclaringWinnerMatch(null)}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-silver-gradient text-black font-black uppercase tracking-wider rounded-xl transition hover:brightness-110 shadow-lg disabled:opacity-50"
                    >
                      {submitting ? 'Paying Winners...' : 'Pay Winners & Complete Match'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
