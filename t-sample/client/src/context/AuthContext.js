import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from token on initial render
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Set default headers for all axios requests
        axios.defaults.headers.common['x-auth-token'] = token;
        
        const res = await axios.get('/api/auth/me');
        
        setUser(res.data);
        setIsAuthenticated(true);
        setLoading(false);
      } catch (err) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['x-auth-token'];
        
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        setError('Authentication failed. Please log in again.');
      }
    };

    loadUser();
  }, []);

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      
      // Load user data
      const userRes = await axios.get('/api/auth/me');
      
      setUser(userRes.data);
      setIsAuthenticated(true);
      setError(null);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      return false;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['x-auth-token'];
    
    setUser(null);
    setIsAuthenticated(false);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};