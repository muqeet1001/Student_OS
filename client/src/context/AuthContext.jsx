import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionExpired, setAccessToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `initializing` covers the first refresh attempt on page load, so guarded
  // routes can wait instead of bouncing a signed-in user to /login.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .refresh()
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {
        // No valid session cookie — the visitor is simply signed out.
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const login = useCallback(async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await api.post('/auth/register', details);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  /**
   * Adopts a session the server handed back from somewhere other than the login
   * form — completing a password reset, or replacing a temporary password.
   *
   * The same bookkeeping as `login`, without a second round trip: those
   * endpoints have already proved who the caller is and already issued a token.
   */
  const adoptSession = useCallback((data) => {
    if (data?.accessToken) setAccessToken(data.accessToken);
    if (data?.user) setUser(data.user);
    return data?.user ?? null;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      initializing,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      adoptSession,
      logout,
    }),
    [user, initializing, login, register, adoptSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
