import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoanProvider } from './contexts/LoanContext';
import { Dashboard } from './pages/Dashboard';
import { Loans } from './pages/Loans';
import { Calendar } from './pages/Calendar';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Navigation } from './components/Navigation';
import { checkAndNotify } from './utils/notificationService';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;

    checkAndNotify();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotify();
      }
    };

    const onFocus = () => checkAndNotify();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Dashboard />
              <Navigation />
            </>
          }
        />
        <Route
          path="/loans"
          element={
            <>
              <Loans />
              <Navigation />
            </>
          }
        />
        <Route
          path="/calendar"
          element={
            <>
              <Calendar />
              <Navigation />
            </>
          }
        />
        <Route
          path="/reports"
          element={
            <>
              <Reports />
              <Navigation />
            </>
          }
        />
        <Route
          path="/settings"
          element={
            <>
              <Settings />
              <Navigation />
            </>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            borderRadius: '8px'
          }
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoanProvider>
          <AppContent />
        </LoanProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
