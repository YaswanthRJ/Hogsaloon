import { get, patch, post } from '../api/api';
import type { User } from '../store/authStore';
import { connectSocket } from './socket.service';
import { useAuthStore } from '../store/authStore';
import type { CompleteProfile } from '../components/profile/profile.types';

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

export async function completeProfile(
  body: CompleteProfile,
) {
  const formData = new FormData();

  formData.append('username', body.username);

  body.interests.forEach((interest, index) => {
    formData.append(`interests[${index}]`, interest);
  });

  body.languages.forEach((language, index) => {
    formData.append(`languages[${index}]`, language);
  });

  if (body.image) {
    formData.append('image', body.image);
  }

  return patch('users/profile', formData);
}