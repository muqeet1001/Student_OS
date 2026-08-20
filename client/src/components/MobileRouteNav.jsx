import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { adminLinks, mobileLinks } from '../routes/pageRegistry.js';

export default function MobileRouteNav() {
  const { user } = useAuth();
  const location = useLocation();
  const visibleLinks = user?.role === 'admin'
    ? adminLinks.filter((link) => ['/admin/overview', '/admin/students', '/admin/drives', '/admin/tasks', '/admin/outcomes'].includes(link.path))
    : mobileLinks;

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-xl border-t border-outline-variant/30"
    >
      {visibleLinks.map((link) => (
        <NavLink
          key={link.path}
          to={`${link.path}${user?.role === 'admin' && location.search.includes('year=') ? location.search : ''}`}
          className={({ isActive }) =>
            `flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-[10px] font-bold transition-colors ${
              isActive ? 'bg-primary-container text-white' : 'text-outline hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
          <span className="truncate max-w-full">{link.short}</span>
        </NavLink>
      ))}
    </nav>
  );
}
