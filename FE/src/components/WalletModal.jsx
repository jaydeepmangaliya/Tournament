import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function WalletModal({ isOpen, onClose, onBalanceUpdate }) {
  const [activeTab, setActiveTab] = useState('balances'); // 'balances' | 'add' | 'withdraw' | 'history'
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [payoutMethod, setPayoutMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifsc: '',
    holderName: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const token = localStorage.getItem('token');

  const fetchWallet = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wallet/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.status) {
        setWallet(res.data.data);
        if (onBalanceUpdate) {
          onBalanceUpdate(res.data.data.balances);
        }
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!addAmount || parseFloat(addAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/wallet/add-funds`,
        { amount: parseFloat(addAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status) {
        setMessage({ type: 'success', text: res.data.message });
        await fetchWallet();
        setTimeout(() => setActiveTab('balances'), 1200);
      } else {
        setMessage({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add funds' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 30) {
      setMessage({ type: 'error', text: 'Minimum withdrawal amount is ₹30' });
      return;
    }
    setActionLoading(true);
    setMessage({ type: '', text: '' });
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
        setMessage({ type: 'success', text: res.data.message });
        await fetchWallet();
        setTimeout(() => setActiveTab('balances'), 2000);
      } else {
        setMessage({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Withdrawal request failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0c0c10] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-[#e4e4e7] my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-[#121218] flex-shrink-0">
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Player <span className="text-silver">Wallet</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-2xl leading-none focus:outline-none p-1"
            >
              &times;
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-[#0f0f14] flex-shrink-0">
            <button
              onClick={() => { setActiveTab('balances'); setMessage({ type: '', text: '' }); }}
              className={`flex-1 py-2.5 sm:py-3 text-center transition ${
                activeTab === 'balances' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => { setActiveTab('add'); setMessage({ type: '', text: '' }); }}
              className={`flex-1 py-2.5 sm:py-3 text-center transition ${
                activeTab === 'add' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              + Add
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setMessage({ type: '', text: '' }); }}
              className={`flex-1 py-2.5 sm:py-3 text-center transition ${
                activeTab === 'withdraw' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Withdraw
            </button>
            <button
              onClick={() => { setActiveTab('history'); setMessage({ type: '', text: '' }); }}
              className={`flex-1 py-2.5 sm:py-3 text-center transition ${
                activeTab === 'history' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              History
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {message.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                  message.type === 'success'
                    ? 'bg-zinc-800 border border-zinc-600 text-white'
                    : 'bg-red-950/40 border border-red-700 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-zinc-500 text-xs">Loading wallet ledger...</div>
            ) : (
              <>
                {/* BALANCES TAB */}
                {activeTab === 'balances' && wallet && (
                  <div className="space-y-4">
                    {/* Total Balance Card */}
                    <div className="bg-gradient-to-b from-zinc-800/80 to-zinc-900 border border-zinc-700 p-6 rounded-2xl text-center shadow-lg">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">
                        Total Balance Available
                      </p>
                      <h3 className="text-4xl font-black text-white">
                        ₹{wallet.balances.total.toFixed(2)}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-2">
                        Usable directly for entering Free Fire & PUBG Mobile matches
                      </p>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
                      <div className="bg-[#121218] p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Deposit</span>
                        <span className="text-base font-black text-white">
                          ₹{wallet.balances.deposit.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-[#121218] p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Winnings</span>
                        <span className="text-base font-black text-silver">
                          ₹{wallet.balances.winning.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-[#121218] p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Referral / Bonus</span>
                        <span className="text-base font-black text-zinc-300">
                          ₹{wallet.balances.referral.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#121218] rounded-xl p-3 border border-zinc-800 text-xs text-zinc-300 flex justify-between items-center">
                      <span>Withdrawable to UPI (Winnings + Bonus):</span>
                      <strong className="text-white font-mono text-sm">₹{wallet.balances.withdrawable.toFixed(2)}</strong>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => setActiveTab('add')}
                        className="flex-1 py-2.5 bg-silver-gradient hover:brightness-110 text-black rounded-xl font-black text-xs uppercase tracking-wider transition"
                      >
                        + Add Funds
                      </button>
                      <button
                        onClick={() => setActiveTab('withdraw')}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                      >
                        Withdraw Cash
                      </button>
                    </div>
                  </div>
                )}

                {/* ADD FUNDS TAB */}
                {activeTab === 'add' && (
                  <form onSubmit={handleAddFunds} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                        Enter Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-4 py-3 text-xl font-black text-white focus:outline-none focus:border-zinc-400"
                        placeholder="100"
                        required
                      />
                    </div>

                    <div className="flex space-x-2">
                      {['50', '100', '200', '500'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAddAmount(amt)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border ${
                            addAmount === amt
                              ? 'bg-zinc-200 text-black border-white'
                              : 'bg-[#14141a] border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          +₹{amt}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : `Add ₹${addAmount || 0} to Wallet`}
                    </button>
                  </form>
                )}

                {/* WITHDRAW TAB */}
                {activeTab === 'withdraw' && (
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs flex justify-between">
                      <span className="text-zinc-400">Available to Withdraw:</span>
                      <strong className="text-white">₹{wallet?.balances?.withdrawable.toFixed(2) || '0.00'}</strong>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-bold">
                        Withdrawal Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max={wallet?.balances?.withdrawable || 10000}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-4 py-2.5 text-base font-black text-white focus:outline-none focus:border-zinc-400"
                        placeholder="Min ₹30"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                        Payout Method
                      </label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('upi')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                            payoutMethod === 'upi'
                              ? 'bg-white text-black border-white'
                              : 'bg-[#14141a] border-zinc-800 text-zinc-400'
                          }`}
                        >
                          UPI (Instant)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('bank_transfer')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                            payoutMethod === 'bank_transfer'
                              ? 'bg-white text-black border-white'
                              : 'bg-[#14141a] border-zinc-800 text-zinc-400'
                          }`}
                        >
                          Bank Transfer
                        </button>
                      </div>
                    </div>

                    {payoutMethod === 'upi' ? (
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-semibold">UPI ID (e.g. mobile@upi)</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@okhdfcbank"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={bankDetails.holderName}
                          onChange={(e) => setBankDetails({ ...bankDetails, holderName: e.target.value })}
                          placeholder="Account Holder Name"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                          required
                        />
                        <input
                          type="text"
                          value={bankDetails.accountNumber}
                          onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                          placeholder="Account Number"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                          required
                        />
                        <input
                          type="text"
                          value={bankDetails.ifsc}
                          onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
                          placeholder="IFSC Code"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase"
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Submitting...' : `Submit Withdrawal for ₹${withdrawAmount || 0}`}
                    </button>
                  </form>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {wallet?.transactions?.length === 0 ? (
                      <p className="text-center text-zinc-500 py-8 text-xs">No transactions recorded yet.</p>
                    ) : (
                      wallet?.transactions?.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-[#121218] p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">{tx.description || tx.type}</p>
                            <span className="text-zinc-500 text-[10px]">
                              {new Date(tx.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-black text-sm ${
                                tx.type === 'entry_fee' || tx.type === 'withdrawal'
                                  ? 'text-zinc-400'
                                  : 'text-white'
                              }`}
                            >
                              {tx.type === 'entry_fee' || tx.type === 'withdrawal' ? '-' : '+'}₹
                              {parseFloat(tx.amount).toFixed(2)}
                            </span>
                            <span className="block text-[10px] uppercase text-zinc-500 font-mono">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
