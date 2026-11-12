import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearTokens, getTokens, saveTokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getTokens()?.access));

  const loadUser = useCallback(async () => {
    if (!getTokens()?.access) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const profile = await api.get("/accounts/me/");
      setUser(profile);
      return profile;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (credentials) => {
    const tokens = await api.post("/auth/login/", credentials);
    saveTokens(tokens);
    return loadUser();
  };

  const register = async (payload) => {
    await api.post("/auth/register/", payload);
    return login({ email: payload.email, password: payload.password });
  };

  const logout = async () => {
    const tokens = getTokens();
    try {
      if (tokens?.refresh) await api.post("/auth/logout/", { refresh: tokens.refresh });
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const value = { user, loading, login, register, logout, reloadUser: loadUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

