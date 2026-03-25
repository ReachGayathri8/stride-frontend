import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const NAV = [
  { path:'/dashboard', label:'Dashboard',  icon:'⚡' },
  { path:'/exercises', label:'Exercises',   icon:'🏋️' },
  { path:'/planner',   label:'Planner',     icon:'📅' },
  { path:'/workout',   label:'Workout',     icon:'🎯' },
  { path:'/diet',      label:'Diet Plan',   icon:'🥗' },
  { path:'/history',   label:'History',     icon:'📊' },
  { path:'/profile',   label:'Profile',     icon:'👤' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">STRIDE AI</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink
              key={n.path} to={n.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? 'U'}</div>
            <div>
              <div className="user-name">{user?.name ?? 'Athlete'}</div>
              <div className="user-goal">{user?.fitnessGoal ?? 'Fitness'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)}>☰</button>
          <span className="topbar-title">STRIDE AI</span>
          <div className="topbar-right">
            <span className="badge badge-accent">{user?.fitnessGoal ?? 'Fitness'}</span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}