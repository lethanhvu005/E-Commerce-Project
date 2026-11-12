import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authService, clearTokens, getTokens, saveTokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getTokens()?.access));

  const loadUser = useCallback(async () => {
    const tokens = getTokens();
    if (!tokens?.access) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials) => {
    const tokens = await authService.login(credentials);
    saveTokens(tokens);
    return loadUser();
  };

  const register = async (payload) => {
    await authService.register(payload);
    return login({ email: payload.email, password: payload.password });
  };

  const logout = async () => {
    const tokens = getTokens();
    try {
      if (tokens?.refresh) {
        await authService.logout(tokens.refresh);
      }
    } catch {
      // Ignore backend revocation error if token already expired/invalid
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    reloadUser: loadUser,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
