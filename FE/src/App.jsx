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

  // Automatic Website Visitor Counter & Traffic Intelligence
  React.useEffect(() => {
    if (isAdminRoute) return;

    try {
      let visitorId = localStorage.getItem('le_visitor_id');
      if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('le_visitor_id', visitorId);
      }

      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const apiUrl = import.meta.env.VITE_API_URL || '';

      fetch(`${apiUrl}/api/track-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          path: location.pathname,
          deviceType: isMobile ? 'mobile' : 'desktop',
          userId: user?.id || null,
        }),
      }).catch(() => {});
    } catch (e) {
      // Non-blocking
    }
  }, [location.pathname, isAdminRoute]);

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
