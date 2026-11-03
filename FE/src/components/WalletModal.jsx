import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';

export const INDIAN_STATES = [
  { name: 'Andaman and Nicobar Islands', restricted: false },
  { name: 'Andhra Pradesh', restricted: true },
  { name: 'Arunachal Pradesh', restricted: false },
  { name: 'Assam', restricted: true },
  { name: 'Bihar', restricted: false },
  { name: 'Chandigarh', restricted: false },
  { name: 'Chhattisgarh', restricted: false },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', restricted: false },
  { name: 'Delhi', restricted: false },
  { name: 'Goa', restricted: false },
  { name: 'Gujarat', restricted: false },
  { name: 'Haryana', restricted: false },
  { name: 'Himachal Pradesh', restricted: false },
  { name: 'Jammu and Kashmir', restricted: false },
  { name: 'Jharkhand', restricted: false },
  { name: 'Karnataka', restricted: false },
  { name: 'Kerala', restricted: false },
  { name: 'Ladakh', restricted: false },
  { name: 'Lakshadweep', restricted: false },
  { name: 'Madhya Pradesh', restricted: false },
  { name: 'Maharashtra', restricted: false },
  { name: 'Manipur', restricted: false },
  { name: 'Meghalaya', restricted: false },
  { name: 'Mizoram', restricted: false },
  { name: 'Nagaland', restricted: true },
  { name: 'Odisha', restricted: true },
  { name: 'Puducherry', restricted: false },
  { name: 'Punjab', restricted: false },
  { name: 'Rajasthan', restricted: false },
  { name: 'Sikkim', restricted: true },
  { name: 'Tamil Nadu', restricted: false },
  { name: 'Telangana', restricted: true },
  { name: 'Tripura', restricted: false },
  { name: 'Uttar Pradesh', restricted: false },
  { name: 'Uttarakhand', restricted: false },
  { name: 'West Bengal', restricted: false }
];

export default function WalletModal({ isOpen, onClose, onBalanceUpdate }) {
  const [activeTab, setActiveTab] = useState('balances'); // 'balances' | 'add' | 'withdraw' | 'kyc' | 'history'
  const [wallet, setWallet] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
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

  // KYC Form State
  const [kycForm, setKycForm] = useState({
    panNumber: '',
    panName: '',
    aadhaarLast4: '',
    state: '',
    is18Plus: true,
  });
  const [kycSubmitting, setKycSubmitting] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error', title = '') => {
    setToast({ message, type, title });
  };

  const token = localStorage.getItem('token');

  const fetchProfileAndWallet = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [walletRes, profileRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/wallet/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (walletRes.data.status) {
        setWallet(walletRes.data.data);
        if (onBalanceUpdate) {
          onBalanceUpdate(walletRes.data.data.balances);
        }
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: walletRes.data.data.balances.total }));
      }

      if (profileRes.data.status && profileRes.data.data) {
        const u = profileRes.data.data;
        setUserProfile(u);
        setKycForm((prev) => ({
          ...prev,
          panNumber: u.pan_number || '',
          panName: u.pan_name || u.name || '',
          aadhaarLast4: u.aadhaar_last4 || '',
          state: u.state || '',
          is18Plus: true,
        }));
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfileAndWallet();
      setToast(null);
    }
  }, [isOpen]);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    const amt = parseFloat(addAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const orderRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/payment/create-order`,
        { amount: amt, tournamentId: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderData = orderRes.data;
      const orderId = orderData.orderId || orderData.order?.id;
      if (!orderId) {
        throw new Error(orderData.message || 'Failed to initialize payment gateway');
      }

      const rzpKey = orderData.key || 'rzp_test_WyypEVHeheZwJ5';

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const options = {
        key: rzpKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'LOCALESPORT',
        description: `Wallet Top-Up: ₹${amt}`,
        order_id: orderId,
        theme: {
          color: '#000000',
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'UPI (Google Pay, PhonePe, Paytm, QR)',
                instruments: [{ method: 'upi' }],
              },
              other: {
                name: 'Cards & NetBanking',
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
        modal: {
          ondismiss: () => {
            setActionLoading(false);
          },
        },
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(
              `${import.meta.env.VITE_API_URL}/api/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: amt,
                tournamentId: 0,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (verifyRes.data.status) {
              showToast(`₹${amt} added to wallet successfully via Razorpay!`, 'success', 'Top-up Successful');
              await fetchProfileAndWallet();
              setTimeout(() => setActiveTab('balances'), 1200);
            } else {
              showToast(verifyRes.data.message || 'Payment verification failed', 'error');
            }
          } catch (vErr) {
            showToast(vErr.response?.data?.message || 'Payment verification failed', 'error');
          } finally {
            setActionLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        showToast(resp.error?.description || 'Payment failed', 'error', 'Payment Failed');
        setActionLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Wallet add funds error:', err);
      showToast(err.response?.data?.message || err.message || 'Payment failed to initiate', 'error');
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();

    if (userProfile?.kyc_status !== 'verified') {
      showToast('Mandatory KYC Required: Please verify your PAN & State before withdrawing.', 'warning', 'KYC Required');
      setActiveTab('kyc');
      return;
    }

    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 30) {
      showToast('Minimum withdrawal amount is ₹30', 'error', 'Invalid Amount');
      return;
    }

    setActionLoading(true);
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
        showToast(res.data.message || 'Withdrawal request submitted! Payout will be sent within 2-4 hours.', 'success', 'Withdrawal Requested');
        await fetchProfileAndWallet();
        setTimeout(() => setActiveTab('balances'), 1500);
      } else {
        if (res.data.requireKyc) {
          setActiveTab('kyc');
        }
        showToast(res.data.message || 'Withdrawal failed', 'error');
      }
    } catch (err) {
      if (err.response?.data?.requireKyc) {
        setActiveTab('kyc');
      }
      showToast(err.response?.data?.message || 'Withdrawal request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!kycForm.is18Plus) {
      showToast('You must be 18+ years of age to participate in real-money contests.', 'error');
      return;
    }

    const selectedStateObj = INDIAN_STATES.find(s => s.name === kycForm.state);
    if (selectedStateObj && selectedStateObj.restricted) {
      showToast(`Real-money gaming is prohibited in ${kycForm.state} under State gaming laws.`, 'error', 'Restricted State');
      return;
    }

    setKycSubmitting(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/kyc`,
        kycForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status) {
        showToast('KYC verified successfully! You can now request instant payouts.', 'success', 'KYC Verified');
        await fetchProfileAndWallet();
        setTimeout(() => setActiveTab('withdraw'), 1200);
      } else {
        showToast(res.data.message || 'KYC submission failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'KYC verification failed.', 'error');
    } finally {
      setKycSubmitting(false);
    }
  };

  // Section 194BA 30% TDS Calculations
  const rawWithdraw = parseFloat(withdrawAmount) || 0;
  const tds30 = parseFloat((rawWithdraw * 0.30).toFixed(2));
  const netCredit = parseFloat((rawWithdraw - tds30).toFixed(2));

  const isKycVerified = userProfile?.kyc_status === 'verified';
  const selectedStateIsRestricted = INDIAN_STATES.find(s => s.name === kycForm.state)?.restricted;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <Toast toast={toast} onClose={() => setToast(null)} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0c0c10] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-[#e4e4e7] my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col relative"
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
              <div>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Player <span className="text-silver">Wallet</span>
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-2xl leading-none focus:outline-none p-1 cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-[#0f0f14] flex-shrink-0">
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer ${
                activeTab === 'balances' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer ${
                activeTab === 'add' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              + Add
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer ${
                activeTab === 'withdraw' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer flex items-center justify-center space-x-1 ${
                activeTab === 'kyc' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>KYC</span>
              {isKycVerified ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 sm:py-3 text-center transition cursor-pointer ${
                activeTab === 'history' ? 'text-white border-b-2 border-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              History
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <p className="text-xs text-zinc-500 font-mono">Syncing wallet ledger...</p>
              </div>
            ) : (
              <>
                {/* BALANCES TAB */}
                {activeTab === 'balances' && (
                  <div className="space-y-4">
                    {/* Legal Compliance Badge Bar */}
                    <div className="p-2.5 px-3 rounded-xl bg-[#111116] border border-zinc-800 flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">18+ ONLY</span>
                        <span className="text-zinc-400">Skill Game Platform</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isKycVerified ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black uppercase">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>KYC Verified</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveTab('kyc')}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black uppercase hover:bg-amber-500/20 transition cursor-pointer"
                          >
                            <span>Verify KYC</span>
                            <span className="text-amber-400">&rarr;</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Total Balance Card */}
                    <div className="bg-gradient-to-br from-[#181822] to-[#0c0c12] p-5 rounded-2xl border border-zinc-700/80 shadow-lg text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                        Total Wallet Balance
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                        ₹{wallet?.balances?.total.toFixed(2) || '0.00'}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Combined deposit, prize winnings, and referral earnings
                      </p>
                    </div>

                    {/* Breakdown Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Deposit Balance */}
                      <div className="bg-[#121218] p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Deposit Cash
                        </span>
                        <strong className="text-lg font-black text-white font-mono block mt-0.5">
                          ₹{wallet?.balances?.deposit.toFixed(2) || '0.00'}
                        </strong>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">Used for Entry Fees</span>
                      </div>

                      {/* Winning Balance */}
                      <div className="bg-[#121218] p-3.5 rounded-xl border border-emerald-900/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          Winnings
                        </span>
                        <strong className="text-lg font-black text-emerald-300 font-mono block mt-0.5">
                          ₹{wallet?.balances?.winning.toFixed(2) || '0.00'}
                        </strong>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">Won from Tournaments</span>
                      </div>

                      {/* Referral Balance */}
                      <div className="bg-[#121218] p-3.5 rounded-xl border border-cyan-900/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                          Referral Bonus
                        </span>
                        <strong className="text-lg font-black text-cyan-300 font-mono block mt-0.5">
                          ₹{wallet?.balances?.referral.toFixed(2) || '0.00'}
                        </strong>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">Withdrawable Bonus</span>
                      </div>
                    </div>

                    {/* Fast Action Buttons */}
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => setActiveTab('add')}
                        className="flex-1 py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Top Up Cash</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('withdraw')}
                        className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Withdraw (UPI)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ADD FUNDS TAB */}
                {activeTab === 'add' && (
                  <form onSubmit={handleAddFunds} className="space-y-4">
                    <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                      <strong className="text-zinc-200">Optional Pre-Funding:</strong> You do not need to add funds to register for matches. However, you can top-up here if you prefer 1-click slot entries.
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                        Enter Top-up Amount (₹)
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
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
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
                      className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>{actionLoading ? 'Connecting to Razorpay...' : `Pay ₹${addAmount || 0} via UPI / Card (Razorpay)`}</span>
                    </button>

                    <div className="pt-2 flex items-center justify-center space-x-1.5 text-[10px] text-zinc-500 font-medium">
                      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>256-Bit Encrypted Payment • Direct UPI & Card Verification</span>
                    </div>
                  </form>
                )}

                {/* WITHDRAW TAB */}
                {activeTab === 'withdraw' && (
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    {/* KYC Verification Gate */}
                    {!isKycVerified ? (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <strong className="text-xs text-white">Mandatory KYC Verification Required</strong>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Under Indian IT Rules & DPDP compliance, PAN & State verification must be completed before requesting real-money withdrawals.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('kyc')}
                          className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-lg transition"
                        >
                          Complete KYC Verification Now &rarr;
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>KYC Verified ({userProfile.pan_name} • PAN: {userProfile.pan_number ? `${userProfile.pan_number.slice(0, 3)}••••${userProfile.pan_number.slice(-2)}` : 'Verified'})</span>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-zinc-400">{userProfile.state || 'India'}</span>
                      </div>
                    )}

                    <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs flex justify-between">
                      <span className="text-zinc-400">Available to Withdraw:</span>
                      <strong className="text-white font-mono">₹{wallet?.balances?.withdrawable.toFixed(2) || '0.00'}</strong>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-bold">
                        Withdrawal Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max={wallet?.balances?.withdrawable || 50000}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-4 py-2.5 text-base font-black text-white focus:outline-none focus:border-zinc-400 font-mono"
                        placeholder="Min ₹30"
                        required
                      />
                    </div>

                    {/* Pillar D: Section 194BA 30% TDS Compliance Breakdown Card */}
                    <div className="p-3.5 rounded-xl bg-[#111117] border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Gross Withdrawal:</span>
                        <span className="font-mono text-zinc-200 font-bold">₹{rawWithdraw.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-400/90">
                        <span className="flex items-center space-x-1">
                          <span>30% TDS (Section 194BA):</span>
                        </span>
                        <span className="font-mono font-bold">-₹{tds30.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-zinc-800/80 pt-2 flex items-center justify-between text-xs">
                        <strong className="text-emerald-400 uppercase tracking-wider text-[10px]">Net Payout to Your Account:</strong>
                        <strong className="text-base font-mono text-white">₹{netCredit.toFixed(2)}</strong>
                      </div>
                      <p className="text-[9px] text-zinc-500 pt-1 leading-relaxed border-t border-zinc-800/40">
                        * Under Section 194BA of the Indian Income Tax Act, 30% TDS is deducted on net winnings at withdrawal. Your TDS certificate will be logged for tax filing.
                      </p>
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
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={bankDetails.holderName}
                          onChange={(e) => setBankDetails({ ...bankDetails, holderName: e.target.value })}
                          placeholder="Account Holder Legal Name"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                          required
                        />
                        <input
                          type="text"
                          value={bankDetails.accountNumber}
                          onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                          placeholder="Bank Account Number"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          required
                        />
                        <input
                          type="text"
                          value={bankDetails.ifsc}
                          onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                          placeholder="IFSC Code (e.g. HDFC0001234)"
                          className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading || !isKycVerified || rawWithdraw < 30}
                      className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-lg"
                    >
                      {actionLoading
                        ? 'Submitting...'
                        : !isKycVerified
                        ? 'Complete KYC to Withdraw'
                        : `Withdraw Net ₹${netCredit.toFixed(2)} to ${payoutMethod === 'upi' ? 'UPI' : 'Bank'}`}
                    </button>
                  </form>
                )}

                {/* KYC & COMPLIANCE TAB */}
                {activeTab === 'kyc' && (
                  <div className="space-y-4">
                    {isKycVerified ? (
                      <div className="p-5 rounded-2xl bg-[#12121a] border border-emerald-500/40 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base font-black text-white">KYC Verification Completed</h4>
                          <p className="text-xs text-emerald-400 font-semibold mt-0.5">Section 194BA & DPDP Compliant</p>
                        </div>
                        <div className="bg-[#0e0e13] p-3 rounded-xl border border-zinc-800 text-left text-xs space-y-1.5 font-mono">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Legal Name:</span>
                            <strong className="text-zinc-200">{userProfile.pan_name || userProfile.name}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">PAN Number:</span>
                            <strong className="text-zinc-200">{userProfile.pan_number ? `${userProfile.pan_number.slice(0, 3)}••••${userProfile.pan_number.slice(-2)}` : 'VERIFIED'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">State:</span>
                            <strong className="text-zinc-200">{userProfile.state || 'Not Declared'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Age Status:</span>
                            <strong className="text-emerald-400">18+ Verified</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('withdraw')}
                          className="w-full py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110"
                        >
                          Proceed to Cashout &rarr;
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleKycSubmit} className="space-y-3.5">
                        <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                          <strong className="text-zinc-200 block mb-0.5">Statutory Identity & Tax Compliance:</strong>
                          In accordance with Section 194BA of the Income Tax Act and DPDP Rules, PAN and State of residence are mandatory to process cash prizes.
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-bold">
                            Full Legal Name (as printed on PAN)
                          </label>
                          <input
                            type="text"
                            value={kycForm.panName}
                            onChange={(e) => setKycForm({ ...kycForm, panName: e.target.value })}
                            placeholder="e.g. RAHUL SHARMA"
                            className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-bold">
                            PAN Card Number (10 alphanumeric digits)
                          </label>
                          <input
                            type="text"
                            maxLength="10"
                            value={kycForm.panNumber}
                            onChange={(e) => setKycForm({ ...kycForm, panNumber: e.target.value.toUpperCase() })}
                            placeholder="ABCDE1234F"
                            className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-zinc-400 font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-bold">
                            State of Residence
                          </label>
                          <select
                            value={kycForm.state}
                            onChange={(e) => setKycForm({ ...kycForm, state: e.target.value })}
                            className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                            required
                          >
                            <option value="">-- Select Your State --</option>
                            {INDIAN_STATES.map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name} {s.restricted ? '• [Prohibited State]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedStateIsRestricted && (
                          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] leading-relaxed">
                            <strong>Notice:</strong> Real-money contests are prohibited for residents of {kycForm.state} under State gaming legislation (Entry 34 State List).
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-bold">
                            Aadhaar Last 4 Digits (Optional)
                          </label>
                          <input
                            type="text"
                            maxLength="4"
                            value={kycForm.aadhaarLast4}
                            onChange={(e) => setKycForm({ ...kycForm, aadhaarLast4: e.target.value })}
                            placeholder="e.g. 8832"
                            className="w-full bg-[#14141a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                          />
                        </div>

                        <div className="flex items-start space-x-2 pt-1">
                          <input
                            type="checkbox"
                            id="is18Check"
                            checked={kycForm.is18Plus}
                            onChange={(e) => setKycForm({ ...kycForm, is18Plus: e.target.checked })}
                            className="mt-0.5 rounded border-zinc-700 text-black focus:ring-0 cursor-pointer"
                            required
                          />
                          <label htmlFor="is18Check" className="text-[10px] text-zinc-400 leading-tight cursor-pointer">
                            I declare that I am 18+ years of age, a resident of the declared state, and the details provided match my official government identity.
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={kycSubmitting || selectedStateIsRestricted || !kycForm.is18Plus}
                          className="w-full py-3 bg-silver-gradient hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-lg"
                        >
                          {kycSubmitting ? 'Verifying Details...' : 'Submit & Verify KYC'}
                        </button>
                      </form>
                    )}
                  </div>
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
                          className="p-3 bg-[#121218] rounded-xl border border-zinc-800 flex justify-between items-center text-xs"
                        >
                          <div className="space-y-0.5 max-w-[70%]">
                            <span className="font-bold text-zinc-200 block truncate">{tx.description || tx.type}</span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(tx.created_at).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-mono font-bold block ${
                                tx.type === 'deposit' || tx.type === 'winning' || tx.type === 'referral_bonus'
                                  ? 'text-emerald-400'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {tx.type === 'deposit' || tx.type === 'winning' || tx.type === 'referral_bonus' ? '+' : '-'}₹
                              {parseFloat(tx.amount).toFixed(2)}
                            </span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : tx.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
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
