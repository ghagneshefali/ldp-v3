import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import HistoryPage from './pages/HistoryPage';
import Layout from './components/Layout';

const P = ({ children }) => { const { isAuth } = useAuth(); return isAuth ? children : <Navigate to="/login" replace />; };

const AppRoutes = () => {
  const { isAuth } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<P><Layout><DashboardPage /></Layout></P>} />
      <Route path="/pipeline" element={<P><Layout><PipelinePage /></Layout></P>} />
      <Route path="/history" element={<P><Layout><HistoryPage /></Layout></P>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>;
}
