import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
import SessionsPage from './pages/SessionsPage';
import NewSessionPage from './pages/NewSessionPage';
import SessionDetailPage from './pages/SessionDetailPage';
import SessionAnalyticsPage from './pages/SessionAnalyticsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <SessionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/new"
              element={
                <ProtectedRoute>
                  <NewSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:id"
              element={
                <ProtectedRoute>
                  <SessionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:id/analytics"
              element={
                <ProtectedRoute>
                  <SessionAnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all: redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
