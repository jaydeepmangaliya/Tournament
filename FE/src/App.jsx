// src/App.js
import React from 'react';
import Header from './components/Header';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Tournaments from './components/Tournaments';
import Payment from './components/Payment';
import PlayerMatches from './components/PlayerSolte';
import Login from './components/Login';



const App = () => {
  React.useEffect(() => {
    document.title = "GameArena";
    // Set a gaming-related favicon (controller emoji SVG)
    const faviconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="64" height="64" rx="16" fill="#111"/>
        <text x="50%" y="54%" text-anchor="middle" font-size="38" dy=".3em">🎮</text>
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
    <div className="bg-gradient-to-br">
      <Header />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path='/yourmatches' element={<PlayerMatches></PlayerMatches>}></Route>
        <Route path="/login" element={<Login></Login>} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path='/payment' element={<Payment></Payment>} />
     
      </Routes>
    </div>
  );
};

export default App;
