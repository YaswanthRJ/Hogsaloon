import { get, post } from '../api/api';
import type { User } from '../store/authStore';
import { connectSocket } from './socket.service';
import { useAuthStore } from '../store/authStore';

export function getProfile(): Promise<User> {
  return get<User>('/auth/me');
}

export function login(email: string, password: string): Promise<{ user: User }> {
  return post<{ user: User }>('/auth/login', { email, password });
}

export function register(
  email: string,
  password: string,
): Promise<{ user: User }> {
  return post<{ user: User }>('/auth/register', { email, password });
}

export function logout(): Promise<void> {
  return post<void>('/auth/logout', {});
}

export async function authComplete(): Promise<User> {
  const user = await getProfile();

  useAuthStore.getState().setUser(user);
  connectSocket();

  return user;
}