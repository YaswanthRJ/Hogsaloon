import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../services/auth.service';
import { ApiError } from '../../api/api';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const { setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    getProfile()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return <>{children}</>;
}