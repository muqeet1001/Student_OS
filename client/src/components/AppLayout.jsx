import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNavBar from './SideNavBar.jsx';
import MobileRouteNav from './MobileRouteNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

/**
 * Chrome shared by every signed-in screen: the navigation rail, the mobile
 * drawer trigger and the bottom bar. Pages render only their own content.
 */
export default function AppLayout({ bottomNav = true }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  // A route change should never leave the drawer covering the new page.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  async function resendVerification() {
    setResending(true);
    setResendStatus(null);
    try {
      await api.post('/auth/resend-verification', { email: user?.email });
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-on-surface">
      <SideNavBar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden fixed top-4 left-4 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-outline-variant/20"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <div className={`lg:pl-60 ${bottomNav ? 'pb-24 lg:pb-0' : ''}`}>
        {user && user.isVerified === false && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined text-base">mail</span>
              <span>Your email address ({user.email}) is not verified yet.</span>
            </div>
            <div>
              {resendStatus === 'sent' ? (
                <span className="text-green-700 font-bold text-xs bg-green-100 px-3 py-1 rounded-full">
                  Verification email sent!
                </span>
              ) : resendStatus === 'error' ? (
                <span className="text-error font-bold text-xs">Could not send email.</span>
              ) : (
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resending}
                  className="px-3 py-1 bg-primary text-on-primary rounded-full font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend Verification Link'}
                </button>
              )}
            </div>
          </div>
        )}
        <Outlet />
      </div>

      {bottomNav && <MobileRouteNav />}
    </div>
  );
}

