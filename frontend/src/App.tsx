import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import UploaderDashboard from './pages/UploaderDashboard';
import QCDashboard from './pages/QCDashboard';
import QCInterface from './pages/QCInterface';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorReview from './pages/SupervisorReview';
import { authService } from './services/authService';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return authService.isAuthenticated() ? <>{children}</> : <Navigate to="/" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  return authService.isAuthenticated() && user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" />;
};

const UploaderRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  const allowedRoles = ['upload_user', 'admin'];
  return authService.isAuthenticated() && allowedRoles.includes(user?.role || '') ? <>{children}</> : <Navigate to="/dashboard" />;
};

const QCRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  const allowedRoles = ['qc_user', 'admin'];
  return authService.isAuthenticated() && allowedRoles.includes(user?.role || '') ? <>{children}</> : <Navigate to="/dashboard" />;
};

const SupervisorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  const allowedRoles = ['supervisor', 'admin'];
  return authService.isAuthenticated() && allowedRoles.includes(user?.role || '') ? <>{children}</> : <Navigate to="/dashboard" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return authService.isAuthenticated() ? <Navigate to="/dashboard" /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } 
          />
          <Route 
            path="/upload" 
            element={
              <UploaderRoute>
                <UploaderDashboard />
              </UploaderRoute>
            } 
          />
          <Route 
            path="/qc" 
            element={
              <QCRoute>
                <QCDashboard />
              </QCRoute>
            } 
          />
          <Route 
            path="/qc/review/:batchId" 
            element={
              <QCRoute>
                <QCInterface />
              </QCRoute>
            } 
          />
          <Route 
            path="/supervisor" 
            element={
              <SupervisorRoute>
                <SupervisorDashboard />
              </SupervisorRoute>
            } 
          />
          <Route 
            path="/supervisor/review" 
            element={
              <SupervisorRoute>
                <SupervisorReview />
              </SupervisorRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;