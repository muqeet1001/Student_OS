import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';

const navLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Profile', path: '/profile', icon: 'person' },
  { label: 'Skill Test', path: '/skill-test', icon: 'quiz' },
  { label: 'Coding Practice', path: '/coding-practice', icon: 'code' },
  { label: 'PYQs', path: '/pyq-library', icon: 'history_edu' },
  { label: 'Resume Builder', path: '/resume-builder', icon: 'description' },
  { label: 'AI Interview', path: '/ai-interview', icon: 'psychology' },
];

export default function SideNavBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="fixed left-0 top-0 h-full z-40 py-8 flex flex-col justify-between h-screen w-72 bg-[#0e0e0e] dark:bg-[#0e0e0e] rounded-r-[3rem] overflow-hidden shadow-[0px_24px_48px_rgba(14,14,14,0.06)] font-plus-jakarta text-sm font-medium tracking-wide">
      <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1 pb-4">
        {/* Branding Header */}
        <div className="px-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ff784e] rounded-xl flex items-center justify-center shadow-lg shadow-[#ff784e]/20">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: '"FILL" 1' }}>school</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-tighter">Student OS</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-0.5">Structured Playground</span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex flex-col">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 rounded-full mx-4 mb-1 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-[#ff784e] text-white shadow-lg shadow-[#ff784e]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#f9f6f5]/10 hover:scale-[1.02]'
                }`
              }
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              <span className="font-['Plus_Jakarta_Sans'] font-medium text-sm tracking-wide">{link.label}</span>
            </NavLink>
          ))}

        </nav>
      </div>

      {/* Bottom Actions and User Profile */}
      <div className="px-4 mt-auto space-y-4 pt-4 border-t border-white/5">
        {/* Promo Upgrade Banner */}
        <div className="bg-stone-900/50 p-6 rounded-xl mx-2 border border-white/5">
          <p className="text-white text-sm font-bold mb-1">Upgrade to Pro</p>
          <p className="text-stone-400 text-xs mb-4">Get unlimited AI interviews & project feedback.</p>
          <button className="w-full py-2.5 bg-[#ff784e] hover:bg-[#ff784e]/90 text-white font-bold text-xs rounded-full transition-colors active:scale-95">
            Upgrade Now
          </button>
        </div>

        {/* User Card Widget & Logout */}
        <div className="flex items-center justify-between p-2 bg-white/5 rounded-2xl mx-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar user={user} size={40} className="rounded-xl" />
            <div className="flex flex-col min-w-0">
              <span className="text-white text-xs font-bold truncate">{user?.name || 'Student'}</span>
              <span className="text-gray-500 text-[10px] capitalize">{user?.role || 'student'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
