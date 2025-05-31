import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="bg-gray-900 text-white h-full w-full p-6 flex flex-col justify-between shadow-lg">
      <div>
        {/* Logo */}
        <div className="flex items-center mb-10 cursor-pointer">
          <svg
            className="w-10 h-10 mr-3 text-blue-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7v4a1 1 0 001 1h3m10-5v4a1 1 0 01-1 1h-3m-4 5v-6a1 1 0 011-1h4a1 1 0 011 1v6"
            />
          </svg>
          <span className="text-2xl font-semibold">Admin Panel</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col space-y-5 text-lg">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `transition-colors duration-200 ${
                isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-400'
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/pending-matches"
            className={({ isActive }) =>
              `transition-colors duration-200 ${
                isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-400'
              }`
            }
          >
            Pending Matches
          </NavLink>

          <NavLink
            to="/completed-matches"
            className={({ isActive }) =>
              `transition-colors duration-200 ${
                isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-400'
              }`
            }
          >
            Completed Matches
          </NavLink>
        </nav>
      </div>

      {/* Logout */}
      <div className="mt-10">
        <a href="#" className="text-red-500 hover:text-red-400 transition-colors duration-200">
          Logout
        </a>
      </div>
    </aside>
  );
}
