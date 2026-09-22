import { joinQueue } from '../services/socket.service';
import { useAuthStore } from '../store/authStore';

export function MainPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-bold">
        Welcome, {user?.username} 🐷
      </h1>
      <button onClick={joinQueue}>Join queue</button>
    </div>
  );
}    