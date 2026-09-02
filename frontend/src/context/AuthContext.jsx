import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('lyallpur_user');
    const token = localStorage.getItem('lyallpur_token');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify with /auth/me
        client.get('/auth/me')
          .then((res) => {
            setUser(res.data);
            localStorage.setItem('lyallpur_user', JSON.stringify(res.data));
          })
          .catch(() => {
            setUser(null);
            localStorage.removeItem('lyallpur_user');
            localStorage.removeItem('lyallpur_token');
          });
      } catch (e) {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (phoneOrEmail, password) => {
    const response = await client.post('/auth/login', {
      phone_or_email: phoneOrEmail,
      password: password
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('lyallpur_token', access_token);
    localStorage.setItem('lyallpur_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async ({ fullName, phoneNumber, email, password }) => {
    const response = await client.post('/auth/register', {
      full_name: fullName,
      phone_number: phoneNumber,
      email: email || null,
      password: password
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('lyallpur_token', access_token);
    localStorage.setItem('lyallpur_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('lyallpur_token');
    localStorage.removeItem('lyallpur_user');
    setUser(null);
  };

  const hasRole = (roleName) => Boolean(
    user?.roles?.includes(roleName) || user?.roles?.includes('admin') || user?.is_admin
  );

  const hasPermission = (code) => Boolean(
    user?.roles?.includes('admin') ||
    user?.is_admin ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes(code)
  );

  const isAdmin = Boolean(user?.roles?.includes('admin') || user?.is_admin);
  const isSeller = Boolean(user?.roles?.includes('seller'));
  const isRider = Boolean(user?.roles?.includes('rider'));
  const isCustomer = Boolean(user && (!isSeller && !isRider && !isAdmin)) || Boolean(user?.roles?.includes('customer'));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        isAdmin,
        isSeller,
        isRider,
        isCustomer
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
