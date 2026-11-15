import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [preloadedDashboardData, setPreloadedDashboardData] = useState(null);

  
  const login = (authToken, authRole, authUser, preloadedData = null) => {
    setToken(authToken);
    setRole(authRole);
    setUser(authUser);
    if (preloadedData) {
      setPreloadedDashboardData(preloadedData);
    }
    localStorage.setItem('token', authToken);
    localStorage.setItem('role', authRole);
    localStorage.setItem('user', JSON.stringify(authUser));
  };

  const consumePreloadedData = (expectedRole) => {
    if (preloadedDashboardData && (!expectedRole || preloadedDashboardData.role === expectedRole)) {
      const data = preloadedDashboardData.data;
      setPreloadedDashboardData(null);
      return data;
    }
    return null;
  };

  const logout = () => {
    
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('examai:cleanup-camera'));
      } catch (e) {}
      try {
        if (typeof document !== 'undefined') {
          document.querySelectorAll('video').forEach((v) => {
            if (v && v.srcObject && v.srcObject.getTracks) {
              v.srcObject.getTracks().forEach((track) => {
                try {
                  track.stop();
                  track.enabled = false;
                } catch (e) {}
              });
              v.srcObject = null;
            }
          });
        }
      } catch (e) {}
    }

    setToken(null);
    setRole(null);
    setUser(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remembered_admin_email');
      sessionStorage.clear();
    } catch  {}
  };

  const refreshProfile = async () => {
    if (!token || !role) {
      setLoading(false);
      return;
    }
    try {
      let endpoint = '';
      if (role === 'student') endpoint = '/students/me';
      else if (role === 'teacher') endpoint = '/teachers/me';
      else if (role === 'admin') endpoint = '/admins/me';

      if (endpoint) {
        const response = await apiClient.get(endpoint);
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (err) {
      console.warn('Profile refresh failed, session may be expired:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        loading,
        preloadedDashboardData,
        setPreloadedDashboardData,
        consumePreloadedData,
        login,
        logout,
        refreshProfile,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
