import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ReferAndEarn() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL || ""}/api/referral/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.status) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Referral dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, []);

  const referralCode = data?.referralCode || 'ESPORT';
  const referralLink = `${window.location.origin}/login?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const text = `Join me on LocalEsport to play Free Fire & PUBG tournaments for FREE! Win Booyah to earn ₹50 Cash, plus sign up using my referral link: ${referralLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex items-center justify-center pt-20">
        <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Loading referral info...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Hero Card */}
        <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-xl space-y-4">
          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Player Referral Program
          </span>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white">
            Invite Friends. <span className="text-amber-400">Earn ₹10 Cash Per Friend.</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
            Invite your squad! Every time a friend signs up using your referral code or link, you instantly get <strong className="text-amber-400">₹10.00 cash credited directly to your wallet</strong>. Play 100% free tournaments, win Booyah to earn ₹50 cash, and <strong className="text-white">withdraw your earnings directly to your UPI ID</strong>.
          </p>

          {/* Referral Link & Share */}
          <div className="pt-2 space-y-3 max-w-lg">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="bg-[#121218] border border-zinc-700 px-4 py-3 rounded-xl flex-1 text-xs font-mono text-zinc-300 select-all truncate">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className="px-5 py-3 bg-silver-gradient hover:brightness-110 font-black text-black rounded-xl transition text-xs uppercase tracking-wider flex-shrink-0"
              >
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>

            <button
              onClick={shareOnWhatsApp}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 font-bold rounded-xl transition text-xs uppercase tracking-wider shadow-sm flex items-center justify-center space-x-2"
            >
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Friends Referred</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{data?.totalFriends || 0}</h3>
          </div>
          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Total Cash Earned</span>
            <h3 className="text-2xl sm:text-3xl font-black text-silver">₹{(data?.totalEarned || 0).toFixed(2)}</h3>
          </div>
          <div className="bg-[#0c0c10] p-4 sm:p-5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Usable / Withdrawable</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              ₹{(data?.currentReferralBalance || 0).toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Referred Friends */}
        <div className="bg-[#0c0c10] rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-base font-bold text-white uppercase tracking-wider mb-4">Referred Friends List</h2>
          {(!data?.referredFriends || data.referredFriends.length === 0) ? (
            <p className="text-center py-8 text-zinc-500 text-xs">
              You haven't referred any friends yet. Share your link above to get started!
            </p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {data.referredFriends.map((friend) => (
                <div key={friend.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-white">{friend.name || 'Gamer'}</h4>
                    <span className="text-zinc-500 text-[10px] font-mono">{friend.email}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-silver">{friend.tournaments_played} Matches Played</span>
                    <span className="block text-zinc-500 text-[10px] font-mono">
                      Joined {new Date(friend.joined_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
