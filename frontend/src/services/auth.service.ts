import { get, post } from '../api/api';
import type { User } from '../store/authStore';

export function getProfile(): Promise<User> {
  return get<User>('/auth/profile');
}

export function login(identifier: string, password: string): Promise<{ user: User }> {
  return post<{ user: User }>('/auth/login', { identifier, password });
}

export function register(
  email: string,
  username: string,
  password: string,
): Promise<{ user: User }> {
  return post<{ user: User }>('/auth/register', { email, username, password });
}

export function logout(): Promise<void> {
  return post<void>('/auth/logout', {});
}