import React from 'react';
import { NavLink } from 'react-router-dom';
import { pages } from '../routes/pageRegistry.js';

export default function MobileRouteNav() {
  return (
    <nav className="mobile-route-nav" aria-label="Mobile navigation">
      {pages.map((page) => (
        <NavLink
          className={({ isActive }) => (isActive ? 'mobile-route-link active' : 'mobile-route-link')}
          key={page.path}
          to={page.path}
          title={page.label}
        >
          <span className="mobile-route-icon material-symbols-outlined">{page.icon}</span>
          <span className="mobile-route-label">{page.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
