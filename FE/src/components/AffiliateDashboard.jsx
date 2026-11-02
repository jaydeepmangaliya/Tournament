import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function AffiliateDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifsc: '',
    holderName: '',
  });
  const [withdrawMsg, setWithdrawMsg] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('token');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/affiliate/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.status) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Affiliate fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCopyLink = () => {
    const affiliateCode = data?.affiliate?.affiliate_code;
    const link = `${window.location.origin}/login?aff=${affiliateCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 30) {
      setWithdrawMsg({ type: 'error', text: 'Minimum withdrawal is ₹30' });
      return;
    }
    setActionLoading(true);
    setWithdrawMsg({ type: '', text: '' });
    try {
      const payload = {
        amount: amt,
        payoutMethod,
        upiId: payoutMethod === 'upi' ? upiId : undefined,
        bankAccountNumber: payoutMethod === 'bank_transfer' ? bankDetails.accountNumber : undefined,
        bankIfsc: payoutMethod === 'bank_transfer' ? bankDetails.ifsc : undefined,
        accountHolderName: payoutMethod === 'bank_transfer' ? bankDetails.holderName : undefined,
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/wallet/withdraw`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        setWithdrawMsg({ type: 'success', text: res.data.message });
        await fetchDashboard();
        setTimeout(() => setWithdrawModal(false), 2000);
      } else {
        setWithdrawMsg({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setWithdrawMsg({ type: 'error', text: err.response?.data?.message || 'Withdrawal failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex items-center justify-center pt-20">
        <p className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Loading partner dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
        <div className="max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-8 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Affiliate Partner Program</h2>
          <p className="text-zinc-400 text-xs leading-relaxed">
            You are currently signed in as a player account. To get an official Affiliate Code and earn on every match your players join, register as an Affiliate Partner!
          </p>
          <a
            href="/login?role=affiliate"
            className="inline-block px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition"
          >
            Create Affiliate Account
          </a>
        </div>
      </div>
    );
  }

  const { affiliate, players, recentCommissions } = data;
  const affiliateLink = `${window.location.origin}/login?aff=${affiliate.affiliate_code}`;

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Banner */}
        <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10 space-y-4">
            <span className="px-3 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Official Partner Portal
            </span>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white">
              Affiliate <span className="text-silver">Earnings Engine</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl text-xs sm:text-sm leading-relaxed">
              Onboard players to LocalEsport. Whenever your players participate in any Free Fire or PUBG tournament, you automatically earn a <strong className="text-white">{affiliate.commission_value}% commission</strong> directly to your withdrawable wallet.
            </p>

            {/* Affiliate Link Box */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-xl">
              <div className="bg-[#121218] border border-zinc-700 px-4 py-3 rounded-xl flex-1 text-xs text-zinc-300 select-all truncate font-mono">
                {affiliateLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-6 py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex-shrink-0"
              >
                {copied ? 'COPIED LINK' : 'COPY LINK'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
              Onboarded Players
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{affiliate.total_players_count}</h3>
            <span className="text-[10px] text-zinc-500">Registered with your code</span>
          </div>

          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
              Commission Cut
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-silver">{affiliate.commission_value}%</h3>
            <span className="text-[10px] text-zinc-500">Per match entry fee</span>
          </div>

          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
              Lifetime Earned
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">₹{affiliate.total_earned.toFixed(2)}</h3>
            <span className="text-[10px] text-zinc-500">Total commissions generated</span>
          </div>

          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-700 bg-gradient-to-br from-zinc-900 to-[#0c0c10]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
              Withdrawable Balance
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              ₹{affiliate.withdrawable_balance.toFixed(2)}
            </h3>
            <button
              onClick={() => setWithdrawModal(true)}
              className="mt-3 w-full py-2 bg-silver-gradient hover:brightness-110 text-black font-black rounded-lg text-xs uppercase tracking-wider transition"
            >
              Withdraw Cash
            </button>
          </div>
        </div>

        {/* Players List Table */}
        <div className="bg-[#0c0c10] rounded-2xl border border-zinc-800 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">Your Onboarded Players</h2>
            <span className="text-xs text-zinc-500 font-mono">{players.length} Total</span>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No players have registered with your affiliate link yet. Share your partner link above to start onboarding!
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-center">Matches Played</th>
                      <th className="py-3 px-4 text-right">Total Entry Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                        <td className="py-3 px-4 font-bold text-white">{p.name || 'Anonymous'}</td>
                        <td className="py-3 px-4 text-zinc-400 font-mono">{p.email}</td>
                        <td className="py-3 px-4 text-zinc-500 font-mono">
                          {new Date(p.joined_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-silver">
                          {p.total_tournaments_joined}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-white">
                          ₹{parseFloat(p.total_entry_spent).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden divide-y divide-zinc-800">
                {players.map((p) => (
                  <div key={p.id} className="py-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white text-sm">{p.name || 'Anonymous'}</p>
                        <span className="text-zinc-500 font-mono text-[11px] block">{p.email}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(p.joined_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px] text-zinc-400 font-mono">
                      <span>Matches Joined: <strong className="text-silver">{p.total_tournaments_joined}</strong></span>
                      <span>Total Spent: <strong className="text-white">₹{parseFloat(p.total_entry_spent).toFixed(2)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Commission Logs */}
        <div className="bg-[#0c0c10] rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-base font-bold text-white uppercase tracking-wider mb-4">Commission Log</h2>
          {recentCommissions.length === 0 ? (
            <p className="text-center py-6 text-zinc-500 text-xs">No commissions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentCommissions.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#121218] p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{c.description}</p>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(c.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="font-black text-sm text-silver">
                    +₹{parseFloat(c.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 text-white space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold uppercase tracking-wider">Withdraw Affiliate Earnings</h3>
              <button onClick={() => setWithdrawModal(false)} className="text-zinc-400 hover:text-white text-2xl">
                &times;
              </button>
            </div>

            {withdrawMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  withdrawMsg.type === 'success'
                    ? 'bg-zinc-800 border border-zinc-600 text-white'
                    : 'bg-red-950/40 border border-red-700 text-red-300'
                }`}
              >
                {withdrawMsg.text}
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  Available: ₹{affiliate.withdrawable_balance.toFixed(2)}
                </label>
                <input
                  type="number"
                  min="30"
                  max={affiliate.withdrawable_balance}
                  required
                  placeholder="Enter amount (Min ₹30)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-2">Payout Method</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('upi')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                      payoutMethod === 'upi'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#14141a] border-zinc-800 text-zinc-400'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('bank_transfer')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                      payoutMethod === 'bank_transfer'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#14141a] border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Bank
                  </button>
                </div>
              </div>

              {payoutMethod === 'upi' ? (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-semibold">UPI ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mobile@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Account Holder Name"
                    value={bankDetails.holderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, holderName: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Bank Account Number"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="IFSC Code"
                    value={bankDetails.ifsc}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
                    className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs uppercase"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                {actionLoading ? 'Submitting...' : `Withdraw ₹${withdrawAmount || 0}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
