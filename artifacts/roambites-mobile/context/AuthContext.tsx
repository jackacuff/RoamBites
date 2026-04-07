import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMe,
  setAuthTokenGetter,
  type UserResponse,
} from "@workspace/api-client-react";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isLoading: boolean;
  login: (token: string, user: UserResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

const TOKEN_KEY = "@roambites_token";

let _currentToken: string | null = null;

setAuthTokenGetter(() => _currentToken);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          _currentToken = storedToken;
          setToken(storedToken);
          try {
            const userData = await getMe();
            setUser(userData);
          } catch {
            _currentToken = null;
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch (err) {
        console.error("Error restoring auth", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string, newUser: UserResponse) => {
    _currentToken = newToken;
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    _currentToken = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch {
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
