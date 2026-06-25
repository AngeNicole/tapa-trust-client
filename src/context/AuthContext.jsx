import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  registerUser,
  loginUser,
  fetchMe,
  setToken,
  getToken,
} from '../api/client.js';

const AuthContext = createContext(null);

// Where each role goes after authenticating.
export function homePathForRole(role) {
  if (role === 'worker') return '/worker';
  if (role === 'admin') return '/admin';
  return '/requester';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session

  // On load, if we have a stored token, restore the session via /auth/me.
  useEffect(() => {
    let active = true;
    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user: u } = await fetchMe();
        if (active) setUser(u);
      } catch {
        // Token invalid/expired: clear it.
        setToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: u } = await loginUser(credentials);
    setToken(token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: u } = await registerUser(payload);
    setToken(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Re-fetch the current user (e.g. after editing personal details).
  const refreshUser = useCallback(async () => {
    try {
      const { user: u } = await fetchMe();
      setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  const value = { user, loading, login, register, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
