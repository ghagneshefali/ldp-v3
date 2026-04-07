import React, { createContext, useContext, useState } from 'react';
import { authApi } from '../utils/api';
const Ctx = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { try { const t=localStorage.getItem('token'),u=localStorage.getItem('user'),time=localStorage.getItem('loginTime'); if (t&&u&&time && Date.now() - parseInt(time) < 2 * 60 * 60 * 1000) return JSON.parse(u); localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('loginTime'); return null; } catch{return null;} });
  const [loading, setLoading] = useState(false);
  const login = async (email, password) => {
    setLoading(true);
    try { const {data}=await authApi.login({email,password}); localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); localStorage.setItem('loginTime', Date.now()); setUser(data.user); return data; }
    finally{setLoading(false);}
  };
  const register = async (username, email, password) => {
    setLoading(true);
    try { const {data}=await authApi.register({username,email,password}); localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); localStorage.setItem('loginTime', Date.now()); setUser(data.user); return data; }
    finally{setLoading(false);}
  };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('loginTime'); setUser(null); };
  return <Ctx.Provider value={{user,loading,login,register,logout,isAuth:!!user}}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
