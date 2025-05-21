// src/App.js
import React from 'react';
import Header from './components/Header';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Tournaments from './components/Tournaments';
import Payment from './components/Payment';



const App = () => {
  return (
    <div className="bg-gradient-to-br">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path='/payment' element={<Payment></Payment>} />
     
      </Routes>
    </div>
  );
};

export default App;
