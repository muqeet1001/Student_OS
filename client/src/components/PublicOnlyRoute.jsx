import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FullPageLoader from './FullPageLoader.jsx';

/** Keeps signed-in users off the sign-in and sign-up screens. */
export default function PublicOnlyRoute() {
  const { isAuthenticated, isAdmin, initializing } = useAuth();

  if (initializing) return <FullPageLoader label="Restoring your session" />;
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;

  return <Outlet />;
}
