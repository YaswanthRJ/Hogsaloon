import { useAuthStore } from '../store/authStore';

export function MainPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-bold">
        Welcome, {user?.userName} 🐷
      </h1>
    </div>
  );
}