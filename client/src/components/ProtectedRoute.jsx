import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FullPageLoader from './FullPageLoader.jsx';

/**
 * Guards a branch of the route tree. While the initial session refresh is in
 * flight we hold the render, otherwise a signed-in user would flash /login.
 */
const SET_PASSWORD_PATH = '/set-password';

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, initializing, user } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageLoader label="Restoring your session" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  /*
   * A temporary password the placement office issued has to be replaced before
   * anything else is reachable.
   *
   * Without this the officer who read it out holds a working credential for the
   * account for as long as the student never gets round to changing it, and
   * "temporary" describes the wording of the response rather than the system.
   *
   * The destination is exempted, or this guard would redirect to a page it
   * refuses to render.
   */
  if (user.mustChangePassword && location.pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <Outlet />;
}
