import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Header';
import Dashboard from './components/Dashboard';
import Pendingslote from './components/Pending-slote';

export default function App() {
  return (
    
      <div className="flex h-screen bg-gray-950 text-white">
        
        {/* Sidebar: 30% */}
        <div className="w-[15%]">
          <Sidebar />
        </div>

        {/* Main content: 70% */}
        <div className="w-[70%] overflow-y-auto">
         
          <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path='/pending-matches' element={<Pendingslote></Pendingslote>} />
     
    
      </Routes>
        </div>

      </div>
   
  );
}
