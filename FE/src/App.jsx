// src/App.jsx
import React from 'react';
import Header from './components/Header';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './components/Home';
import Tournaments from './components/Tournaments';
import Payment from './components/Payment';
import PlayerMatches from './components/PlayerSolte';
import Login from './components/Login';
import AffiliateDashboard from './components/AffiliateDashboard';
import ReferAndEarn from './components/ReferAndEarn';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import WinterEffect from './components/WinterEffect';
import MatchNotificationManager from './components/MatchNotificationManager';
import Leaderboard from './components/Leaderboard';
import Terms from './components/Terms';
import Footer from './components/Footer';

const App = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  React.useEffect(() => {
    const titles = {
      '/': 'LocalEsport - Competitive Gaming Platform',
      '/tournaments': 'Tournaments | LocalEsport',
      '/leaderboard': 'Weekly Leaderboard | LocalEsport',
      '/yourmatches': 'My Matches & Room Access | LocalEsport',
      '/login': 'Sign In & Register | LocalEsport',
      '/affiliate': 'Affiliate Partner Portal | LocalEsport',
      '/refer-and-earn': 'Refer & Earn Cash | LocalEsport',
      '/admin': 'Organizer Console | LocalEsport',
      '/admin/login': 'Admin Portal | LocalEsport',
      '/terms': 'Terms of Service & Rules | LocalEsport',
      '/fairplay': 'Fair Play & Anti-Cheat | LocalEsport',
      '/rules': 'Restricted States & Compliance | LocalEsport',
      '/payment': 'Wallet Deposit | LocalEsport',
    };
    document.title = titles[location.pathname] || 'LocalEsport - Competitive Gaming Platform';
  }, [location.pathname]);

  return (
    <div className="bg-[#0a0a0e] min-h-screen text-white">
      {!isAdminRoute && <WinterEffect />}
      {!isAdminRoute && <MatchNotificationManager />}
      {!isAdminRoute && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/yourmatches" element={<PlayerMatches />} />
        <Route path="/login" element={<Login />} />
        <Route path="/affiliate" element={<AffiliateDashboard />} />
        <Route path="/refer-and-earn" element={<ReferAndEarn />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/fairplay" element={<Terms />} />
        <Route path="/rules" element={<Terms />} />
      </Routes>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default App;
