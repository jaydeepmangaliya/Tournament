// src/App.jsx
import React from 'react';
import Header from './components/Header';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Tournaments from './components/Tournaments';
import Payment from './components/Payment';
import PlayerMatches from './components/PlayerSolte';
import Login from './components/Login';
import AffiliateDashboard from './components/AffiliateDashboard';
import ReferAndEarn from './components/ReferAndEarn';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';

const App = () => {
  React.useEffect(() => {
    document.title = "LocalEsport - Competitive Gaming Platform";
    const faviconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#09090b" stroke="#71717a" stroke-width="2"/>
        <path d="M32 14L46 23V41L32 50L18 41V23L32 14Z" fill="none" stroke="#e4e4e7" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M26 32L30 36L38 28" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    const faviconUrl = "data:image/svg+xml," + encodeURIComponent(faviconSvg);
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;
  }, []);

  return (
    <div className="bg-[#0a0a0e] min-h-screen text-white">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/yourmatches" element={<PlayerMatches />} />
        <Route path="/login" element={<Login />} />
        <Route path="/affiliate" element={<AffiliateDashboard />} />
        <Route path="/refer-and-earn" element={<ReferAndEarn />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/payment" element={<Payment />} />
      </Routes>
    </div>
  );
};

export default App;
