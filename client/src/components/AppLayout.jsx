import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNavBar from './SideNavBar.jsx';
import MobileRouteNav from './MobileRouteNav.jsx';

/**
 * Chrome shared by every signed-in screen: the navigation rail, the mobile
 * drawer trigger and the bottom bar. Pages render only their own content.
 */
export default function AppLayout({ bottomNav = true }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // A route change should never leave the drawer covering the new page.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh bg-background text-on-surface">
      <SideNavBar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden fixed top-4 left-4 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-lg border border-outline-variant/20"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <div className={`lg:pl-60 ${bottomNav ? 'pb-24 lg:pb-0' : ''}`}>
        <Outlet />
      </div>

      {bottomNav && <MobileRouteNav />}
    </div>
  );
}
