import { useEffect } from 'react';
import { getProfile } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { connectSocket } from '../../services/socket.service';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    getProfile()
      .then((user) => {
        setUser(user);
        connectSocket();
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [setLoading, setUser]);

  return <>{children}</>;
}