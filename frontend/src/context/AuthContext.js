import React, { createContext, useContext, useState } from 'react';
import { authApi } from '../utils/api';
const Ctx = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { try { const t=localStorage.getItem('token'),u=localStorage.getItem('user'); return t&&u?JSON.parse(u):null; } catch{return null;} });
  const [loading, setLoading] = useState(false);
  const login = async (email, password) => {
    setLoading(true);
    try { const {data}=await authApi.login({email,password}); localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); setUser(data.user); return data; }
    finally{setLoading(false);}
  };
  const register = async (username, email, password) => {
    setLoading(true);
    try { const {data}=await authApi.register({username,email,password}); localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); setUser(data.user); return data; }
    finally{setLoading(false);}
  };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  return <Ctx.Provider value={{user,loading,login,register,logout,isAuth:!!user}}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
