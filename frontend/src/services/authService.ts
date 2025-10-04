import { apiClient } from './apiClient';

export interface User {
  id: string;
  name: string;
  role: 'user' | 'admin';
}

export const login = async (username: string, password: string): Promise<User> => {
  const response = await apiClient.post<{ user: User, token: string }>('/auth/login', { username, password });
  localStorage.setItem('auth_token', response.token);
  localStorage.setItem('current_user', JSON.stringify(response.user));
  return response.user;
};

export const logout = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem('current_user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    return null;
  }
};

export const validateToken = async (): Promise<User | null> => {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;

  try {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    localStorage.setItem('current_user', JSON.stringify(response.user));
    return response.user;
  } catch (error) {
    console.error("Token validation failed:", error);
    logout();
    return null;
  }
};
