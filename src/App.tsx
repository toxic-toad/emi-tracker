import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoanProvider } from './contexts/LoanContext';
import { Dashboard } from './pages/Dashboard';
import { Loans } from './pages/Loans';
import { Calendar } from './pages/Calendar';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Navigation } from './components/Navigation';

function AppContent() {
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
      <LoanProvider>
        <AppContent />
      </LoanProvider>
    </BrowserRouter>
  );
}

export default App;
