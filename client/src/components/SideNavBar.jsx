import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { navLinks } from '../routes/pageRegistry.js';

/**
 * Fixed navigation rail. Below `lg` it becomes an off-canvas drawer driven by
 * `open`, so the same markup serves both breakpoints.
 */
export default function SideNavBar({ open = false, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Scrim, only interactive while the drawer is open on small screens. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-dvh w-72 flex flex-col justify-between py-8 bg-[#0e0e0e] rounded-r-xl overflow-hidden shadow-[0px_24px_48px_rgba(14,14,14,0.06)] font-headline text-sm font-medium tracking-wide transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1 pb-4">
          <div className="px-8 flex items-center justify-between gap-3">
            <NavLink to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
              <div className="w-10 h-10 bg-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary-container/20">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  school
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white tracking-tighter">Student OS</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-0.5">
                  Structured Playground
                </span>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="lg:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="flex flex-col" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-4 rounded-full mx-4 mb-1 transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <span className="material-symbols-outlined">{link.icon}</span>
                <span className="font-medium text-sm tracking-wide">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="px-4 mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-2xl mx-2">
            <NavLink
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3 min-w-0 rounded-xl"
            >
              <Avatar user={user} size={40} className="rounded-2xl" />
              <div className="flex flex-col min-w-0">
                <span className="text-white text-xs font-bold truncate">{user?.name || 'Student'}</span>
                <span className="text-gray-500 text-[10px] capitalize">{user?.role || 'student'}</span>
              </div>
            </NavLink>
            <button
              type="button"
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
    </>
  );
}
