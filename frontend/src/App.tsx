import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from './layout/Layout';
import { AuthGate } from './components/AuthGate';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';
import { RegisterPage } from './pages/Registerpage';

function AppRoutes() {
  const isLoading = useAuthStore((s) => s.isLoading);

  // Hold rendering until the profile check resolves.
  // Prevents the login page flashing for authenticated users.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route — no Layout chrome */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        {/* add more protected routes here */}
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthGate>
        <AppRoutes />
      </AuthGate>
    </Router>
  );
}

export default App;