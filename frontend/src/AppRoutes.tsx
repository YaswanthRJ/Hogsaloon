import { useLocation, Navigate, Routes, Route } from "react-router-dom";
import { Layout } from "./layout/Layout";
import { LoginPage } from "./pages/auth/LoginPage";
import { ProfilePage } from "./pages/auth/ProfilePage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { MainPage } from "./pages/MainPage";
import { useAuthStore } from "./store/authStore";

export default function AppRoutes() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register';

  if (!user && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.profileCompleted && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  if (
    user &&
    user.profileCompleted &&
    (isAuthPage || location.pathname === '/profile')
  ) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<MainPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}