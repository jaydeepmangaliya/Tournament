import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PLAYER_SIZE = 48;

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPendingMatches: 0,
    totalCompletedMatches: 0,
    totalMatches: 0,
    totalMoneyInvested: 0,
    totalProfit: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:2000/api/slotes')
      .then(response => {
        const data = response.data.data;
        
        // Normalize rows to array
        const rows = Array.isArray(data.rows) ? data.rows : [data.rows];

        const totalPendingMatches = rows.filter(row => row.iscomplated === 'pending').length;
        const totalCompletedMatches = rows.filter(row => row.iscomplated === 'completed').length;
        const totalMatches = data.total.total || rows.length;

        // Total money invested = sum of entry fees
        const totalMoneyInvested = rows.reduce((acc, row) => acc + (row.entryFee || 0), 0);

        // Total profit = sum over slots of (entryFee * PLAYER_SIZE - prizePool)
        const totalProfit = rows.reduce((acc, row) => {
          const entryFee = row.entryFee || 0;
          const prizePool = row.prizePool || 0;
          return acc + (entryFee * PLAYER_SIZE - prizePool);
        }, 0);

        setStats({
          totalPendingMatches,
          totalCompletedMatches,
          totalMatches,
          totalMoneyInvested,
          totalProfit,
        });
      })
      .catch(err => {
        console.error('Failed to fetch slot data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-white p-4 text-center sm:text-left">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-black text-white">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center sm:text-left">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <DashboardCard title="Pending Matches" value={stats.totalPendingMatches} color="text-yellow-400" />
        <DashboardCard title="Completed Matches" value={stats.totalCompletedMatches} color="text-green-400" />
        <DashboardCard title="Total Matches" value={stats.totalMatches} color="text-blue-400" />
        <DashboardCard title="Money Invested" value={`₹${stats.totalMoneyInvested*48}`} color="text-purple-400" />
        <DashboardCard title="Total Profit" value={`₹${stats.totalProfit}`} color="text-pink-400" />
      </div>
    </div>
  );
}

function DashboardCard({ title, value, color }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition duration-200 transform hover:scale-[1.02] flex flex-col justify-between min-h-[120px]">
      <h2 className="text-base sm:text-lg md:text-xl font-medium mb-2">{title}</h2>
      <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
