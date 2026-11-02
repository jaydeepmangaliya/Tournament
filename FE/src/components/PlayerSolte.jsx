import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function PlayerMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPass, setCopiedPass] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchMyMatches = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tournaments/my-matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.status) {
        setMatches(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching my matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyMatches();
  }, []);

  const copyText = (text, type, matchId) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(matchId);
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      setCopiedPass(matchId);
      setTimeout(() => setCopiedPass(null), 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#e4e4e7] flex items-center justify-center pt-20">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Loading registered matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#e4e4e7] pt-24 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="6" width="20" height="12" rx="3" />
                <path d="M6 12h4m-2-2v4m8-2h.01m3 0h.01" />
              </svg>
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">Your Registered <span className="text-silver">Matches</span></h1>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Access your assigned slot numbers, squad team details, and room credentials
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="bg-[#0c0c10] rounded-2xl border border-zinc-800 p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">No Tournaments Registered Yet</h3>
            <p className="text-zinc-400 text-xs max-w-md mx-auto">
              You haven't registered for any Free Fire or PUBG matches yet. Head over to the tournament lobby to join!
            </p>
            <button
              onClick={() => navigate('/tournaments')}
              className="px-6 py-2.5 bg-silver-gradient text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:brightness-110"
            >
              Browse Tournaments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {matches.map((m) => (
              <motion.div
                key={m.id}
                whileHover={{ y: -3 }}
                className="bg-[#0c0c10] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 transition"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {m.game_name} • {m.format.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 leading-snug">{m.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-white text-black text-xs font-black">
                      Slot #{m.my_slot_number}
                    </span>
                  </div>
                </div>

                {/* Team Info */}
                <div className="bg-[#121218] p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Team Name:</span>
                    <strong className="text-white text-xs">{m.my_team_name}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Match Time:</span>
                    <strong className="text-silver font-mono text-xs">
                      {new Date(m.match_start_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </strong>
                  </div>
                </div>

                {/* Room ID & Password Box */}
                <div className="bg-[#121218] border border-zinc-700 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                      <svg className="w-3.5 h-3.5 text-silver" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="8" cy="15" r="4" />
                        <path d="M10.85 12.15L19 4" />
                        <path d="M18 5l2 2" />
                        <path d="M15 8l2 2" />
                      </svg>
                      <span>Custom Room Credentials</span>
                    </span>
                    {m.has_room_credentials ? (
                      <span className="text-[10px] bg-zinc-800 border border-zinc-600 text-white px-2 py-0.5 rounded font-black uppercase">
                        ROOM READY
                      </span>
                    ) : (
                      <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">
                        OPENS 15M BEFORE
                      </span>
                    )}
                  </div>

                  {m.has_room_credentials ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="bg-[#0a0a0e] p-2.5 rounded-lg border border-zinc-800 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Room ID</span>
                          <span className="text-xs font-mono font-bold text-white">{m.room_id}</span>
                        </div>
                        <button
                          onClick={() => copyText(m.room_id, 'id', m.id)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-300 font-bold uppercase tracking-wider"
                        >
                          {copiedId === m.id ? 'COPIED' : 'COPY'}
                        </button>
                      </div>

                      <div className="bg-[#0a0a0e] p-2.5 rounded-lg border border-zinc-800 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Password</span>
                          <span className="text-xs font-mono font-bold text-white">{m.room_password}</span>
                        </div>
                        <button
                          onClick={() => copyText(m.room_password, 'pass', m.id)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded text-zinc-300 font-bold uppercase tracking-wider"
                        >
                          {copiedPass === m.id ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 pt-1">
                      Room ID and Password will unlock right here 15 minutes before the match start time. Make sure you enter the custom room in your assigned Slot #{m.my_slot_number}!
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
